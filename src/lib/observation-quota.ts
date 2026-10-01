import type { SupabaseClient } from "@supabase/supabase-js";
import type { WatchFrequency } from "@/lib/observation-watch-schedule";

/** 1 URL × 1 Region × 1 Capture = 1 Observation */
export const OBSERVATION_UNIT_HINT = "1 URL × 1 region × 1 capture = 1 Observation";

export function utcMonthStartIso(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)).toISOString();
}

export function remainingObservations(used: number, limit: number): number {
  const u = Math.floor(used);
  const lim = Math.floor(limit);
  if (!Number.isFinite(u) || !Number.isFinite(lim) || lim <= 0) return 0;
  return Math.max(0, lim - Math.max(0, u));
}

/**
 * Multi-region / Watch と同じ思想: 必要枠が足りなければ開始しない。
 * 部分実行しない（20 残で 30 必要なら 0 件）。
 */
export function canStartObservationBatch(remaining: number, required: number): boolean {
  const req = Math.floor(required);
  const rem = Math.floor(remaining);
  if (!Number.isFinite(req) || !Number.isFinite(rem) || req <= 0) return false;
  return rem >= req;
}

/**
 * Watch 1 行 = 1 URL × 1 地域。実行ごとに regionCount Observation。
 * 月の目安は 30 日 / 4 週。暴走防止の表示用であり、課金の確定値ではない。
 */
export function estimateMonthlyWatchObservations(
  frequency: WatchFrequency,
  repeatCount: number,
  regionCount = 1,
): number {
  const repeat = Math.max(1, Math.floor(Number(repeatCount)) || 1);
  const regions = Math.max(1, Math.floor(Number(regionCount)) || 1);
  if (frequency === "daily") return 30 * repeat * regions;
  if (frequency === "weekly") return 4 * repeat * regions;
  return repeat * regions;
}

export async function countObservationsThisUtcMonth(
  supabase: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<number | null> {
  const id = userId.trim();
  if (!id) return null;
  const { count, error } = await supabase
    .from("observations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", id)
    .gte("captured_at", utcMonthStartIso(now));
  if (error) return null;
  return count ?? 0;
}
