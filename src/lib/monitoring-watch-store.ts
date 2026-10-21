import type { SupabaseClient } from "@supabase/supabase-js";
import { executeJourney } from "@/lib/journey-store";
import {
  credentialsSatisfyJourney,
  evaluateMonitoringPreflight,
  journeyMonitoringChecks,
  journeyRunProvesMonitoring,
  monitoringExecutionChecks,
  normalizeMonitoringSelection,
  scheduledRunDecision,
  type MonitoringPreflight,
  type MonitoringSchedule,
} from "@/lib/monitoring-watch";
import { computeNextRunAfter } from "@/lib/observation-watch-schedule";
import {
  parseJourneySteps,
  resolveJourneySteps,
  type JourneyDeviceClass,
} from "@/lib/journey-definition";
import type { JourneyStepEvidence } from "@/lib/journey-runner";
import { recordMonitoringPageObservation } from "@/lib/monitoring-page-observation";
import { countMeteredChecksThisUtcMonth, createMonitoringRun, linkMonitoringJourneyRuns, linkMonitoringObservations, saveMonitoringRunJudgment } from "@/lib/monitoring-run-store";
import { remainingObservations } from "@/lib/observation-quota";
import { normalizeUserUrlInput } from "@/lib/url-preview";

type PassedRun = { status: string; steps: JourneyStepEvidence[] };

async function passedRuns(supabase: SupabaseClient, userId: string, journeyId: string): Promise<PassedRun[]> {
  const { data, error } = await supabase
    .from("journey_runs")
    .select("status, steps")
    .eq("user_id", userId)
    .eq("journey_id", journeyId)
    .eq("status", "passed")
    .order("created_at", { ascending: false })
    .limit(8);
  if (error || !data) return [];
  return (data as Array<{ status?: string; steps?: unknown }>).map((row) => ({
    status: typeof row.status === "string" ? row.status : "",
    steps: Array.isArray(row.steps) ? row.steps as JourneyStepEvidence[] : [],
  }));
}

async function rememberCredentials(
  supabase: SupabaseClient,
  userId: string,
  journeyId: string,
  secret: Record<string, unknown>,
  username?: string,
  password?: string,
): Promise<{ username: string; password: string }> {
  let nextUser = typeof secret.username === "string" ? secret.username : "";
  let nextPassword = typeof secret.password === "string" ? secret.password : "";
  if (username) nextUser = username.slice(0, 120);
  if (password) nextPassword = password.slice(0, 200);
  if (username || password) {
    await supabase.from("journey_definitions").update({
      secret_credentials: { username: nextUser, password: nextPassword },
      updated_at: new Date().toISOString(),
    }).eq("id", journeyId).eq("user_id", userId);
  }
  return { username: nextUser, password: nextPassword };
}

export async function enableJourneyMonitoring(
  supabase: SupabaseClient,
  userId: string,
  input: {
    journeyId: string;
    frequency: MonitoringSchedule;
    regions: string[];
    deviceClasses: JourneyDeviceClass[];
    monthlyLimit: number;
    username?: string;
    password?: string;
  },
): Promise<{ ok: true; nextRunAt: string; testRunId: string | null } | { ok: false; error: string; preflight: MonitoringPreflight }> {
  const { data, error } = await supabase
    .from("journey_definitions")
    .select("id, start_url, steps, secret_credentials")
    .eq("id", input.journeyId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) {
    const empty = evaluateMonitoringPreflight({
      startUrl: "",
      steps: [],
      regions: [],
      environments: [],
      credentialsAvailable: false,
      availableChecks: null,
      runs: [],
    });
    return { ok: false, error: "not_found", preflight: empty };
  }
  const row = data as Record<string, unknown>;
  const secret = row.secret_credentials && typeof row.secret_credentials === "object" ? row.secret_credentials as Record<string, unknown> : {};
  const stored = await rememberCredentials(supabase, userId, input.journeyId, secret, input.username, input.password);
  const startUrl = normalizeUserUrlInput(typeof row.start_url === "string" ? row.start_url : "");
  const steps = startUrl ? resolveJourneySteps(startUrl, parseJourneySteps(row.steps)) : [];
  const selection = normalizeMonitoringSelection({ regions: input.regions, environments: input.deviceClasses });
  const used = await countMeteredChecksThisUtcMonth(supabase, userId);
  const available = used == null ? null : remainingObservations(used, input.monthlyLimit);
  const runs = await passedRuns(supabase, userId, input.journeyId);
  let preflight = evaluateMonitoringPreflight({
    startUrl: startUrl ?? "",
    steps,
    regions: selection.regions,
    environments: selection.environments,
    credentialsAvailable: credentialsSatisfyJourney(steps, stored),
    availableChecks: available,
    runs,
  });
  if (!preflight.urlValid || !preflight.definitionValid || !preflight.credentialsAvailable || !preflight.selectionValid || !preflight.capacityAvailable || !startUrl) {
    return { ok: false, error: "preflight", preflight };
  }

  let testRunId: string | null = null;
  if (!preflight.testRunPassed) {
    const proof = await executeJourney(supabase, userId, input.journeyId, input.monthlyLimit, {
      pairs: [{ region: selection.regions[0], device: selection.environments[0] }],
      advanceSchedule: false,
    });
    if (!proof.ok) return { ok: false, error: proof.error, preflight };
    testRunId = proof.runIds[0] ?? null;
    if (!testRunId) return { ok: false, error: "test_run", preflight };
    const saved = await supabase
      .from("journey_runs")
      .select("status, steps")
      .eq("id", testRunId)
      .eq("user_id", userId)
      .maybeSingle();
    const status = saved.data && typeof (saved.data as { status?: unknown }).status === "string"
      ? String((saved.data as { status: string }).status)
      : "";
    const proofSteps = saved.data && Array.isArray((saved.data as { steps?: unknown }).steps)
      ? (saved.data as { steps: JourneyStepEvidence[] }).steps
      : [];
    if (!journeyRunProvesMonitoring(status, proofSteps)) {
      preflight = { ...preflight, testRunPassed: false, ready: false };
      return { ok: false, error: "test_run", preflight };
    }
    const usedAfter = await countMeteredChecksThisUtcMonth(supabase, userId);
    const availableAfter = usedAfter == null ? null : remainingObservations(usedAfter, input.monthlyLimit);
    preflight = evaluateMonitoringPreflight({
      startUrl,
      steps,
      regions: selection.regions,
      environments: selection.environments,
      credentialsAvailable: true,
      availableChecks: availableAfter,
      runs: [{ status, steps: proofSteps }],
    });
    if (!preflight.capacityAvailable || !preflight.ready) return { ok: false, error: "preflight", preflight };
  }

  const frequency: MonitoringSchedule = input.frequency === "weekly" ? "weekly" : "daily";
  const nextRunAt = computeNextRunAfter(new Date(), frequency, 1, 1).toISOString();
  const now = new Date().toISOString();
  const existing = await supabase
    .from("monitoring_watch_journeys")
    .select("monitoring_watch_id")
    .eq("journey_id", input.journeyId)
    .maybeSingle();
  let watchId = existing.data && typeof (existing.data as { monitoring_watch_id?: unknown }).monitoring_watch_id === "string"
    ? String((existing.data as { monitoring_watch_id: string }).monitoring_watch_id)
    : null;
  const watchPayload = {
    user_id: userId,
    target_url: startUrl,
    include_page: false,
    regions: selection.regions,
    environments: selection.environments,
    schedule: frequency,
    enabled: true,
    next_run_at: nextRunAt,
    updated_at: now,
  };
  if (watchId) {
    const { error: watchError } = await supabase.from("monitoring_watches").update(watchPayload).eq("id", watchId).eq("user_id", userId);
    if (watchError) return { ok: false, error: "save_failed", preflight };
  } else {
    const { data: created, error: watchError } = await supabase
      .from("monitoring_watches")
      .insert(watchPayload)
      .select("id")
      .single();
    if (watchError || !created) return { ok: false, error: "save_failed", preflight };
    watchId = String((created as { id: string }).id);
    const { error: linkError } = await supabase.from("monitoring_watch_journeys").insert({
      monitoring_watch_id: watchId,
      journey_id: input.journeyId,
    });
    if (linkError) {
      await supabase.from("monitoring_watches").update({ enabled: false, next_run_at: null }).eq("id", watchId).eq("user_id", userId);
      return { ok: false, error: "save_failed", preflight };
    }
  }
  const { error: journeyError } = await supabase.from("journey_definitions").update({
    start_url: startUrl,
    steps,
    regions: selection.regions,
    device_classes: selection.environments,
    watch_enabled: true,
    watch_frequency: frequency,
    next_run_at: nextRunAt,
    updated_at: now,
  }).eq("id", input.journeyId).eq("user_id", userId);
  if (journeyError) {
    if (watchId) {
      await supabase.from("monitoring_watches").update({ enabled: false, next_run_at: null }).eq("id", watchId).eq("user_id", userId);
    }
    return { ok: false, error: "save_failed", preflight };
  }
  return { ok: true, nextRunAt, testRunId };
}

export async function disableJourneyMonitoring(
  supabase: SupabaseClient,
  userId: string,
  journeyId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = new Date().toISOString();
  const { error } = await supabase.from("journey_definitions").update({
    watch_enabled: false,
    next_run_at: null,
    updated_at: now,
  }).eq("id", journeyId).eq("user_id", userId);
  if (error) return { ok: false, error: "save_failed" };
  const link = await supabase
    .from("monitoring_watch_journeys")
    .select("monitoring_watch_id")
    .eq("journey_id", journeyId)
    .maybeSingle();
  const watchId = link.data && typeof (link.data as { monitoring_watch_id?: unknown }).monitoring_watch_id === "string"
    ? String((link.data as { monitoring_watch_id: string }).monitoring_watch_id)
    : null;
  if (watchId) {
    await supabase.from("monitoring_watches").update({
      enabled: false,
      next_run_at: null,
      updated_at: now,
    }).eq("id", watchId).eq("user_id", userId);
  }
  return { ok: true };
}

type DueWatch = {
  id: string;
  user_id: string;
  target_url: string;
  include_page: boolean;
  regions: string[];
  environments: JourneyDeviceClass[];
  schedule: MonitoringSchedule;
};

export async function runDueMonitoringWatches(
  supabase: SupabaseClient,
  limitForUser: (userId: string) => Promise<number>,
): Promise<{ ran: number; skipped: number; journeyRuns: number }> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("monitoring_watches")
    .select("id, user_id, target_url, include_page, regions, environments, schedule")
    .eq("enabled", true)
    .lte("next_run_at", now)
    .limit(8);
  if (error || !data) return { ran: 0, skipped: 0, journeyRuns: 0 };

  let ran = 0;
  let skipped = 0;
  let journeyRuns = 0;
  for (const raw of data as Array<Record<string, unknown>>) {
    const watch: DueWatch = {
      id: String(raw.id),
      user_id: String(raw.user_id),
      target_url: typeof raw.target_url === "string" ? raw.target_url : "",
      include_page: raw.include_page === true,
      regions: Array.isArray(raw.regions) ? raw.regions.filter((value): value is string => typeof value === "string") : [],
      environments: Array.isArray(raw.environments)
        ? raw.environments.filter((value): value is JourneyDeviceClass => value === "desktop" || value === "mobile")
        : [],
      schedule: raw.schedule === "weekly" ? "weekly" : "daily",
    };
    const links = await supabase
      .from("monitoring_watch_journeys")
      .select("journey_id")
      .eq("monitoring_watch_id", watch.id);
    const journeyIds = !links.error && Array.isArray(links.data)
      ? (links.data as Array<{ journey_id?: string }>).map((link) => link.journey_id).filter((id): id is string => typeof id === "string")
      : [];
    const pairs = watch.regions.flatMap((region) => watch.environments.map((device) => ({ region, device })));
    const required = monitoringExecutionChecks({
      includePage: watch.include_page,
      regions: watch.regions,
      environments: watch.environments,
      journeys: journeyIds.length,
    });
    if (required < 1 || (journeyIds.length > 0 && pairs.length < 1)) {
      skipped += 1;
      continue;
    }
    const monthlyLimit = await limitForUser(watch.user_id);
    const used = await countMeteredChecksThisUtcMonth(supabase, watch.user_id);
    const available = used == null ? null : remainingObservations(used, monthlyLimit);
    const decision = scheduledRunDecision(required, available);
    if (decision === "unknown") {
      skipped += 1;
      continue;
    }
    if (decision === "skip") {
      await createMonitoringRun(supabase, {
        userId: watch.user_id,
        targetUrl: watch.target_url,
        execution: "not_executed",
        requiredChecks: required,
        availableChecks: available,
        journeyId: journeyIds[0] ?? null,
        plan: { regions: watch.regions, environments: watch.environments, workflowSteps: journeyIds.length },
      });
      await advanceMonitoringWatch(supabase, watch, journeyIds, false);
      skipped += 1;
      continue;
    }

    const observationRows: Array<{ observationId: string; region: string }> = [];
    let pageFailed = false;
    if (watch.include_page) {
      for (const region of watch.regions) {
        const recorded = await recordMonitoringPageObservation(supabase, {
          userId: watch.user_id,
          url: watch.target_url,
          region,
        });
        if (!recorded.ok) {
          pageFailed = true;
          break;
        }
        observationRows.push({ observationId: recorded.id, region });
      }
    }
    if (pageFailed && observationRows.length === 0) {
      skipped += 1;
      await advanceMonitoringWatch(supabase, watch, journeyIds, false);
      continue;
    }

    const runIds: string[] = [];
    let failed = pageFailed;
    if (!pageFailed) {
      for (const journeyId of journeyIds) {
        const result = await executeJourney(supabase, watch.user_id, journeyId, monthlyLimit, {
          pairs,
          advanceSchedule: false,
        });
        runIds.push(...result.runIds);
        if (!result.ok) {
          failed = true;
          break;
        }
      }
    }
    if (!observationRows.length && !runIds.length) {
      skipped += 1;
      continue;
    }
    const created = await createMonitoringRun(supabase, {
      userId: watch.user_id,
      targetUrl: watch.target_url,
      execution: "executed",
      requiredChecks: required,
      availableChecks: available,
      journeyId: journeyIds[0] ?? null,
      plan: {
        regions: watch.regions,
        environments: watch.environments,
        workflowSteps: journeyIds.length,
      },
    });
    if (created.ok) {
      await linkMonitoringObservations(supabase, created.id, observationRows);
      await linkMonitoringJourneyRuns(supabase, created.id, runIds);
      await saveMonitoringRunJudgment(supabase, watch.user_id, created.id);
    }
    journeyRuns += runIds.length;
    const pageChecks = watch.include_page ? watch.regions.length : 0;
    if (!failed && observationRows.length === pageChecks && runIds.length === required - pageChecks) ran += 1;
    else skipped += 1;
    await advanceMonitoringWatch(supabase, watch, journeyIds, !failed && observationRows.length + runIds.length === required);
  }
  return { ran, skipped, journeyRuns };
}

async function advanceMonitoringWatch(
  supabase: SupabaseClient,
  watch: DueWatch,
  journeyIds: string[],
  completed: boolean,
): Promise<void> {
  const stamp = new Date();
  const next = computeNextRunAfter(stamp, watch.schedule, 1, 1).toISOString();
  const now = stamp.toISOString();
  const watchUpdate: Record<string, string> = { next_run_at: next, updated_at: now };
  const journeyUpdate: Record<string, string> = { next_run_at: next, updated_at: now };
  if (completed) {
    watchUpdate.last_run_at = now;
    journeyUpdate.last_run_at = now;
  }
  await supabase.from("monitoring_watches").update(watchUpdate).eq("id", watch.id);
  if (journeyIds.length) {
    await supabase.from("journey_definitions").update(journeyUpdate).in("id", journeyIds).eq("user_id", watch.user_id);
  }
}

export function monitoringChecksLabel(regions: string[], environments: JourneyDeviceClass[]): number {
  return journeyMonitoringChecks(regions, environments);
}
