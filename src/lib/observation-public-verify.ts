import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ObservationStatus } from "@/lib/demo/observations";
import { sanitizeVerifyTokenParam } from "@/lib/observation-verify-token";

export type PublicVerifyObservation = {
  id: string;
  url: string;
  capturedAt: string;
  regionLabel: string;
  status: ObservationStatus;
  snapshotImageUrl?: string;
  snapshotSha256?: string;
  contentHash?: string;
};

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
      "id,url,region_label,status,captured_at,snapshot_image_url,snapshot_sha256,content_hash",
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

  const snapshotImageUrl =
    typeof row.snapshot_image_url === "string" && /^https?:\/\//i.test(row.snapshot_image_url)
      ? row.snapshot_image_url
      : undefined;

  return {
    id: String(row.id),
    url: typeof row.url === "string" ? row.url : "",
    capturedAt: typeof row.captured_at === "string" ? row.captured_at : "",
    regionLabel:
      typeof row.region_label === "string" && row.region_label.trim()
        ? row.region_label.trim()
        : "—",
    status,
    snapshotImageUrl,
    snapshotSha256,
    contentHash,
  };
}
