import type { SupabaseClient } from "@supabase/supabase-js";
import type { Observation } from "@/lib/demo/observations";
import {
  listObservationsByIdsForOwner,
  listObservationsForUrlIdentityForOwner,
} from "@/lib/demo/user-observations";
import { loadMonitoringRunForObservation, type MonitoringRunLoaded } from "@/lib/monitoring-run-store";
import type { ObservationAiAudit } from "@/lib/observation-ai-audit";
import { loadObservationAiAudit } from "@/lib/observation-ai-audit-store";
import { buildObservationEvidencePack, type ObservationEvidencePack } from "@/lib/observation-evidence-json";
import {
  loadObservationFieldCwv,
  loadObservationLabCwv,
  loadObservationScrollInteraction,
  loadObservationScrollInteractionsByIds,
  loadObservationSubpageScores,
  loadObservationSyntheticInteraction,
  loadObservationSyntheticInteractionsByIds,
  type StoredFieldCwv,
  type StoredLabCwv,
  type StoredScrollInteraction,
  type StoredSyntheticInteraction,
} from "@/lib/observation-optional-metrics-store";
import type { RegionalInteractionCheckV1 } from "@/lib/observation-regional-interaction";
import type { SubpageScoresV1 } from "@/lib/observation-subpages";
import type { SyntheticInteractionV1 } from "@/lib/observation-synthetic-interaction";
import {
  findPreviousObservationForCompare,
  findPreviousObservationWithSnapshot,
  type ObservationCompareTarget,
} from "@/lib/observation-previous";
import {
  isObservationScreenshotExpired,
  visibleSnapshotImageUrl,
} from "@/lib/observation-screenshot-retention";
import { planAndRetentionForOwner } from "@/lib/observation-public-verify";
import { buildPublicVerifyUrl, sanitizeVerifyTokenParam } from "@/lib/observation-verify-token";
import type { PlanId } from "@/lib/plans";
import { getAppOriginForEmailLinks } from "@/lib/site";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * 公開 Evidence Report に、Observation 詳細と同じ内容を載せるための読み出し。
 * セッションなし・admin client。すべて所有者の `user_id` で絞る。
 * 何も再計測しない。保存済みの行だけを読む。
 */
export type EvidenceReportObservationDetailData = {
  obs: Observation;
  verifyUrl: string | null;
  screenshotExpired: boolean;
  storedVisibleImage: string | null;
  /** 同一 URL 識別子の記録（Region Compare 母集団）。 */
  compareRelated: Observation[];
  /** 同一 URL × 地域の記録（Time Compare 母集団）。 */
  compareSiblings: Observation[];
  previousRaw: ObservationCompareTarget | null;
  previousCapture: Observation | null;
  storedScroll: StoredScrollInteraction | null;
  previousStored: StoredScrollInteraction | null;
  storedSynthetic: StoredSyntheticInteraction | null;
  storedLabCwv: StoredLabCwv | null;
  storedFieldCwv: StoredFieldCwv | null;
  storedSubpages: SubpageScoresV1 | null;
  journeyPeers: Observation[];
  peerSynthetics: Map<string, SyntheticInteractionV1>;
  peerScrolls: Map<string, RegionalInteractionCheckV1>;
  aiAudit: ObservationAiAudit | null;
  checkRun: MonitoringRunLoaded | null;
  pack: ObservationEvidencePack;
};

export type EvidenceReportObservationDetailInput = {
  admin: SupabaseClient;
  userId: string;
  plan: PlanId;
  retentionDays: number;
  appOrigin: string;
  /** 週次レポートの行。`id` と `verifyToken` を使う。 */
  rows: Array<{ id: string; verifyToken?: string | null }>;
};

async function safe<T>(label: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.warn(`[evidence-report] ${label} failed`, {
      message: error instanceof Error ? error.message : "unknown",
    });
    return fallback;
  }
}

/** 同じ URL が週に何度も出るので、URL 識別子ごとの一覧は 1 回だけ読む。 */
function relatedLoader(admin: SupabaseClient, userId: string, plan: PlanId) {
  const cache = new Map<string, Promise<Observation[]>>();
  return (url: string): Promise<Observation[]> => {
    const key = url.trim();
    const hit = cache.get(key);
    if (hit) return hit;
    const next = safe(
      "related",
      () => listObservationsForUrlIdentityForOwner(admin, userId, key, plan),
      [] as Observation[],
    );
    cache.set(key, next);
    return next;
  };
}

async function loadOne(
  input: EvidenceReportObservationDetailInput,
  obs: Observation,
  verifyToken: string | null,
  loadRelated: (url: string) => Promise<Observation[]>,
): Promise<EvidenceReportObservationDetailData> {
  const { admin, userId, retentionDays, appOrigin } = input;
  const screenshotExpired = isObservationScreenshotExpired(obs, retentionDays);
  const storedVisibleImage = visibleSnapshotImageUrl(obs, retentionDays) ?? null;
  const verifyUrl = verifyToken ? buildPublicVerifyUrl(appOrigin, verifyToken) : null;
  const region = (obs.regionValue ?? "").trim();

  const compareRelated = obs.url && region ? await loadRelated(obs.url) : [obs];
  const compareSiblings = compareRelated.filter((row) => (row.regionValue ?? "").trim() === region);

  const previousParams =
    obs.url && region
      ? {
          userId,
          url: obs.url,
          region,
          beforeCapturedAt: obs.capturedAt,
          excludeId: obs.id,
        }
      : null;

  const [previousRaw, previousCapture, storedScroll, storedSynthetic, storedLabCwv, storedFieldCwv, storedSubpages, aiAudit, checkRun] =
    await Promise.all([
      previousParams && storedVisibleImage
        ? safe("previous_snapshot", () => findPreviousObservationWithSnapshot(admin, previousParams), null)
        : Promise.resolve(null),
      previousParams
        ? safe("previous_capture", () => findPreviousObservationForCompare(admin, previousParams), null)
        : Promise.resolve(null),
      safe("scroll", () => loadObservationScrollInteraction(admin, userId, obs.id), null),
      safe("synthetic", () => loadObservationSyntheticInteraction(admin, userId, obs.id), null),
      safe("lab_cwv", () => loadObservationLabCwv(admin, userId, obs.id), null),
      safe("field_cwv", () => loadObservationFieldCwv(admin, userId, obs.id), null),
      safe("subpages", () => loadObservationSubpageScores(admin, userId, obs.id), null),
      safe("ai_audit", () => loadObservationAiAudit(admin, userId, obs.id), null),
      safe("check_run", () => loadMonitoringRunForObservation(admin, userId, obs.id), null),
    ]);

  const previousCheckId = storedScroll?.behavior_diff?.previous_observation_id ?? null;
  const previousStored = previousCheckId
    ? await safe("previous_scroll", () => loadObservationScrollInteraction(admin, userId, previousCheckId), null)
    : null;

  const latestPeerByRegion = new Map<string, Observation>();
  for (const row of compareRelated) {
    if (row.id === obs.id) continue;
    const peerRegion = (row.regionValue ?? "").trim();
    if (!peerRegion || peerRegion === region) continue;
    const existing = latestPeerByRegion.get(peerRegion);
    if (!existing || Date.parse(row.capturedAt) > Date.parse(existing.capturedAt)) {
      latestPeerByRegion.set(peerRegion, row);
    }
  }
  const journeyPeers = [...latestPeerByRegion.values()].slice(0, 4);
  const peerIds = journeyPeers.map((row) => row.id);
  const [peerSynthetics, peerScrolls] = await Promise.all([
    safe(
      "peer_synthetics",
      () => loadObservationSyntheticInteractionsByIds(admin, userId, peerIds),
      new Map<string, SyntheticInteractionV1>(),
    ),
    safe(
      "peer_scrolls",
      () => loadObservationScrollInteractionsByIds(admin, userId, peerIds),
      new Map<string, RegionalInteractionCheckV1>(),
    ),
  ]);

  const pack = buildObservationEvidencePack({ obs, verifyUrl, hideSnapshotImage: screenshotExpired });

  return {
    obs,
    verifyUrl,
    screenshotExpired,
    storedVisibleImage,
    compareRelated,
    compareSiblings,
    previousRaw,
    previousCapture,
    storedScroll,
    previousStored,
    storedSynthetic,
    storedLabCwv,
    storedFieldCwv,
    storedSubpages,
    journeyPeers,
    peerSynthetics,
    peerScrolls,
    aiAudit,
    checkRun,
    pack,
  };
}

/**
 * 週次レポートの各 Observation について、詳細画面と同じ材料を揃える。
 * 行の順序（新しい順）は `rows` の順を保つ。DB に無い id は飛ばす。
 */
export async function loadEvidenceReportObservationDetails(
  input: EvidenceReportObservationDetailInput,
): Promise<EvidenceReportObservationDetailData[]> {
  const ids = input.rows.map((row) => row.id);
  const observations = await safe(
    "observations",
    () => listObservationsByIdsForOwner(input.admin, input.userId, ids, input.plan),
    [] as Observation[],
  );
  const byId = new Map(observations.map((obs) => [obs.id, obs]));
  const loadRelated = relatedLoader(input.admin, input.userId, input.plan);

  const out: EvidenceReportObservationDetailData[] = [];
  for (const row of input.rows) {
    const obs = byId.get(row.id);
    if (!obs) continue;
    out.push(await loadOne(input, obs, row.verifyToken ?? null, loadRelated));
  }
  return out;
}

/**
 * 公開 Verify（`/verify/[token]`）用。トークンから所有者の行だけを読み、詳細と同じ材料を返す。
 * 再計測はしない。トークンが無い・行が無いときは null。
 */
export async function loadEvidenceReportObservationDetailForVerifyToken(
  tokenRaw: string,
): Promise<EvidenceReportObservationDetailData | null> {
  const token = sanitizeVerifyTokenParam(tokenRaw);
  if (!token) return null;
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { data: row, error } = await admin
    .from("observations")
    .select("id,user_id")
    .eq("verify_token", token)
    .maybeSingle();
  if (error || !row) return null;
  const id = typeof (row as { id?: unknown }).id === "string" ? (row as { id: string }).id : "";
  const userId =
    typeof (row as { user_id?: unknown }).user_id === "string" ? (row as { user_id: string }).user_id : "";
  if (!id || !userId) return null;
  const owner = await planAndRetentionForOwner(admin, userId);
  const loaded = await loadEvidenceReportObservationDetails({
    admin,
    userId,
    plan: owner.plan,
    retentionDays: owner.retentionDays,
    appOrigin: getAppOriginForEmailLinks(),
    rows: [{ id, verifyToken: token }],
  });
  return loaded[0] ?? null;
}
