import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Observation,
  ObservationHistoryEvent,
  ObservationReviewStatus,
} from "@/lib/demo/observations";
import type { PlanId } from "@/lib/plans";
import { getRegionOptions } from "@/lib/regions";
import type { PostgrestError } from "@supabase/supabase-js";
import { parseCaptureConditionsFromDb } from "@/lib/capture-conditions";
import { computeObservationContentHash } from "@/lib/observation-content-hash";
import { generateObservationVerifyToken } from "@/lib/observation-verify-token";
import { sanitizeObservationRouteId } from "@/lib/observation-route-id";
import { inheritedTagsForUrl } from "@/lib/observation-url-tags";
import { normalizeObservationTags } from "@/lib/observation-tags";
import { markVerifyLoopFirstObservation } from "@/lib/verify-loop/track";
import { expireDueObservationScreenshots } from "@/lib/expire-observation-screenshots";
import { countObservationsThisUtcMonth } from "@/lib/observation-quota";
import { observationUrlIdentity, observationUrlLookupVariants } from "@/lib/observation-compare";

export const USER_OBSERVATIONS_COOKIE = "viewtrace_user_obs";

const MAX_ITEMS = 35;
const MAX_COOKIE_BYTES = 4200;

const OBSERVATION_ROW_SELECT =
  "id,url,region,region_label,status,note,tags,folder,review_status,page_title,snapshot_image_url,captured_at,events,content_hash,snapshot_sha256,snapshot_phash,snapshot_bytes,snapshot_content_type,capture_conditions,snapshot_purged_at" as const;

const REVIEW_STATUSES = new Set<ObservationReviewStatus>([
  "open",
  "reviewed",
  "archived",
  "flagged",
]);

function parseTagsFromDb(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const tags = raw
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length <= 32)
    .slice(0, 12);
  return tags.length ? tags : undefined;
}

function sortByCapturedAtDesc(list: Observation[]): Observation[] {
  return list.slice().sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
}

/** DB 行 → `Observation`（`readUserObservations` と同じ正規化。メールの直リンク用に ID 単体取得でも使う） */
function mapDbRowToObservation(
  row: Record<string, unknown>,
  planForRegionFallback: PlanId,
): Observation | null {
  const capturedAt = typeof row.captured_at === "string" ? row.captured_at : new Date().toISOString();
  const regionValue = typeof row.region === "string" ? row.region : "";
  const labelFromDb =
    typeof row.region_label === "string" && row.region_label.trim() ? row.region_label.trim() : null;
  const labelFromOptions =
    getRegionOptions(planForRegionFallback).find((r) => r.value === regionValue)?.label ?? regionValue;

  const statusRaw = typeof row.status === "string" ? row.status : "pending";
  const status =
    statusRaw === "success" || statusRaw === "failure" || statusRaw === "pending" ? statusRaw : "pending";

  const obs: Observation = {
    id: String(row.id),
    url: typeof row.url === "string" ? row.url : "",
    regionValue: regionValue,
    regionLabel: labelFromDb ?? labelFromOptions,
    capturedAt,
    status,
    note: typeof row.note === "string" ? row.note : undefined,
    tags: parseTagsFromDb(row.tags),
    folder:
      typeof row.folder === "string" && row.folder.trim() && row.folder.length <= 120
        ? row.folder.trim()
        : undefined,
    reviewStatus: (() => {
      const rs = typeof row.review_status === "string" ? row.review_status : "";
      return REVIEW_STATUSES.has(rs as ObservationReviewStatus)
        ? (rs as ObservationReviewStatus)
        : undefined;
    })(),
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
    snapshotPhash: (() => {
      if (typeof row.snapshot_phash !== "string") return undefined;
      const v = row.snapshot_phash.toLowerCase();
      /**
       * 古い行は 16,384 文字級の phash が入っていることがある（imghash の `bits` 引数を
       * grid side ではなく総ビット数として渡していた時期があったため）。
       * `Observation` 検証で弾かれて一覧から消えてしまうのを避けるため、上限を超えるものは
       * 表示用には捨てる（DB のデータは保持）。
       */
      if (v.length < 8 || v.length > 128 || !/^[a-f0-9]+$/.test(v)) return undefined;
      return v;
    })(),
    snapshotBytes:
      typeof row.snapshot_bytes === "number" && Number.isFinite(row.snapshot_bytes)
        ? row.snapshot_bytes
        : undefined,
    snapshotContentType:
      typeof row.snapshot_content_type === "string" && row.snapshot_content_type.trim()
        ? row.snapshot_content_type.trim()
        : undefined,
    captureConditions: parseCaptureConditionsFromDb(row.capture_conditions),
    snapshotPurgedAt:
      typeof row.snapshot_purged_at === "string" && row.snapshot_purged_at.trim()
        ? row.snapshot_purged_at.trim()
        : undefined,
  };
  return isObservation(obs) ? obs : null;
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
    (o.regionValue === undefined ||
      (typeof o.regionValue === "string" && o.regionValue.length < 64)) &&
    typeof o.regionLabel === "string" &&
    o.regionLabel.length < 200 &&
    typeof o.capturedAt === "string" &&
    (o.status === "success" || o.status === "failure" || o.status === "pending") &&
    (o.note === undefined || (typeof o.note === "string" && o.note.length < 500)) &&
    (o.tags === undefined ||
      (Array.isArray(o.tags) &&
        o.tags.length <= 12 &&
        o.tags.every((t) => typeof t === "string" && t.length > 0 && t.length <= 32))) &&
    (o.folder === undefined || (typeof o.folder === "string" && o.folder.length <= 120)) &&
    (o.reviewStatus === undefined || REVIEW_STATUSES.has(o.reviewStatus as ObservationReviewStatus)) &&
    (o.pageTitle === undefined || (typeof o.pageTitle === "string" && o.pageTitle.length < 400)) &&
    (o.snapshotImageUrl === undefined ||
      (typeof o.snapshotImageUrl === "string" &&
        o.snapshotImageUrl.length < 8192 /* Blob / CDN の長いクエリ URL 対応・DB text */)) &&
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
      (typeof o.snapshotContentType === "string" && o.snapshotContentType.length <= 80)) &&
    (o.snapshotPurgedAt === undefined ||
      (typeof o.snapshotPurgedAt === "string" && o.snapshotPurgedAt.length < 40))
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
  const session = await getSession();
  if (!session) return [];

  const supabase = await createSupabaseServerClient();
  const planForRegionFallback = session.plan;

  const { data, error } = await supabase
    .from("observations")
    .select(OBSERVATION_ROW_SELECT)
    .order("captured_at", { ascending: false })
    .limit(200);
  if (error || !data) return [];

  return data
    .map((row) => mapDbRowToObservation(row as unknown as Record<string, unknown>, planForRegionFallback))
    .filter((x): x is Observation => Boolean(x));
}

/** 同一 URL 識別子の記録（Time / Region Compare）。末尾 `/` 違いは variants で拾い、JS で identity 確認。 */
export async function listObservationsForUrlIdentity(url: string): Promise<Observation[]> {
  const session = await getSession();
  if (!session) return [];
  const identity = observationUrlIdentity(url);
  const variants = observationUrlLookupVariants(url);
  if (variants.length === 0) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("observations")
    .select(OBSERVATION_ROW_SELECT)
    .in("url", variants)
    .order("captured_at", { ascending: true })
    .limit(80);
  if (error || !data) return [];

  return data
    .map((row) => mapDbRowToObservation(row as unknown as Record<string, unknown>, session.plan))
    .filter((x): x is Observation => Boolean(x))
    .filter((row) => (identity ? observationUrlIdentity(row.url) === identity : row.url.trim() === url.trim()));
}

/** 同一 URL × 地域の記録（時刻比較用）。RLS で自分の行だけ。 */
export async function listObservationsForUrlRegion(
  url: string,
  region: string,
): Promise<Observation[]> {
  const trimmedRegion = region.trim();
  if (!trimmedRegion) return [];
  const related = await listObservationsForUrlIdentity(url);
  return related.filter((row) => (row.regionValue ?? "").trim() === trimmedRegion);
}

/** 一覧の件数上限外でも、RLS 下で自分の行なら ID だけで取得できる（メールの「記録を開く」用） */
async function fetchObservationByIdForCurrentUser(
  id: string,
  planForRegionFallback: PlanId,
): Promise<Observation | undefined> {
  const session = await getSession();
  if (!session) return undefined;

  const supabase = await createSupabaseServerClient();

  const sanitized = sanitizeObservationRouteId(id);
  if (!sanitized) return undefined;

  const { data: row, error } = await supabase
    .from("observations")
    .select(OBSERVATION_ROW_SELECT)
    .eq("id", sanitized)
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[observations] fetchObservationByIdForCurrentUser", error.message);
    }
    return undefined;
  }

  if (!row) return undefined;
  const obs = mapDbRowToObservation(row as unknown as Record<string, unknown>, planForRegionFallback);
  return obs ?? undefined;
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

  const used = await countObservationsThisUtcMonth(supabase, user.id);
  if (used == null) {
    console.warn("[observations] monthly count failed; refusing insert");
    return { ok: false, code: "monthly_limit" };
  }
  if (used >= opts.monthlyLimit) {
    return { ok: false, code: "monthly_limit" };
  }

  // Screenshot-only expiry (best-effort). Observation rows stay.
  void expireDueObservationScreenshots(supabase, {
    userId: user.id,
    retentionDays: opts.retentionDays,
    limit: 40,
  });

  const contentHash = computeObservationContentHash(obs);
  const verifyToken = generateObservationVerifyToken();
  const inheritedTags = await inheritedTagsForUrl(supabase, user.id, obs.url);

  const payload = {
    id: obs.id,
    user_id: user.id,
    url: obs.url,
    region: obs.regionValue ?? obs.regionLabel,
    region_label: obs.regionLabel,
    status: obs.status,
    note: obs.note ?? null,
    tags: normalizeObservationTags([...(obs.tags ?? []), ...inheritedTags]),
    folder: obs.folder ?? null,
    review_status: obs.reviewStatus ?? null,
    page_title: obs.pageTitle ?? null,
    snapshot_image_url: obs.snapshotImageUrl ?? null,
    captured_at: obs.capturedAt,
    events: obs.events ?? null,
    content_hash: contentHash,
    snapshot_sha256: obs.snapshotSha256 ?? null,
    snapshot_phash: obs.snapshotPhash ?? null,
    snapshot_bytes: obs.snapshotBytes ?? null,
    snapshot_content_type: obs.snapshotContentType ?? null,
    capture_conditions: obs.captureConditions ?? null,
    verify_token: verifyToken,
    updated_at: new Date().toISOString(),
  };

  const { error: insErr } = await supabase.from("observations").insert(payload);
  if (insErr) {
    const pgErr = insErr as PostgrestError;
    console.error("[observations] failed to insert", pgErr);
  } else {
    await markVerifyLoopFirstObservation({ userId: user.id, observationId: obs.id });
  }

  // Clear legacy cookie if present
  await writeUserObservations([]);
  return { ok: true };
}

export async function getMergedObservationsSorted(): Promise<Observation[]> {
  const user = await readUserObservations();
  return sortByCapturedAtDesc(user);
}

/** 一覧・CSV用。スクリーンショット期限後もメタデータ行は残す */
export async function getMergedObservationsForPlan(_planId: PlanId): Promise<Observation[]> {
  return getMergedObservationsSorted();
}

export async function getObservationMerged(id: string): Promise<Observation | undefined> {
  const needle = sanitizeObservationRouteId(id);
  const user = await readUserObservations();
  return user.find((o) => o.id === needle);
}

/**
 * 記録詳細・レポート・メール直リンク用。
 * スクリーンショット期限後も DB に行があれば返す。画像表示は呼び出し側で `visibleSnapshotImageUrl`。
 */
export async function getObservationMergedForPlan(
  id: string,
  planId: PlanId,
): Promise<Observation | undefined> {
  /** メール直リンクは一覧 200 件外でも DB の id があれば表示するため、単体 SELECT を先に試す */
  const obs =
    (await fetchObservationByIdForCurrentUser(id, planId)) ??
    (await getObservationMerged(id));
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
