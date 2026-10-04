import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CaptureConditionsV1 } from "@/lib/capture-conditions";
import { parseCaptureConditionsFromDb } from "@/lib/capture-conditions";
import type { ObservationStatus } from "@/lib/demo/observations";
import {
  isObservationScreenshotExpired,
  visibleSnapshotImageUrl,
} from "@/lib/observation-screenshot-retention";
import { getPlan, parsePlanId } from "@/lib/plans";
import { sanitizeVerifyTokenParam } from "@/lib/observation-verify-token";
import type { HtmlHeadSignalsV1 } from "@/lib/url-preview";
import type { ObservationAiAudit } from "@/lib/observation-ai-audit";
import { loadObservationAiAuditForPublicShare } from "@/lib/observation-ai-audit-store";

export type PublicVerifyObservation = {
  id: string;
  url: string;
  capturedAt: string;
  regionLabel: string;
  regionValue?: string;
  status: ObservationStatus;
  snapshotImageUrl?: string;
  snapshotSha256?: string;
  contentHash?: string;
  screenshotExpired: boolean;
  captureConditions: CaptureConditionsV1 | null;
  htmlSignals?: HtmlHeadSignalsV1;
  aiAudit: ObservationAiAudit | null;
};

async function retentionDaysForOwner(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  userId: string,
): Promise<number> {
  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    const raw = data.user?.user_metadata?.plan;
    if (typeof raw === "string") return getPlan(parsePlanId(raw)).retentionDays;
  } catch {
    /* fall through to users mirror */
  }
  const { data: row } = await admin.from("users").select("plan").eq("id", userId).maybeSingle();
  const planRaw = row && typeof row === "object" && "plan" in row ? row.plan : null;
  return getPlan(parsePlanId(typeof planRaw === "string" ? planRaw : null)).retentionDays;
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
    .select(
      "id,user_id,url,region,region_label,status,captured_at,snapshot_image_url,snapshot_sha256,content_hash,snapshot_purged_at,capture_conditions",
    )
    .eq("verify_token", token)
    .maybeSingle();

  if (error || !row) return null;

  const statusRaw = typeof row.status === "string" ? row.status : "pending";
  const status: ObservationStatus =
    statusRaw === "success" || statusRaw === "failure" || statusRaw === "pending"
      ? statusRaw
      : "pending";

  const snapshotSha256 =
    typeof row.snapshot_sha256 === "string" && row.snapshot_sha256.length === 64
      ? row.snapshot_sha256.toLowerCase()
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

  const userId = typeof row.user_id === "string" ? row.user_id : "";
  const retentionDays = userId ? await retentionDaysForOwner(admin, userId) : getPlan("starter").retentionDays;
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
    snapshotSha256,
    contentHash,
    screenshotExpired,
    captureConditions,
    htmlSignals: captureConditions?.html_signals,
    aiAudit: userId
      ? await loadObservationAiAuditForPublicShare(userId, String(row.id))
      : null,
  };
}
