import type { SupabaseClient } from "@supabase/supabase-js";

export type ObservationCompareTarget = {
  id: string;
  capturedAt: string;
  snapshotImageUrl: string;
};

/** 同一 URL・地域の、指定時刻より前で最も新しいスナップショット付き記録 */
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
  const { data, error } = await supabase
    .from("observations")
    .select("id,captured_at,snapshot_image_url")
    .eq("user_id", params.userId)
    .eq("url", params.url)
    .eq("region", params.region)
    .neq("id", params.excludeId)
    .not("snapshot_image_url", "is", null)
    .lt("captured_at", params.beforeCapturedAt)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const snapshotImageUrl =
    typeof data.snapshot_image_url === "string" ? data.snapshot_image_url.trim() : "";
  const capturedAt = typeof data.captured_at === "string" ? data.captured_at : "";
  const id = typeof data.id === "string" ? data.id : "";

  if (!id || !capturedAt || !snapshotImageUrl) return null;

  return { id, capturedAt, snapshotImageUrl };
}
