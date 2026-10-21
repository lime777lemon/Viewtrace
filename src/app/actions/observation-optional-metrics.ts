"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getObservationMergedForPlan } from "@/lib/demo/user-observations";
import { observationUrlIdentity } from "@/lib/observation-compare";
import { sanitizeObservationRouteId } from "@/lib/observation-route-id";
import { getPlan } from "@/lib/plans";
import { isBrowserlessConfigured } from "@/lib/browserless-screenshot";
import { runBrowserlessPerformanceWithProxyRetry } from "@/lib/browserless-performance";
import { runBrowserlessScrollWithProxyRetry } from "@/lib/browserless-scroll-interaction";
import {
  persistRegionalInteractionCheck,
  previousInteractionPrior,
  stampDiscoveryFullAt,
} from "@/lib/observation-watch-interaction";
import { runBrowserlessSyntheticWithProxyRetry } from "@/lib/browserless-synthetic";
import { runSameOriginSubpageScores } from "@/lib/observation-subpage-run";
import type { LabCwvV1 } from "@/lib/observation-lab-cwv";
import { parseSubpageScoresFromUnknown, type SubpageScoresV1 } from "@/lib/observation-subpages";
import type { FieldCwvV1 } from "@/lib/observation-field-cwv";
import type { RegionalInteractionCheckV1 } from "@/lib/observation-regional-interaction";
import { SCROLL_CHECK_MAX_REGIONS } from "@/lib/observation-scroll-interaction";
import type { SyntheticInteractionV1 } from "@/lib/observation-synthetic-interaction";
import { fetchFieldCwvForUrl, isCruxConfigured } from "@/lib/crux";
import {
  countFieldCwvRunsThisUtcMonth,
  countLabCwvRunsThisUtcMonth,
  countSyntheticInteractionRunsThisUtcMonth,
  loadObservationFieldCwv,
  loadObservationLabCwv,
  loadObservationSyntheticInteraction,
  saveObservationFieldCwv,
  saveObservationLabCwv,
  saveObservationSubpageScores,
  saveObservationSyntheticInteraction,
} from "@/lib/observation-optional-metrics-store";

export type OptionalMetricsError =
  | "unauthorized"
  | "invalid_id"
  | "not_found"
  | "quota"
  | "browserless_not_configured"
  | "failed"
  | "no_links"
  | "crux_not_configured";

export type RunLabCwvResult =
  | {
      ok: true;
      labCwv: LabCwvV1;
      used: number;
      limit: number;
      fieldCwv?: FieldCwvV1;
      fieldUsed?: number;
      fieldLimit?: number;
    }
  | { ok: false; error: OptionalMetricsError; used?: number; limit?: number };

export type RunSubpageScoresResult =
  | { ok: true; subpages: SubpageScoresV1 }
  | { ok: false; error: OptionalMetricsError };

export type RunFieldCwvResult =
  | { ok: true; fieldCwv: FieldCwvV1; used: number; limit: number }
  | { ok: false; error: OptionalMetricsError; used?: number; limit?: number };

export type RunSyntheticInteractionResult =
  | { ok: true; synthetic: SyntheticInteractionV1; used: number; limit: number }
  | { ok: false; error: OptionalMetricsError; used?: number; limit?: number };

export type RunScrollInteractionResult =
  | { ok: true; check: RegionalInteractionCheckV1; used: number; limit: number }
  | { ok: false; error: OptionalMetricsError; used?: number; limit?: number };

export type PrepareScrollChecksResult =
  | { ok: true; observationIds: string[]; used: number; limit: number }
  | { ok: false; error: OptionalMetricsError; used?: number; limit?: number };

function revalidateObservation(observationId: string) {
  revalidatePath(`/dashboard/observations/${observationId}`);
  revalidatePath(`/dashboard/observations/${observationId}/report`);
  revalidatePath(`/dashboard/observations/${observationId}/verification`);
}

export async function runObservationLabCwvAction(
  observationIdRaw: string,
): Promise<RunLabCwvResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const observationId = sanitizeObservationRouteId(observationIdRaw);
  if (!observationId) return { ok: false, error: "invalid_id" };
  if (!isBrowserlessConfigured()) return { ok: false, error: "browserless_not_configured" };

  const obs = await getObservationMergedForPlan(observationId, session.plan);
  if (!obs?.url) return { ok: false, error: "not_found" };

  const plan = getPlan(session.plan);
  const supabase = await createSupabaseServerClient();
  const used = await countLabCwvRunsThisUtcMonth(supabase, session.userId);
  if (used == null) return { ok: false, error: "failed" };
  if (used >= plan.labCwvMonthly) {
    return { ok: false, error: "quota", used, limit: plan.labCwvMonthly };
  }

  const result = await runBrowserlessPerformanceWithProxyRetry({
    url: obs.url,
    region: obs.regionValue,
  });
  if (!result.ok) {
    console.warn("[optional-metrics] lab cwv failed", result.error, result.detail?.slice(0, 200));
    return { ok: false, error: "failed", used, limit: plan.labCwvMonthly };
  }

  const previous = await loadObservationLabCwv(supabase, session.userId, observationId);
  const saved = await saveObservationLabCwv(supabase, {
    userId: session.userId,
    observationId,
    labCwv: result.labCwv,
    previousRunTimes: previous?.run_times,
  });
  if (!saved) return { ok: false, error: "failed", used, limit: plan.labCwvMonthly };

  const field = await maybeFetchAndSaveFieldCwv({
    supabase,
    userId: session.userId,
    observationId,
    pageUrl: obs.url,
    limit: plan.fieldCwvMonthly,
  });

  revalidateObservation(observationId);
  return {
    ok: true,
    labCwv: result.labCwv,
    used: used + 1,
    limit: plan.labCwvMonthly,
    ...(field
      ? { fieldCwv: field.fieldCwv, fieldUsed: field.used, fieldLimit: plan.fieldCwvMonthly }
      : {}),
  };
}

export async function runObservationSubpageScoresAction(
  observationIdRaw: string,
): Promise<RunSubpageScoresResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const observationId = sanitizeObservationRouteId(observationIdRaw);
  if (!observationId) return { ok: false, error: "invalid_id" };

  const obs = await getObservationMergedForPlan(observationId, session.plan);
  if (!obs?.url) return { ok: false, error: "not_found" };

  const plan = getPlan(session.plan);
  const result = await runSameOriginSubpageScores({
    pageUrl: obs.url,
    regionValue: obs.regionValue,
    maxPages: plan.subpageMaxLinks,
  });
  if ("error" in result) {
    console.warn("[optional-metrics] subpages failed", result.error);
    return { ok: false, error: "failed" };
  }
  if (result.pages.length === 0) return { ok: false, error: "no_links" };

  const supabase = await createSupabaseServerClient();
  const saved = await saveObservationSubpageScores(supabase, {
    userId: session.userId,
    observationId,
    subpages: result,
  });
  if (!saved) return { ok: false, error: "failed" };

  revalidateObservation(observationId);
  return { ok: true, subpages: parseSubpageScoresFromUnknown(result) ?? result };
}

export async function runObservationFieldCwvAction(
  observationIdRaw: string,
): Promise<RunFieldCwvResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const observationId = sanitizeObservationRouteId(observationIdRaw);
  if (!observationId) return { ok: false, error: "invalid_id" };
  if (!isCruxConfigured()) return { ok: false, error: "crux_not_configured" };

  const obs = await getObservationMergedForPlan(observationId, session.plan);
  if (!obs?.url) return { ok: false, error: "not_found" };

  const plan = getPlan(session.plan);
  const supabase = await createSupabaseServerClient();
  const field = await maybeFetchAndSaveFieldCwv({
    supabase,
    userId: session.userId,
    observationId,
    pageUrl: obs.url,
    limit: plan.fieldCwvMonthly,
    force: true,
  });
  if (!field) {
    const used = await countFieldCwvRunsThisUtcMonth(supabase, session.userId);
    if (used != null && used >= plan.fieldCwvMonthly) {
      return { ok: false, error: "quota", used, limit: plan.fieldCwvMonthly };
    }
    return { ok: false, error: "failed", used: used ?? undefined, limit: plan.fieldCwvMonthly };
  }

  revalidateObservation(observationId);
  return {
    ok: true,
    fieldCwv: field.fieldCwv,
    used: field.used,
    limit: plan.fieldCwvMonthly,
  };
}

export async function runObservationSyntheticInteractionAction(
  observationIdRaw: string,
): Promise<RunSyntheticInteractionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const observationId = sanitizeObservationRouteId(observationIdRaw);
  if (!observationId) return { ok: false, error: "invalid_id" };
  if (!isBrowserlessConfigured()) return { ok: false, error: "browserless_not_configured" };

  const obs = await getObservationMergedForPlan(observationId, session.plan);
  if (!obs?.url) return { ok: false, error: "not_found" };

  const plan = getPlan(session.plan);
  const supabase = await createSupabaseServerClient();
  const used = await countSyntheticInteractionRunsThisUtcMonth(supabase, session.userId);
  if (used == null) return { ok: false, error: "failed" };
  if (used >= plan.syntheticInteractionMonthly) {
    return { ok: false, error: "quota", used, limit: plan.syntheticInteractionMonthly };
  }

  const result = await runBrowserlessSyntheticWithProxyRetry({
    url: obs.url,
    region: obs.regionValue,
  });
  if (!result.ok) {
    console.warn("[optional-metrics] synthetic failed", result.error, result.detail?.slice(0, 200));
    return { ok: false, error: "failed", used, limit: plan.syntheticInteractionMonthly };
  }

  const previous = await loadObservationSyntheticInteraction(supabase, session.userId, observationId);
  const saved = await saveObservationSyntheticInteraction(supabase, {
    userId: session.userId,
    observationId,
    synthetic: result.synthetic,
    previousRunTimes: previous?.run_times,
  });
  if (!saved) return { ok: false, error: "failed", used, limit: plan.syntheticInteractionMonthly };

  revalidateObservation(observationId);
  return {
    ok: true,
    synthetic: result.synthetic,
    used: used + 1,
    limit: plan.syntheticInteractionMonthly,
  };
}

export async function prepareObservationScrollChecksAction(
  observationIdsRaw: string[],
): Promise<PrepareScrollChecksResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  if (!isBrowserlessConfigured()) return { ok: false, error: "browserless_not_configured" };

  const observationIds = [
    ...new Set(observationIdsRaw.map((id) => sanitizeObservationRouteId(id)).filter(Boolean)),
  ].slice(0, SCROLL_CHECK_MAX_REGIONS);
  if (observationIds.length === 0) return { ok: false, error: "invalid_id" };

  const loaded = [];
  for (const observationId of observationIds) {
    const obs = await getObservationMergedForPlan(observationId, session.plan);
    if (!obs?.url) return { ok: false, error: "not_found" };
    loaded.push(obs);
  }
  const identity = observationUrlIdentity(loaded[0]?.url ?? "");
  if (!identity) return { ok: false, error: "not_found" };
  for (const obs of loaded) {
    if (observationUrlIdentity(obs.url ?? "") !== identity) return { ok: false, error: "not_found" };
  }

  const plan = getPlan(session.plan);
  const supabase = await createSupabaseServerClient();
  const used = await countSyntheticInteractionRunsThisUtcMonth(supabase, session.userId);
  if (used == null) return { ok: false, error: "failed" };
  if (used + observationIds.length > plan.syntheticInteractionMonthly) {
    return { ok: false, error: "quota", used, limit: plan.syntheticInteractionMonthly };
  }
  return {
    ok: true,
    observationIds,
    used,
    limit: plan.syntheticInteractionMonthly,
  };
}

export async function runObservationScrollInteractionAction(
  observationIdRaw: string,
): Promise<RunScrollInteractionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const observationId = sanitizeObservationRouteId(observationIdRaw);
  if (!observationId) return { ok: false, error: "invalid_id" };
  if (!isBrowserlessConfigured()) return { ok: false, error: "browserless_not_configured" };

  const obs = await getObservationMergedForPlan(observationId, session.plan);
  if (!obs?.url) return { ok: false, error: "not_found" };

  const plan = getPlan(session.plan);
  const supabase = await createSupabaseServerClient();
  const used = await countSyntheticInteractionRunsThisUtcMonth(supabase, session.userId);
  if (used == null) return { ok: false, error: "failed" };
  if (used >= plan.syntheticInteractionMonthly) {
    return { ok: false, error: "quota", used, limit: plan.syntheticInteractionMonthly };
  }

  const prior = await previousInteractionPrior(supabase, {
    userId: session.userId,
    url: obs.url,
    region: obs.regionValue ?? "",
    capturedAt: obs.capturedAt,
    excludeId: observationId,
  });
  const result = await runBrowserlessScrollWithProxyRetry({
    url: obs.url,
    region: obs.regionValue,
    prior,
    scan: "full",
  });
  if (!result.ok) {
    console.warn("[optional-metrics] scroll failed", result.error, result.detail?.slice(0, 200));
    return { ok: false, error: "failed", used, limit: plan.syntheticInteractionMonthly };
  }

  const check = result.check;
  stampDiscoveryFullAt(check, null);
  const persisted = await persistRegionalInteractionCheck(supabase, {
    userId: session.userId,
    observationId,
    url: obs.url,
    region: obs.regionValue ?? "",
    capturedAt: obs.capturedAt,
    check,
    billing: "synthetic",
  });
  if (!persisted.saved) return { ok: false, error: "failed", used, limit: plan.syntheticInteractionMonthly };

  revalidateObservation(observationId);
  return {
    ok: true,
    check,
    used: used + 1,
    limit: plan.syntheticInteractionMonthly,
  };
}

async function maybeFetchAndSaveFieldCwv(input: {
  supabase: SupabaseClient;
  userId: string;
  observationId: string;
  pageUrl: string;
  limit: number;
  force?: boolean;
}): Promise<{ fieldCwv: FieldCwvV1; used: number } | null> {
  if (!isCruxConfigured()) return null;
  const used = await countFieldCwvRunsThisUtcMonth(input.supabase, input.userId);
  if (used == null) return null;
  const previous = await loadObservationFieldCwv(
    input.supabase,
    input.userId,
    input.observationId,
  );
  if (previous && !input.force) {
    return { fieldCwv: previous.result, used };
  }
  if (used >= input.limit) return null;
  try {
    const fieldCwv = await fetchFieldCwvForUrl(input.pageUrl);
    if (fieldCwv.error === "failed") return null;
    const saved = await saveObservationFieldCwv(input.supabase, {
      userId: input.userId,
      observationId: input.observationId,
      fieldCwv,
      previousRunTimes: previous?.run_times,
    });
    if (!saved) return null;
    return { fieldCwv, used: used + 1 };
  } catch (error) {
    console.warn("[optional-metrics] crux lookup failed", error);
    return null;
  }
}
