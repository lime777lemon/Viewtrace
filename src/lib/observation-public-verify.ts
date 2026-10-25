import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CaptureConditionsV1 } from "@/lib/capture-conditions";
import { parseCaptureConditionsFromDb } from "@/lib/capture-conditions";
import type { ObservationStatus } from "@/lib/demo/observations";
import {
  isObservationScreenshotExpired,
  visibleSnapshotImageUrl,
} from "@/lib/observation-screenshot-retention";
import { getPlan, parsePlanId, type PlanId } from "@/lib/plans";
import {
  planIdFromUserRow,
  screenshotRetentionDaysFromStored,
} from "@/lib/screenshot-retention-store";
import { sanitizeVerifyTokenParam } from "@/lib/observation-verify-token";
import type { HtmlHeadSignalsV1 } from "@/lib/url-preview";
import type { ObservationAiAudit } from "@/lib/observation-ai-audit";
import { loadObservationAiAuditForPublicShare } from "@/lib/observation-ai-audit-store";

export const PUBLIC_OBSERVATION_ROW_SELECT =
  "id,user_id,url,region,region_label,status,captured_at,snapshot_image_url,snapshot_sha256,snapshot_phash,snapshot_content_type,content_hash,snapshot_purged_at,capture_conditions" as const;

export type PublicVerifyObservation = {
  id: string;
  url: string;
  capturedAt: string;
  regionLabel: string;
  regionValue?: string;
  status: ObservationStatus;
  snapshotImageUrl?: string;
  snapshotContentType?: string;
  snapshotSha256?: string;
  snapshotPhash?: string;
  snapshotPurgedAt?: string;
  contentHash?: string;
  screenshotExpired: boolean;
  captureConditions: CaptureConditionsV1 | null;
  htmlSignals?: HtmlHeadSignalsV1;
  aiAudit: ObservationAiAudit | null;
};

export function mapObservationRowToPublicVerify(
  row: Record<string, unknown>,
  retentionDays: number,
): Omit<PublicVerifyObservation, "aiAudit"> & { ownerUserId: string } {
  const statusRaw = typeof row.status === "string" ? row.status : "pending";
  const status: ObservationStatus =
    statusRaw === "success" || statusRaw === "failure" || statusRaw === "pending"
      ? statusRaw
      : "pending";

  const snapshotSha256 =
    typeof row.snapshot_sha256 === "string" && row.snapshot_sha256.length === 64
      ? row.snapshot_sha256.toLowerCase()
      : undefined;

  const snapshotPhash =
    typeof row.snapshot_phash === "string" && row.snapshot_phash.trim()
      ? row.snapshot_phash.trim().toLowerCase()
      : undefined;

  const contentHash =
    typeof row.content_hash === "string" && row.content_hash.length === 64
      ? row.content_hash.toLowerCase()
      : undefined;

  const capturedAt = typeof row.captured_at === "string" ? row.captured_at : "";
  const storedUrl =
    typeof row.snapshot_image_url === "string" && /^https?:\/\//i.test(row.snapshot_image_url)
      ? row.snapshot_image_url
      : undefined;
  const snapshotPurgedAt =
    typeof row.snapshot_purged_at === "string" ? row.snapshot_purged_at : undefined;

  const ownerUserId = typeof row.user_id === "string" ? row.user_id : "";
  const screenshotExpired = isObservationScreenshotExpired(
    { capturedAt, snapshotPurgedAt },
    retentionDays,
  );
  const snapshotImageUrl = visibleSnapshotImageUrl(
    { capturedAt, snapshotImageUrl: storedUrl, snapshotPurgedAt },
    retentionDays,
  );

  const captureConditions = parseCaptureConditionsFromDb(row.capture_conditions);

  return {
    ownerUserId,
    id: String(row.id),
    url: typeof row.url === "string" ? row.url : "",
    capturedAt,
    regionLabel:
      typeof row.region_label === "string" && row.region_label.trim()
        ? row.region_label.trim()
        : "—",
    regionValue: typeof row.region === "string" && row.region.trim() ? row.region.trim() : undefined,
    status,
    snapshotImageUrl,
    snapshotContentType:
      typeof row.snapshot_content_type === "string" && row.snapshot_content_type.trim()
        ? row.snapshot_content_type.trim()
        : undefined,
    snapshotSha256,
    snapshotPhash,
    snapshotPurgedAt,
    contentHash,
    screenshotExpired,
    captureConditions,
    htmlSignals: captureConditions?.html_signals,
  };
}

/** 所有者のプランと保存日数（公開ページ用。セッションなし）。 */
export async function planAndRetentionForOwner(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  userId: string,
): Promise<{ plan: PlanId; retentionDays: number }> {
  const { data: row } = await admin
    .from("users")
    .select("plan, screenshot_retention_days")
    .eq("id", userId)
    .maybeSingle();
  let plan = planIdFromUserRow(row && typeof row === "object" && "plan" in row ? row.plan : null);
  const stored =
    row && typeof row === "object" && "screenshot_retention_days" in row
      ? row.screenshot_retention_days
      : null;
  if (typeof stored === "number" && stored > 0) {
    return { plan, retentionDays: screenshotRetentionDaysFromStored(stored, plan) };
  }
  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    const raw = data.user?.user_metadata?.plan;
    if (typeof raw === "string") {
      plan = parsePlanId(raw);
      return { plan, retentionDays: getPlan(plan).retentionDays };
    }
  } catch {
    /* stored plan is enough */
  }
  return { plan, retentionDays: screenshotRetentionDaysFromStored(stored, plan) };
}

export async function retentionDaysForOwner(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  userId: string,
): Promise<number> {
  return (await planAndRetentionForOwner(admin, userId)).retentionDays;
}

export async function fetchObservationForPublicVerify(
  tokenRaw: string,
): Promise<PublicVerifyObservation | null> {
  const token = sanitizeVerifyTokenParam(tokenRaw);
  if (!token) return null;

  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const { data: row, error } = await admin
    .from("observations")
    .select(PUBLIC_OBSERVATION_ROW_SELECT)
    .eq("verify_token", token)
    .maybeSingle();

  if (error || !row) return null;

  const ownerId =
    typeof (row as { user_id?: unknown }).user_id === "string"
      ? String((row as { user_id: string }).user_id)
      : "";
  const retentionDays = ownerId
    ? await retentionDaysForOwner(admin, ownerId)
    : getPlan("starter").retentionDays;

  const mapped = mapObservationRowToPublicVerify(row as Record<string, unknown>, retentionDays);

  const { ownerUserId, ...publicRow } = mapped;
  return {
    ...publicRow,
    aiAudit: ownerUserId
      ? await loadObservationAiAuditForPublicShare(ownerUserId, mapped.id)
      : null,
  };
}
