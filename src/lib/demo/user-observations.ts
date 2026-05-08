import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Observation, ObservationHistoryEvent } from "@/lib/demo/observations";
import type { PlanId } from "@/lib/plans";
import { getPlan } from "@/lib/plans";
import { getRegionOptions } from "@/lib/regions";
import type { PostgrestError } from "@supabase/supabase-js";
import { computeObservationContentHash } from "@/lib/observation-content-hash";

export const USER_OBSERVATIONS_COOKIE = "viewtrace_user_obs";

const MAX_ITEMS = 35;
const MAX_COOKIE_BYTES = 4200;

function sortByCapturedAtDesc(list: Observation[]): Observation[] {
  return list.slice().sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
}

function isHistoryEvent(x: unknown): x is ObservationHistoryEvent {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.at === "string" &&
    typeof o.label === "string" &&
    o.label.length < 200 &&
    (o.kind === "capture" || o.kind === "status" || o.kind === "processing") &&
    (o.detail === undefined || (typeof o.detail === "string" && o.detail.length < 300))
  );
}

function isObservation(x: unknown): x is Observation {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    o.id.length > 0 &&
    o.id.length < 120 &&
    typeof o.url === "string" &&
    o.url.length < 2000 &&
    (o.regionValue === undefined || (typeof o.regionValue === "string" && o.regionValue.length < 20)) &&
    typeof o.regionLabel === "string" &&
    o.regionLabel.length < 200 &&
    typeof o.capturedAt === "string" &&
    (o.status === "success" || o.status === "failure" || o.status === "pending") &&
    (o.note === undefined || (typeof o.note === "string" && o.note.length < 500)) &&
    (o.pageTitle === undefined || (typeof o.pageTitle === "string" && o.pageTitle.length < 400)) &&
    (o.snapshotImageUrl === undefined ||
      (typeof o.snapshotImageUrl === "string" && o.snapshotImageUrl.length < 2048)) &&
    (o.events === undefined ||
      (Array.isArray(o.events) && o.events.length <= 24 && o.events.every(isHistoryEvent))) &&
    (o.contentHash === undefined ||
      (typeof o.contentHash === "string" &&
        o.contentHash.length === 64 &&
        /^[a-f0-9]+$/i.test(o.contentHash))) &&
    (o.snapshotSha256 === undefined ||
      (typeof o.snapshotSha256 === "string" &&
        o.snapshotSha256.length === 64 &&
        /^[a-f0-9]+$/i.test(o.snapshotSha256))) &&
    (o.snapshotPhash === undefined ||
      (typeof o.snapshotPhash === "string" &&
        o.snapshotPhash.length >= 8 &&
        o.snapshotPhash.length <= 128 &&
        /^[a-f0-9]+$/i.test(o.snapshotPhash))) &&
    (o.snapshotBytes === undefined ||
      (typeof o.snapshotBytes === "number" && Number.isFinite(o.snapshotBytes) && o.snapshotBytes >= 0)) &&
    (o.snapshotContentType === undefined ||
      (typeof o.snapshotContentType === "string" && o.snapshotContentType.length <= 80))
  );
}

function trimToFitCookie(list: Observation[]): Observation[] {
  let cur = list.slice(0, MAX_ITEMS);
  while (cur.length > 0) {
    const json = JSON.stringify(cur);
    if (Buffer.byteLength(json, "utf8") <= MAX_COOKIE_BYTES) return cur;
    cur = cur.slice(0, -1);
  }
  return [];
}

export async function readUserObservations(): Promise<Observation[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return [];

  const { data, error } = await supabase
    .from("observations")
    .select(
      "id,url,region,region_label,status,note,page_title,snapshot_image_url,captured_at,events,content_hash,snapshot_sha256,snapshot_phash,snapshot_bytes,snapshot_content_type",
    )
    .order("captured_at", { ascending: false })
    .limit(200);
  if (error || !data) return [];

  return data
    .map((row) => {
      const capturedAt = typeof row.captured_at === "string" ? row.captured_at : new Date().toISOString();
      const regionValue = typeof row.region === "string" ? row.region : "";
      const planId = "starter" as PlanId;
      // NOTE: plan-specific labels are applied in getObservationMergedForPlan / getMergedObservationsForPlan,
      // but we keep a reasonable fallback here.
      const labelFromDb =
        typeof row.region_label === "string" && row.region_label.trim() ? row.region_label.trim() : null;
      const labelFromOptions =
        getRegionOptions(planId).find((r) => r.value === regionValue)?.label ?? regionValue;

      const statusRaw = typeof row.status === "string" ? row.status : "pending";
      const status =
        statusRaw === "success" || statusRaw === "failure" || statusRaw === "pending"
          ? statusRaw
          : "pending";

      const obs: Observation = {
        id: String(row.id),
        url: typeof row.url === "string" ? row.url : "",
        regionValue: regionValue,
        regionLabel: labelFromDb ?? labelFromOptions,
        capturedAt,
        status,
        note: typeof row.note === "string" ? row.note : undefined,
        pageTitle: typeof row.page_title === "string" ? row.page_title : undefined,
        snapshotImageUrl: typeof row.snapshot_image_url === "string" ? row.snapshot_image_url : undefined,
        events: Array.isArray(row.events) ? (row.events as ObservationHistoryEvent[]) : undefined,
        contentHash:
          typeof row.content_hash === "string" && row.content_hash.length === 64
            ? row.content_hash.toLowerCase()
            : undefined,
        snapshotSha256:
          typeof row.snapshot_sha256 === "string" && row.snapshot_sha256.length === 64
            ? row.snapshot_sha256.toLowerCase()
            : undefined,
        snapshotPhash:
          typeof row.snapshot_phash === "string" && row.snapshot_phash.length >= 8
            ? row.snapshot_phash.toLowerCase()
            : undefined,
        snapshotBytes:
          typeof row.snapshot_bytes === "number" && Number.isFinite(row.snapshot_bytes)
            ? row.snapshot_bytes
            : undefined,
        snapshotContentType:
          typeof row.snapshot_content_type === "string" && row.snapshot_content_type.trim()
            ? row.snapshot_content_type.trim()
            : undefined,
      };
      return isObservation(obs) ? obs : null;
    })
    .filter((x): x is Observation => Boolean(x));
}

/** `trial_started_at` 以降に記録されたオブザベーション数（無料トライアル枠の集計用） */
export function countObservationsSinceTrialStart(
  observations: Observation[],
  trialStartedAtIso: string,
): number {
  const t = Date.parse(trialStartedAtIso);
  if (Number.isNaN(t)) return observations.length;
  return observations.filter((o) => new Date(o.capturedAt).getTime() >= t).length;
}

export async function writeUserObservations(list: Observation[]): Promise<void> {
  // Observations are persisted to Supabase now. Cookie write is kept only to clear legacy data.
  const trimmed = trimToFitCookie(sortByCapturedAtDesc(list));
  const json = JSON.stringify(trimmed);
  (await cookies()).set(USER_OBSERVATIONS_COOKIE, json, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function appendUserObservation(
  obs: Observation,
  opts: { retentionDays: number; monthlyLimit: number },
): Promise<{ ok: true } | { ok: false; code: "monthly_limit" }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { ok: false, code: "monthly_limit" };

  // Monthly limit (UTC month) using capturedAt
  const now = new Date();
  const monthStartUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const { count, error: cntErr } = await supabase
    .from("observations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("captured_at", monthStartUtc.toISOString());
  if (cntErr) {
    // If count fails, fail open (allow insert) to avoid blocking recording.
  } else if ((count ?? 0) >= opts.monthlyLimit) {
    return { ok: false, code: "monthly_limit" };
  }

  // Retention cleanup (best-effort)
  const retentionCutoff = new Date(Date.now() - opts.retentionDays * 24 * 60 * 60 * 1000).toISOString();
  void supabase
    .from("observations")
    .delete()
    .eq("user_id", user.id)
    .lt("captured_at", retentionCutoff);

  const contentHash = computeObservationContentHash(obs);

  const payload = {
    id: obs.id,
    user_id: user.id,
    url: obs.url,
    region: obs.regionValue ?? obs.regionLabel,
    region_label: obs.regionLabel,
    status: obs.status,
    note: obs.note ?? null,
    page_title: obs.pageTitle ?? null,
    snapshot_image_url: obs.snapshotImageUrl ?? null,
    captured_at: obs.capturedAt,
    events: obs.events ?? null,
    content_hash: contentHash,
    snapshot_sha256: obs.snapshotSha256 ?? null,
    snapshot_phash: obs.snapshotPhash ?? null,
    snapshot_bytes: obs.snapshotBytes ?? null,
    snapshot_content_type: obs.snapshotContentType ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error: insErr } = await supabase.from("observations").insert(payload);
  if (insErr) {
    const pgErr = insErr as PostgrestError;
    // If UUID mismatch or other schema issues, surface as monthly_limit only for UI routing simplicity.
    console.error("[observations] failed to insert", pgErr);
  }

  // Clear legacy cookie if present
  await writeUserObservations([]);
  return { ok: true };
}

/** プランの保持日数より古い記録を除外（一覧・CSV・参照用） */
export function filterObservationsByRetention(
  rows: Observation[],
  retentionDays: number,
): Observation[] {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  return rows.filter((o) => new Date(o.capturedAt).getTime() >= cutoff);
}

export async function getMergedObservationsSorted(): Promise<Observation[]> {
  const user = await readUserObservations();
  return sortByCapturedAtDesc(user);
}

/** ログイン中プランの保持期間でフィルタした一覧 */
export async function getMergedObservationsForPlan(planId: PlanId): Promise<Observation[]> {
  const retentionDays = getPlan(planId).retentionDays;
  const merged = await getMergedObservationsSorted();
  return filterObservationsByRetention(merged, retentionDays);
}

export async function getObservationMerged(id: string): Promise<Observation | undefined> {
  const user = await readUserObservations();
  return user.find((o) => o.id === id);
}

export async function getObservationMergedForPlan(
  id: string,
  planId: PlanId,
): Promise<Observation | undefined> {
  const obs = await getObservationMerged(id);
  if (!obs) return undefined;
  const retentionDays = getPlan(planId).retentionDays;
  if (!filterObservationsByRetention([obs], retentionDays).length) return undefined;
  return obs;
}

export function countUserObservationsThisUtcMonth(user: Observation[]): number {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  return user.filter((o) => {
    const d = new Date(o.capturedAt);
    return d.getUTCFullYear() === y && d.getUTCMonth() === m;
  }).length;
}
