import type { SupabaseClient } from "@supabase/supabase-js";
import { deleteObservationSnapshotByUrl } from "@/lib/observation-snapshot-storage";
import { screenshotRetentionCutoffIso } from "@/lib/observation-screenshot-retention";
import { parsePlanId, type PlanId } from "@/lib/plans";
import { screenshotRetentionDaysFromStored } from "@/lib/screenshot-retention-store";

export type ExpireScreenshotsResult = {
  scanned: number;
  deletedBlobs: number;
  marked: number;
  skipped: number;
  failed: number;
};

const DEFAULT_BATCH = 80;

type DueRow = {
  id: string;
  user_id: string;
  snapshot_image_url: string;
  captured_at: string;
};

function emptyResult(): ExpireScreenshotsResult {
  return { scanned: 0, deletedBlobs: 0, marked: 0, skipped: 0, failed: 0 };
}

function asDueRows(data: unknown): DueRow[] {
  if (!Array.isArray(data)) return [];
  const out: DueRow[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : "";
    const userId = typeof row.user_id === "string" ? row.user_id : "";
    const url = typeof row.snapshot_image_url === "string" ? row.snapshot_image_url.trim() : "";
    const capturedAt = typeof row.captured_at === "string" ? row.captured_at : "";
    if (!id || !userId || !url || !capturedAt) continue;
    out.push({ id, user_id: userId, snapshot_image_url: url, captured_at: capturedAt });
  }
  return out;
}

async function markPurged(
  supabase: SupabaseClient,
  id: string,
  userId?: string,
): Promise<boolean> {
  let q = supabase
    .from("observations")
    .update({ snapshot_purged_at: new Date().toISOString() })
    .eq("id", id)
    .is("snapshot_purged_at", null);
  if (userId) q = q.eq("user_id", userId);
  const { error } = await q;
  if (error) {
    console.warn("[screenshot-retention] mark purged failed", { id, message: error.message });
    return false;
  }
  return true;
}

async function purgeRow(
  supabase: SupabaseClient,
  row: DueRow,
  result: ExpireScreenshotsResult,
  userIdFilter?: string,
): Promise<void> {
  const delResult = await deleteObservationSnapshotByUrl(row.snapshot_image_url);
  if (!delResult.ok) {
    result.failed += 1;
    return;
  }
  result.deletedBlobs += 1;
  const marked = await markPurged(supabase, row.id, userIdFilter);
  if (marked) result.marked += 1;
  else result.failed += 1;
}

/** One user, known plan window. Used after insert. */
export async function expireDueObservationScreenshots(
  supabase: SupabaseClient,
  opts: {
    retentionDays: number;
    userId?: string;
    limit?: number;
  },
): Promise<ExpireScreenshotsResult> {
  const result = emptyResult();
  const cutoff = screenshotRetentionCutoffIso(opts.retentionDays);
  const limit = Math.min(Math.max(opts.limit ?? DEFAULT_BATCH, 1), 200);

  let query = supabase
    .from("observations")
    .select("id,user_id,snapshot_image_url,captured_at")
    .is("snapshot_purged_at", null)
    .not("snapshot_image_url", "is", null)
    .lt("captured_at", cutoff)
    .order("captured_at", { ascending: true })
    .limit(limit);
  if (opts.userId) {
    query = query.eq("user_id", opts.userId);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("[screenshot-retention] list due failed", { message: error.message });
    return result;
  }

  const rows = asDueRows(data);
  result.scanned = rows.length;
  for (const row of rows) {
    await purgeRow(supabase, row, result, opts.userId);
  }
  return result;
}

async function loadRetentionDaysByUserId(admin: SupabaseClient): Promise<Map<string, number> | null> {
  const daysByUser = new Map<string, number>();
  const page = 1000;
  for (let from = 0; from < 20000; from += page) {
    const { data, error } = await admin
      .from("users")
      .select("id, plan, screenshot_retention_days")
      .range(from, from + page - 1);
    if (error) {
      console.warn("[screenshot-retention] list plans failed", { message: error.message });
      return null;
    }
    const rows = data ?? [];
    for (const row of rows) {
      if (!row || typeof row !== "object" || !("id" in row) || typeof row.id !== "string") continue;
      const planRaw = "plan" in row && typeof row.plan === "string" ? row.plan : null;
      const planId: PlanId = parsePlanId(planRaw);
      const stored = "screenshot_retention_days" in row ? row.screenshot_retention_days : null;
      daysByUser.set(row.id, screenshotRetentionDaysFromStored(stored, planId));
    }
    if (rows.length < page) break;
  }
  return daysByUser;
}

/**
 * Cron: each plan keeps screenshots for its own window.
 * Free is 30 days, Starter is 90 days, Pro is 365 days.
 */
export async function expireDueObservationScreenshotsAllPlans(
  admin: SupabaseClient,
  opts?: { limit?: number },
): Promise<ExpireScreenshotsResult> {
  const result = emptyResult();
  const limit = Math.min(Math.max(opts?.limit ?? DEFAULT_BATCH, 1), 200);
  const plans = await loadRetentionDaysByUserId(admin);
  if (!plans) return result;

  const userIdsByDays = new Map<number, string[]>();
  for (const [userId, days] of plans) {
    const ids = userIdsByDays.get(days) ?? [];
    ids.push(userId);
    userIdsByDays.set(days, ids);
  }

  const due: DueRow[] = [];
  for (const [days, userIds] of userIdsByDays) {
    if (due.length >= limit) break;
    const cutoff = screenshotRetentionCutoffIso(days);
    for (let index = 0; index < userIds.length && due.length < limit; index += 100) {
      const slice = userIds.slice(index, index + 100);
      const { data, error } = await admin
        .from("observations")
        .select("id,user_id,snapshot_image_url,captured_at")
        .in("user_id", slice)
        .is("snapshot_purged_at", null)
        .not("snapshot_image_url", "is", null)
        .lt("captured_at", cutoff)
        .order("captured_at", { ascending: true })
        .limit(limit - due.length);
      if (error) {
        console.warn("[screenshot-retention] list due failed", { message: error.message });
        return result;
      }
      due.push(...asDueRows(data));
    }
  }

  result.scanned = due.length;
  for (const row of due) {
    await purgeRow(admin, row, result);
  }
  return result;
}
