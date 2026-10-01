import type { Observation } from "@/lib/demo/observations";
import { parseCaptureConditionsFromDb } from "@/lib/capture-conditions";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  observationUrlIdentity,
  observationUrlLookupVariants,
} from "@/lib/observation-compare";

export type ObservationCompareTarget = {
  id: string;
  capturedAt: string;
  snapshotImageUrl: string;
};

/** 同一 URL 識別子・地域の、指定時刻より前で最も新しいスナップショット付き記録 */
export async function findPreviousObservationWithSnapshot(
  supabase: SupabaseClient,
  params: {
    userId: string;
    url: string;
    region: string;
    beforeCapturedAt: string;
    excludeId: string;
  },
): Promise<ObservationCompareTarget | null> {
  const identity = observationUrlIdentity(params.url);
  const variants = observationUrlLookupVariants(params.url);
  if (variants.length === 0) return null;

  const { data, error } = await supabase
    .from("observations")
    .select("id,captured_at,snapshot_image_url,url")
    .eq("user_id", params.userId)
    .in("url", variants)
    .eq("region", params.region)
    .neq("id", params.excludeId)
    .not("snapshot_image_url", "is", null)
    .is("snapshot_purged_at", null)
    .lt("captured_at", params.beforeCapturedAt)
    .order("captured_at", { ascending: false })
    .limit(12);

  if (error || !data?.length) return null;

  const row = data.find((item) => {
    const url = typeof item.url === "string" ? item.url : "";
    return identity ? observationUrlIdentity(url) === identity : url.trim() === params.url.trim();
  });
  if (!row) return null;

  const snapshotImageUrl =
    typeof row.snapshot_image_url === "string" ? row.snapshot_image_url.trim() : "";
  const capturedAt = typeof row.captured_at === "string" ? row.captured_at : "";
  const id = typeof row.id === "string" ? row.id : "";

  if (!id || !capturedAt || !snapshotImageUrl) return null;

  return { id, capturedAt, snapshotImageUrl };
}

const PREVIOUS_COMPARE_SELECT =
  "id,url,region,region_label,status,captured_at,snapshot_image_url,snapshot_sha256,snapshot_phash,snapshot_purged_at,capture_conditions" as const;

function mapPreviousRowToObservation(row: Record<string, unknown>): Observation | null {
  const id = typeof row.id === "string" ? row.id : "";
  const url = typeof row.url === "string" ? row.url : "";
  const capturedAt = typeof row.captured_at === "string" ? row.captured_at : "";
  if (!id || !url || !capturedAt) return null;
  const regionValue = typeof row.region === "string" ? row.region : "";
  const regionLabel =
    typeof row.region_label === "string" && row.region_label.trim()
      ? row.region_label.trim()
      : regionValue || "—";
  const statusRaw = typeof row.status === "string" ? row.status : "success";
  const status =
    statusRaw === "success" || statusRaw === "failure" || statusRaw === "pending" ? statusRaw : "success";
  const snapshotSha256 =
    typeof row.snapshot_sha256 === "string" && row.snapshot_sha256.length === 64
      ? row.snapshot_sha256.toLowerCase()
      : undefined;
  const snapshotPhash =
    typeof row.snapshot_phash === "string" && /^[a-f0-9]{8,128}$/i.test(row.snapshot_phash)
      ? row.snapshot_phash.toLowerCase()
      : undefined;
  return {
    id,
    url,
    regionValue,
    regionLabel,
    capturedAt,
    status,
    snapshotImageUrl:
      typeof row.snapshot_image_url === "string" && row.snapshot_image_url.trim()
        ? row.snapshot_image_url.trim()
        : undefined,
    snapshotSha256,
    snapshotPhash,
    captureConditions: parseCaptureConditionsFromDb(row.capture_conditions),
    snapshotPurgedAt:
      typeof row.snapshot_purged_at === "string" && row.snapshot_purged_at.trim()
        ? row.snapshot_purged_at.trim()
        : undefined,
  };
}

/** Compare / Watch 共用。同じ URL 識別子 × 地域の直前の記録。 */
export async function findPreviousObservationForCompare(
  supabase: SupabaseClient,
  params: {
    userId: string;
    url: string;
    region: string;
    beforeCapturedAt: string;
    excludeId: string;
  },
): Promise<Observation | null> {
  const identity = observationUrlIdentity(params.url);
  const variants = observationUrlLookupVariants(params.url);
  if (variants.length === 0) return null;

  const { data, error } = await supabase
    .from("observations")
    .select(PREVIOUS_COMPARE_SELECT)
    .eq("user_id", params.userId)
    .in("url", variants)
    .eq("region", params.region)
    .neq("id", params.excludeId)
    .lt("captured_at", params.beforeCapturedAt)
    .order("captured_at", { ascending: false })
    .limit(12);

  if (error || !data?.length) return null;

  const row = data.find((item) => {
    const url = typeof item.url === "string" ? item.url : "";
    return identity ? observationUrlIdentity(url) === identity : url.trim() === params.url.trim();
  });
  if (!row) return null;
  return mapPreviousRowToObservation(row as Record<string, unknown>);
}
