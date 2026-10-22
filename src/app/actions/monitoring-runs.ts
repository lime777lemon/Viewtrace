"use server";

import { revalidatePath } from "next/cache";
import { recordObservationForRegionAction } from "@/app/actions/observations";
import { getSession } from "@/lib/auth/session";
import { isBrowserlessConfigured } from "@/lib/browserless-screenshot";
import { runBrowserlessScrollWithProxyRetry } from "@/lib/browserless-scroll-interaction";
import { executeJourney, saveJourney } from "@/lib/journey-store";
import {
  parseJourneySteps,
  resolveJourneySteps,
  validateJourneySteps,
  type JourneyDeviceClass,
  type JourneyStepDefinition,
} from "@/lib/journey-definition";
import { monitoringCheckPlan } from "@/lib/monitoring-run";
import {
  countMeteredChecksThisUtcMonth,
  createMonitoringRun,
  linkMonitoringJourneyRuns,
  linkMonitoringObservations,
} from "@/lib/monitoring-run-store";
import { persistRegionalInteractionCheck } from "@/lib/observation-watch-interaction";
import { remainingObservations } from "@/lib/observation-quota";
import { getPlan } from "@/lib/plans";
import { getRegionLabelForLocale, getRegionOptions, isValidObservationRegionForPlan } from "@/lib/regions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeUserUrlInput } from "@/lib/url-preview";

export type MonitoringCheckInput = {
  url: string;
  regions: string[];
  environments?: JourneyDeviceClass[];
  steps: JourneyStepDefinition[];
  username?: string;
  password?: string;
};

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").slice(0, 60) || "Check";
  } catch {
    return "Check";
  }
}

export async function runMonitoringCheckAction(
  input: MonitoringCheckInput,
): Promise<{ ok: true; id: string; observationId: string | null } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  const startUrl = normalizeUserUrlInput(input.url);
  if (!startUrl) return { ok: false, error: "invalid_url" };

  const regions = input.regions.filter((region) => isValidObservationRegionForPlan(session.plan, region));
  const extraSteps = parseJourneySteps(input.steps).filter((step) => step.kind !== "open_url");
  const environments = (input.environments ?? ["desktop"]).filter(
    (device): device is JourneyDeviceClass => device === "desktop" || device === "mobile",
  );
  const plan = monitoringCheckPlan({
    regions,
    environments,
    workflowSteps: extraSteps.length,
  });
  if (!plan.regions.length) return { ok: false, error: "region_required" };
  if (!plan.environments.length) return { ok: false, error: "environment_required" };

  const openStep: JourneyStepDefinition = {
    id: "open",
    kind: "open_url",
    selector: "",
    value: "",
    url: startUrl,
    wait_ms: 1000,
    permitted_side_effect: null,
    expect_selector: "",
    expect_text: "",
    expect_visible: false,
    expect_url: "",
  };
  const steps = extraSteps.length ? resolveJourneySteps(startUrl, [openStep, ...extraSteps]) : [];
  if (steps.length) {
    const invalid = validateJourneySteps(startUrl, steps);
    if (invalid) return { ok: false, error: invalid };
  }

  const supabase = await createSupabaseServerClient();
  const used = await countMeteredChecksThisUtcMonth(supabase, session.userId);
  if (used == null) return { ok: false, error: "quota" };
  const available = remainingObservations(used, getPlan(session.plan).monthlyObservations);
  if (available < plan.total) {
    const skipped = await createMonitoringRun(supabase, {
      userId: session.userId,
      targetUrl: startUrl,
      execution: "not_executed",
      requiredChecks: plan.total,
      availableChecks: available,
      plan: { regions: plan.regions, environments: plan.environments, workflowSteps: extraSteps.length, journeyIncluded: extraSteps.length > 0 },
    });
    if (!skipped.ok) return skipped;
    revalidatePath("/dashboard/region-search");
    return { ok: true, id: skipped.id, observationId: null };
  }

  let journeyId: string | null = null;
  if (steps.length) {
    const saved = await saveJourney(supabase, session.userId, {
      name: hostnameOf(startUrl),
      startUrl,
      steps,
      regions: plan.regions,
      deviceClasses: plan.environments,
      watchEnabled: false,
      watchFrequency: "daily",
      watchAllowed: false,
      username: input.username,
      password: input.password,
    });
    if (!saved.ok) return saved;
    journeyId = saved.id;
  }

  const created = await createMonitoringRun(supabase, {
    userId: session.userId,
    targetUrl: startUrl,
    execution: "executed",
    requiredChecks: plan.total,
    availableChecks: available,
    journeyId,
    plan: {
      regions: plan.regions,
      environments: plan.environments,
      workflowSteps: extraSteps.length,
      journeyIncluded: extraSteps.length > 0,
    },
  });
  if (!created.ok) return created;

  const labels = new Map(getRegionOptions(session.plan).map((option) => [option.value, getRegionLabelForLocale(option, "en")]));
  const linkedObservations: Array<{ observationId: string; region: string }> = [];
  for (const region of plan.regions) {
    for (const device of plan.environments) {
      const form = new FormData();
      form.set("url", startUrl);
      form.set("region", region);
      form.set("regionLabel", labels.get(region) ?? region);
      form.set("deviceClass", device);
      const recorded = await recordObservationForRegionAction(form);
      if (!recorded.ok) {
        if (recorded.code === "unauthenticated" || recorded.code === "trial_expired" || recorded.code === "trial_limit" || recorded.code === "monthly_limit") {
          return { ok: false, error: recorded.code };
        }
        continue;
      }
      linkedObservations.push({ observationId: recorded.id, region });
      if (isBrowserlessConfigured()) {
        const interaction = await runBrowserlessScrollWithProxyRetry({
          url: startUrl,
          region,
          scan: "full",
          environment: { device_class: device },
        });
        if (interaction.ok) {
          await persistRegionalInteractionCheck(supabase, {
            userId: session.userId,
            observationId: recorded.id,
            url: startUrl,
            region,
            capturedAt: new Date().toISOString(),
            check: interaction.check,
            billing: "watch_included",
          });
        }
      }
    }
  }
  await linkMonitoringObservations(supabase, created.id, linkedObservations);

  if (journeyId) {
    const ran = await executeJourney(supabase, session.userId, journeyId, getPlan(session.plan).monthlyObservations, {
      pairs: plan.regions.flatMap((region) => plan.environments.map((device) => ({ region, device }))),
      advanceSchedule: false,
      skipQuota: true,
    });
    await linkMonitoringJourneyRuns(supabase, created.id, ran.runIds);
  }

  const primary = linkedObservations.find((row) => row.region === plan.regions[0]) ?? linkedObservations[0] ?? null;
  revalidatePath("/dashboard/region-search");
  revalidatePath(`/dashboard/monitoring-runs/${created.id}`);
  if (primary) revalidatePath(`/dashboard/observations/${primary.observationId}`);
  return { ok: true, id: created.id, observationId: primary?.observationId ?? null };
}
