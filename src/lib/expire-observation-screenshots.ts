import type { SupabaseClient } from "@supabase/supabase-js";
import { deleteObservationSnapshotByUrl } from "@/lib/observation-snapshot-storage";
import {
  isPastScreenshotRetention,
  screenshotRetentionCutoffIso,
} from "@/lib/observation-screenshot-retention";
import { getPlan, parsePlanId } from "@/lib/plans";

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

async function loadProUserIds(admin: SupabaseClient): Promise<Set<string>> {
  const ids = new Set<string>();
  const { data, error } = await admin.from("users").select("id").eq("plan", "pro");
  if (error) {
    console.warn("[screenshot-retention] list pro users failed", { message: error.message });
    return ids;
  }
  for (const row of data ?? []) {
    if (row && typeof row === "object" && "id" in row && typeof row.id === "string") {
      ids.add(row.id);
    }
  }
  return ids;
}

function retentionDaysForUser(userId: string, proIds: Set<string>): number {
  return getPlan(proIds.has(userId) ? "pro" : parsePlanId("starter")).retentionDays;
}

/**
 * Cron: never apply the 7-day window to Pro accounts.
 * Candidates are rows older than Starter’s window; Pro rows stay until 60 days.
 */
export async function expireDueObservationScreenshotsAllPlans(
  admin: SupabaseClient,
  opts?: { limit?: number },
): Promise<ExpireScreenshotsResult> {
  const result = emptyResult();
  const limit = Math.min(Math.max(opts?.limit ?? DEFAULT_BATCH, 1), 200);
  const starterDays = getPlan("starter").retentionDays;
  const cutoff = screenshotRetentionCutoffIso(starterDays);
  const proIds = await loadProUserIds(admin);

  const { data, error } = await admin
    .from("observations")
    .select("id,user_id,snapshot_image_url,captured_at")
    .is("snapshot_purged_at", null)
    .not("snapshot_image_url", "is", null)
    .lt("captured_at", cutoff)
    .order("captured_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.warn("[screenshot-retention] list due failed", { message: error.message });
    return result;
  }

  const rows = asDueRows(data);
  result.scanned = rows.length;

  for (const row of rows) {
    const retentionDays = retentionDaysForUser(row.user_id, proIds);
    if (!isPastScreenshotRetention(row.captured_at, retentionDays)) {
      result.skipped += 1;
      continue;
    }
    await purgeRow(admin, row, result);
  }

  return result;
}
