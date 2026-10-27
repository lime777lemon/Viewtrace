import type { SupabaseClient } from "@supabase/supabase-js";
import { isObservationUuid } from "@/lib/observation-ai-audit";
import {
  appendLabCwvRunTime,
  parseLabCwvFromUnknown,
  parseLabCwvRunTimes,
  type LabCwvV1,
} from "@/lib/observation-lab-cwv";
import {
  appendFieldCwvRunTime,
  parseFieldCwvFromUnknown,
  parseFieldCwvRunTimes,
  type FieldCwvV1,
} from "@/lib/observation-field-cwv";
import { parseSubpageScoresFromUnknown, type SubpageScoresV1 } from "@/lib/observation-subpages";
import {
  appendSyntheticRunTime,
  parseSyntheticInteractionFromUnknown,
  parseSyntheticRunTimes,
  type SyntheticInteractionV1,
} from "@/lib/observation-synthetic-interaction";
import { parseBehaviorDiff, type BehaviorDiffV1 } from "@/lib/observation-behavior-diff";
import {
  parseWatchAnomalyFromUnknown,
  type WatchAnomalyV1,
} from "@/lib/observation-watch-anomaly";
import { appendScrollRunTime, parseScrollRunTimes } from "@/lib/observation-scroll-interaction";
import {
  parseRegionalInteractionCheckFromUnknown,
  type RegionalInteractionCheckV1,
} from "@/lib/observation-regional-interaction";
import { countIsoTimestampsThisUtcMonth } from "@/lib/observation-quota";

export const LAB_CWV_ANALYSIS_TYPE = "lab_cwv" as const;
export const SUBPAGE_ANALYSIS_TYPE = "subpage_scores" as const;
export const FIELD_CWV_ANALYSIS_TYPE = "field_cwv" as const;
export const SYNTHETIC_INTERACTION_ANALYSIS_TYPE = "synthetic_interaction" as const;
export const SCROLL_INTERACTION_ANALYSIS_TYPE = "scroll_interaction" as const;
const LAB_CWV_PROMPT = "lab-cwv-v1";
const SUBPAGE_PROMPT = "subpage-scores-v1";
const FIELD_CWV_PROMPT = "field-cwv-v1";
const SYNTHETIC_PROMPT = "synthetic-interaction-v1";
const SCROLL_PROMPT = "scroll-interaction-v1";

export type StoredLabCwv = {
  result: LabCwvV1;
  run_times: string[];
};

export type StoredFieldCwv = {
  result: FieldCwvV1;
  run_times: string[];
};

export type StoredSyntheticInteraction = {
  result: SyntheticInteractionV1;
  run_times: string[];
};

export type InteractionCheckBilling = "synthetic" | "watch_included";

export type StoredScrollInteraction = {
  result: RegionalInteractionCheckV1;
  run_times: string[];
  quota_run_times: string[];
  billing: InteractionCheckBilling;
  behavior_diff: BehaviorDiffV1 | null;
  watch_anomaly: WatchAnomalyV1 | null;
};

function notesArray(raw: unknown): unknown[] {
  return Array.isArray(raw) ? raw : [];
}

export function parseStoredLabCwv(notes: unknown): StoredLabCwv | null {
  const first = notesArray(notes)[0];
  if (!first || typeof first !== "object") return null;
  const o = first as Record<string, unknown>;
  const result = parseLabCwvFromUnknown(o.result ?? first);
  if (!result) return null;
  return { result, run_times: parseLabCwvRunTimes(o.run_times) };
}

function interactionBilling(raw: unknown): InteractionCheckBilling {
  return raw === "watch_included" ? "watch_included" : "synthetic";
}

export function parseStoredScroll(notes: unknown): StoredScrollInteraction | null {
  const first = notesArray(notes)[0];
  if (!first || typeof first !== "object") return null;
  const o = first as Record<string, unknown>;
  const result = parseRegionalInteractionCheckFromUnknown(o.result ?? first);
  if (!result) return null;
  const billing = interactionBilling(o.billing);
  const run_times = parseScrollRunTimes(o.run_times);
  const quota_run_times = Array.isArray(o.quota_run_times)
    ? parseScrollRunTimes(o.quota_run_times)
    : billing === "watch_included"
      ? []
      : run_times;
  return {
    result,
    run_times,
    quota_run_times,
    billing,
    behavior_diff: parseBehaviorDiff(o.behavior_diff),
    watch_anomaly: parseWatchAnomalyFromUnknown(o.watch_anomaly),
  };
}

export function parseStoredSynthetic(notes: unknown): StoredSyntheticInteraction | null {
  const first = notesArray(notes)[0];
  if (!first || typeof first !== "object") return null;
  const o = first as Record<string, unknown>;
  const result = parseSyntheticInteractionFromUnknown(o.result ?? first);
  if (!result) return null;
  return { result, run_times: parseSyntheticRunTimes(o.run_times) };
}

export function parseStoredFieldCwv(notes: unknown): StoredFieldCwv | null {
  const first = notesArray(notes)[0];
  if (!first || typeof first !== "object") return null;
  const o = first as Record<string, unknown>;
  const result = parseFieldCwvFromUnknown(o.result ?? first);
  if (!result) return null;
  return { result, run_times: parseFieldCwvRunTimes(o.run_times) };
}

export function parseStoredSubpages(notes: unknown): SubpageScoresV1 | null {
  const first = notesArray(notes)[0];
  if (!first || typeof first !== "object") return null;
  const o = first as Record<string, unknown>;
  return parseSubpageScoresFromUnknown(o.result ?? first);
}

export async function loadObservationLabCwv(
  supabase: SupabaseClient,
  userId: string,
  observationId: string,
): Promise<StoredLabCwv | null> {
  if (!isObservationUuid(observationId)) return null;
  const { data, error } = await supabase
    .from("ai_analyses")
    .select("notes")
    .eq("user_id", userId)
    .eq("observation_id", observationId)
    .eq("analysis_type", LAB_CWV_ANALYSIS_TYPE)
    .maybeSingle();
  if (error) {
    if (!isMissingTable(error)) {
      console.warn("[optional-metrics] load lab cwv failed", error.code, error.message);
    }
    return null;
  }
  return parseStoredLabCwv(data?.notes);
}

export async function loadObservationSubpageScores(
  supabase: SupabaseClient,
  userId: string,
  observationId: string,
): Promise<SubpageScoresV1 | null> {
  if (!isObservationUuid(observationId)) return null;
  const { data, error } = await supabase
    .from("ai_analyses")
    .select("notes")
    .eq("user_id", userId)
    .eq("observation_id", observationId)
    .eq("analysis_type", SUBPAGE_ANALYSIS_TYPE)
    .maybeSingle();
  if (error) {
    if (!isMissingTable(error)) {
      console.warn("[optional-metrics] load subpages failed", error.code, error.message);
    }
    return null;
  }
  return parseStoredSubpages(data?.notes);
}

export async function loadObservationFieldCwv(
  supabase: SupabaseClient,
  userId: string,
  observationId: string,
): Promise<StoredFieldCwv | null> {
  if (!isObservationUuid(observationId)) return null;
  const { data, error } = await supabase
    .from("ai_analyses")
    .select("notes")
    .eq("user_id", userId)
    .eq("observation_id", observationId)
    .eq("analysis_type", FIELD_CWV_ANALYSIS_TYPE)
    .maybeSingle();
  if (error) {
    if (!isMissingTable(error)) {
      console.warn("[optional-metrics] load field cwv failed", error.code, error.message);
    }
    return null;
  }
  return parseStoredFieldCwv(data?.notes);
}

export async function saveObservationLabCwv(
  supabase: SupabaseClient,
  input: {
    userId: string;
    observationId: string;
    labCwv: LabCwvV1;
    previousRunTimes?: string[];
  },
): Promise<boolean> {
  if (!isObservationUuid(input.observationId)) return false;
  const runTimes = appendLabCwvRunTime(input.previousRunTimes ?? [], input.labCwv.measured_at);
  return upsertNotes(supabase, {
    userId: input.userId,
    observationId: input.observationId,
    analysisType: LAB_CWV_ANALYSIS_TYPE,
    promptVersion: LAB_CWV_PROMPT,
    summary: "Lab Core Web Vitals",
    notes: [{ kind: LAB_CWV_ANALYSIS_TYPE, result: input.labCwv, run_times: runTimes }],
  });
}

export async function saveObservationSubpageScores(
  supabase: SupabaseClient,
  input: {
    userId: string;
    observationId: string;
    subpages: SubpageScoresV1;
  },
): Promise<boolean> {
  if (!isObservationUuid(input.observationId)) return false;
  return upsertNotes(supabase, {
    userId: input.userId,
    observationId: input.observationId,
    analysisType: SUBPAGE_ANALYSIS_TYPE,
    promptVersion: SUBPAGE_PROMPT,
    summary: "Subpage html_signals scores",
    notes: [{ kind: SUBPAGE_ANALYSIS_TYPE, result: input.subpages }],
  });
}

export async function loadObservationSyntheticInteractionsByIds(
  supabase: SupabaseClient,
  userId: string,
  observationIds: string[],
): Promise<Map<string, SyntheticInteractionV1>> {
  const out = new Map<string, SyntheticInteractionV1>();
  const ids = [...new Set(observationIds.filter((id) => isObservationUuid(id)))].slice(0, 12);
  if (ids.length === 0) return out;
  const { data, error } = await supabase
    .from("ai_analyses")
    .select("observation_id,notes")
    .eq("user_id", userId)
    .eq("analysis_type", SYNTHETIC_INTERACTION_ANALYSIS_TYPE)
    .in("observation_id", ids);
  if (error) {
    if (!isMissingTable(error)) {
      console.warn("[optional-metrics] load synthetic batch failed", error.code, error.message);
    }
    return out;
  }
  for (const row of data ?? []) {
    const id = typeof row.observation_id === "string" ? row.observation_id : "";
    const stored = parseStoredSynthetic(row.notes);
    if (id && stored?.result) out.set(id, stored.result);
  }
  return out;
}

export async function loadObservationSyntheticInteraction(
  supabase: SupabaseClient,
  userId: string,
  observationId: string,
): Promise<StoredSyntheticInteraction | null> {
  if (!isObservationUuid(observationId)) return null;
  const { data, error } = await supabase
    .from("ai_analyses")
    .select("notes")
    .eq("user_id", userId)
    .eq("observation_id", observationId)
    .eq("analysis_type", SYNTHETIC_INTERACTION_ANALYSIS_TYPE)
    .maybeSingle();
  if (error) {
    if (!isMissingTable(error)) {
      console.warn("[optional-metrics] load synthetic failed", error.code, error.message);
    }
    return null;
  }
  return parseStoredSynthetic(data?.notes);
}

export async function saveObservationFieldCwv(
  supabase: SupabaseClient,
  input: {
    userId: string;
    observationId: string;
    fieldCwv: FieldCwvV1;
    previousRunTimes?: string[];
  },
): Promise<boolean> {
  if (!isObservationUuid(input.observationId)) return false;
  const runTimes = appendFieldCwvRunTime(input.previousRunTimes ?? [], input.fieldCwv.measured_at);
  return upsertNotes(supabase, {
    userId: input.userId,
    observationId: input.observationId,
    analysisType: FIELD_CWV_ANALYSIS_TYPE,
    promptVersion: FIELD_CWV_PROMPT,
    summary: "Field Core Web Vitals (CrUX)",
    notes: [{ kind: FIELD_CWV_ANALYSIS_TYPE, result: input.fieldCwv, run_times: runTimes }],
  });
}

export async function loadObservationScrollInteraction(
  supabase: SupabaseClient,
  userId: string,
  observationId: string,
): Promise<StoredScrollInteraction | null> {
  if (!isObservationUuid(observationId)) return null;
  const { data, error } = await supabase
    .from("ai_analyses")
    .select("notes")
    .eq("user_id", userId)
    .eq("observation_id", observationId)
    .eq("analysis_type", SCROLL_INTERACTION_ANALYSIS_TYPE)
    .maybeSingle();
  if (error) {
    if (!isMissingTable(error)) {
      console.warn("[optional-metrics] load scroll failed", error.code, error.message);
    }
    return null;
  }
  return parseStoredScroll(data?.notes);
}

export async function loadObservationScrollInteractionsByIds(
  supabase: SupabaseClient,
  userId: string,
  observationIds: string[],
): Promise<Map<string, RegionalInteractionCheckV1>> {
  const out = new Map<string, RegionalInteractionCheckV1>();
  const ids = [...new Set(observationIds.filter((id) => isObservationUuid(id)))].slice(0, 12);
  if (ids.length === 0) return out;
  const { data, error } = await supabase
    .from("ai_analyses")
    .select("observation_id,notes")
    .eq("user_id", userId)
    .eq("analysis_type", SCROLL_INTERACTION_ANALYSIS_TYPE)
    .in("observation_id", ids);
  if (error) {
    if (!isMissingTable(error)) {
      console.warn("[optional-metrics] load scroll batch failed", error.code, error.message);
    }
    return out;
  }
  for (const row of data ?? []) {
    const id = typeof row.observation_id === "string" ? row.observation_id : "";
    const stored = parseStoredScroll(row.notes);
    if (id && stored?.result) out.set(id, stored.result);
  }
  return out;
}

export async function saveObservationScrollInteraction(
  supabase: SupabaseClient,
  input: {
    userId: string;
    observationId: string;
    check: RegionalInteractionCheckV1;
    previousRunTimes?: string[];
    previousQuotaRunTimes?: string[];
    billing?: InteractionCheckBilling;
    behaviorDiff?: BehaviorDiffV1 | null;
    watchAnomaly?: WatchAnomalyV1 | null;
  },
): Promise<boolean> {
  if (!isObservationUuid(input.observationId)) return false;
  const billing = input.billing ?? "synthetic";
  const runTimes = appendScrollRunTime(input.previousRunTimes ?? [], input.check.measured_at);
  const quotaBase =
    input.previousQuotaRunTimes ??
    (billing === "watch_included" ? [] : (input.previousRunTimes ?? []));
  const quotaRunTimes =
    billing === "synthetic"
      ? appendScrollRunTime(quotaBase, input.check.measured_at)
      : parseScrollRunTimes(quotaBase);
  return upsertNotes(supabase, {
    userId: input.userId,
    observationId: input.observationId,
    analysisType: SCROLL_INTERACTION_ANALYSIS_TYPE,
    promptVersion: SCROLL_PROMPT,
    summary: "Regional interaction check (not a screenshot)",
    notes: [
      {
        kind: SCROLL_INTERACTION_ANALYSIS_TYPE,
        result: input.check,
        run_times: runTimes,
        quota_run_times: quotaRunTimes,
        billing,
        behavior_diff: input.behaviorDiff ?? null,
        watch_anomaly: input.watchAnomaly ?? null,
      },
    ],
  });
}

export async function saveObservationSyntheticInteraction(
  supabase: SupabaseClient,
  input: {
    userId: string;
    observationId: string;
    synthetic: SyntheticInteractionV1;
    previousRunTimes?: string[];
  },
): Promise<boolean> {
  if (!isObservationUuid(input.observationId)) return false;
  const runTimes = appendSyntheticRunTime(input.previousRunTimes ?? [], input.synthetic.measured_at);
  return upsertNotes(supabase, {
    userId: input.userId,
    observationId: input.observationId,
    analysisType: SYNTHETIC_INTERACTION_ANALYSIS_TYPE,
    promptVersion: SYNTHETIC_PROMPT,
    summary: "Synthetic interaction (not Field INP)",
    notes: [{ kind: SYNTHETIC_INTERACTION_ANALYSIS_TYPE, result: input.synthetic, run_times: runTimes }],
  });
}

export async function countLabCwvRunsThisUtcMonth(
  supabase: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<number | null> {
  const id = userId.trim();
  if (!id) return null;
  const { data, error } = await supabase
    .from("ai_analyses")
    .select("notes")
    .eq("user_id", id)
    .eq("analysis_type", LAB_CWV_ANALYSIS_TYPE);
  if (error) {
    if (!isMissingTable(error)) {
      console.warn("[optional-metrics] count lab cwv failed", error.code, error.message);
    }
    return isMissingTable(error) ? 0 : null;
  }
  let used = 0;
  for (const row of data ?? []) {
    const stored = parseStoredLabCwv(row.notes);
    const times = stored?.run_times ?? [];
    used += countIsoTimestampsThisUtcMonth(times, now);
  }
  return used;
}

export async function countFieldCwvRunsThisUtcMonth(
  supabase: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<number | null> {
  const id = userId.trim();
  if (!id) return null;
  const { data, error } = await supabase
    .from("ai_analyses")
    .select("notes")
    .eq("user_id", id)
    .eq("analysis_type", FIELD_CWV_ANALYSIS_TYPE);
  if (error) {
    if (!isMissingTable(error)) {
      console.warn("[optional-metrics] count field cwv failed", error.code, error.message);
    }
    return isMissingTable(error) ? 0 : null;
  }
  let used = 0;
  for (const row of data ?? []) {
    const stored = parseStoredFieldCwv(row.notes);
    const times = stored?.run_times ?? [];
    used += countIsoTimestampsThisUtcMonth(times, now);
  }
  return used;
}

export async function countSyntheticInteractionRunsThisUtcMonth(
  supabase: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<number | null> {
  const id = userId.trim();
  if (!id) return null;
  const { data, error } = await supabase
    .from("ai_analyses")
    .select("notes,analysis_type")
    .eq("user_id", id)
    .in("analysis_type", [SYNTHETIC_INTERACTION_ANALYSIS_TYPE, SCROLL_INTERACTION_ANALYSIS_TYPE]);
  if (error) {
    if (!isMissingTable(error)) {
      console.warn("[optional-metrics] count synthetic failed", error.code, error.message);
    }
    return isMissingTable(error) ? 0 : null;
  }
  let used = 0;
  for (const row of data ?? []) {
    const analysisType = typeof row.analysis_type === "string" ? row.analysis_type : "";
    if (analysisType === SCROLL_INTERACTION_ANALYSIS_TYPE) {
      const stored = parseStoredScroll(row.notes);
      used += countIsoTimestampsThisUtcMonth(stored?.quota_run_times ?? [], now);
      continue;
    }
    const stored = parseStoredSynthetic(row.notes);
    used += countIsoTimestampsThisUtcMonth(stored?.run_times ?? [], now);
  }
  return used;
}

async function upsertNotes(
  supabase: SupabaseClient,
  input: {
    userId: string;
    observationId: string;
    analysisType:
      | typeof LAB_CWV_ANALYSIS_TYPE
      | typeof SUBPAGE_ANALYSIS_TYPE
      | typeof FIELD_CWV_ANALYSIS_TYPE
      | typeof SYNTHETIC_INTERACTION_ANALYSIS_TYPE
      | typeof SCROLL_INTERACTION_ANALYSIS_TYPE;
    promptVersion: string;
    summary: string;
    notes: unknown[];
  },
): Promise<boolean> {
  const now = new Date().toISOString();
  const { error } = await supabase.from("ai_analyses").upsert(
    {
      user_id: input.userId,
      observation_id: input.observationId,
      analysis_type: input.analysisType,
      status: "completed",
      source: "record",
      summary: input.summary,
      notes: input.notes,
      model: null,
      prompt_version: input.promptVersion,
      updated_at: now,
    },
    { onConflict: "user_id,observation_id,analysis_type" },
  );
  if (error) {
    console.warn("[optional-metrics] save failed", error.code, error.message);
    return false;
  }
  return true;
}

function isMissingTable(error: { code?: string; message?: string }): boolean {
  return error.code === "42P01" || error.code === "PGRST205" || /ai_analyses/i.test(error.message ?? "");
}
