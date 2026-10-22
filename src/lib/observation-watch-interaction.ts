import type { SupabaseClient } from "@supabase/supabase-js";
import { applyRenderedPageMeasurement } from "@/lib/browser-rendered-page";
import { parseCaptureConditionsFromDb } from "@/lib/capture-conditions";
import { buildBehaviorDiff, type BehaviorDiffV1 } from "@/lib/observation-behavior-diff";
import {
  observationUrlIdentity,
  observationUrlLookupVariants,
} from "@/lib/observation-compare";
import type { RegionalInteractionCheckV1 } from "@/lib/observation-regional-interaction";
import type { InteractionPriorRow } from "@/lib/observation-interaction-plan";
import {
  loadObservationScrollInteraction,
  loadObservationScrollInteractionsByIds,
  saveObservationScrollInteraction,
  type InteractionCheckBilling,
} from "@/lib/observation-optional-metrics-store";

export const WATCH_INTERACTION_MIN_BUDGET_MS = 120_000;
export const FULL_DISCOVERY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export function interactionScanMode(input: {
  hasPrior: boolean;
  lastFullDiscoveryAt: string | null;
  nowMs: number;
  htmlChanged: boolean;
}): "full" | "light" {
  if (!input.hasPrior || input.htmlChanged) return "full";
  if (!input.lastFullDiscoveryAt) return "full";
  const then = Date.parse(input.lastFullDiscoveryAt);
  if (!Number.isFinite(then)) return "full";
  if (input.nowMs - then >= FULL_DISCOVERY_INTERVAL_MS) return "full";
  return "light";
}

export function stampDiscoveryFullAt(
  check: RegionalInteractionCheckV1,
  lastFullDiscoveryAt: string | null,
): void {
  if (!check.discovery) return;
  check.discovery.full_at =
    check.discovery.scan === "full" ? check.measured_at : lastFullDiscoveryAt;
}

async function findPreviousInteractionCheck(
  supabase: SupabaseClient,
  input: {
    userId: string;
    url: string;
    region: string;
    capturedAt: string;
    excludeId: string;
  },
): Promise<{ observationId: string; check: RegionalInteractionCheckV1 } | null> {
  const variants = observationUrlLookupVariants(input.url);
  const identity = observationUrlIdentity(input.url);
  if (variants.length === 0 || !input.region.trim()) return null;
  const { data, error } = await supabase
    .from("observations")
    .select("id,captured_at,url")
    .eq("user_id", input.userId)
    .in("url", variants)
    .eq("region", input.region)
    .neq("id", input.excludeId)
    .lt("captured_at", input.capturedAt)
    .order("captured_at", { ascending: false })
    .limit(12);
  if (error || !data?.length) return null;
  const rows = data.filter((item) => {
    const url = typeof item.url === "string" ? item.url : "";
    return identity ? observationUrlIdentity(url) === identity : url.trim() === input.url.trim();
  });
  const ids = rows.map((item) => (typeof item.id === "string" ? item.id : "")).filter(Boolean);
  const checks = await loadObservationScrollInteractionsByIds(supabase, input.userId, ids);
  for (const id of ids) {
    const check = checks.get(id);
    if (check) return { observationId: id, check };
  }
  return null;
}

export async function previousInteractionPrior(
  supabase: SupabaseClient,
  input: {
    userId: string;
    url: string;
    region: string;
    capturedAt: string;
    excludeId: string;
  },
): Promise<InteractionPriorRow[]> {
  const previous = await findPreviousInteractionCheck(supabase, input);
  if (!previous) return [];
  return previous.check.types.map((row) => ({
    type: row.type,
    status: row.status,
    detected: row.detected,
  }));
}

export async function interactionWatchPlan(
  supabase: SupabaseClient,
  input: {
    userId: string;
    url: string;
    region: string;
    capturedAt: string;
    excludeId: string;
    htmlChanged: boolean;
    nowMs?: number;
  },
): Promise<{ prior: InteractionPriorRow[]; scan: "full" | "light"; lastFullDiscoveryAt: string | null }> {
  const previous = await findPreviousInteractionCheck(supabase, input);
  const prior = previous
    ? previous.check.types.map((row) => ({
        type: row.type,
        status: row.status,
        detected: row.detected,
      }))
    : [];
  const storedFull = previous?.check.discovery?.full_at ?? null;
  const inferredFull =
    storedFull ??
    (previous?.check.discovery?.scan === "full" ? previous.check.measured_at : null);
  const scan = interactionScanMode({
    hasPrior: Boolean(previous),
    lastFullDiscoveryAt: inferredFull,
    nowMs: input.nowMs ?? Date.now(),
    htmlChanged: input.htmlChanged,
  });
  return { prior, scan, lastFullDiscoveryAt: inferredFull };
}

export async function persistRegionalInteractionCheck(
  supabase: SupabaseClient,
  input: {
    userId: string;
    observationId: string;
    url: string;
    region: string;
    capturedAt: string;
    check: RegionalInteractionCheckV1;
    billing: InteractionCheckBilling;
  },
): Promise<{ saved: boolean; diff: BehaviorDiffV1 }> {
  const existing = await loadObservationScrollInteraction(supabase, input.userId, input.observationId);
  const previous = await findPreviousInteractionCheck(supabase, {
    userId: input.userId,
    url: input.url,
    region: input.region,
    capturedAt: input.capturedAt,
    excludeId: input.observationId,
  });
  const diff = buildBehaviorDiff(previous?.check ?? null, input.check, previous?.observationId ?? null);
  if (input.check.discovery?.rendered_page) {
    const { data } = await supabase
      .from("observations")
      .select("capture_conditions")
      .eq("id", input.observationId)
      .eq("user_id", input.userId)
      .maybeSingle();
    const conditions = parseCaptureConditionsFromDb(data?.capture_conditions);
    if (conditions) {
      const next = applyRenderedPageMeasurement(conditions, input.check);
      if (next !== conditions) {
        await supabase
          .from("observations")
          .update({ capture_conditions: next })
          .eq("id", input.observationId)
          .eq("user_id", input.userId);
      }
    }
  }
  const saved = await saveObservationScrollInteraction(supabase, {
    userId: input.userId,
    observationId: input.observationId,
    check: input.check,
    previousRunTimes: existing?.run_times,
    previousQuotaRunTimes: existing?.quota_run_times,
    billing: input.billing,
    behaviorDiff: diff,
  });
  return { saved, diff };
}
