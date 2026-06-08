import type { SupabaseClient } from "@supabase/supabase-js";
import type { Observation } from "@/lib/demo/observations";
import {
  verifyObservationStoredHashFromDbRow,
  type ObservationContentIntegrity,
} from "@/lib/observation-content-hash";

const HASH_ROW_SELECT =
  "id,url,region,region_label,status,note,page_title,snapshot_image_url,captured_at,events,content_hash,snapshot_sha256,capture_conditions" as const;

export type ReconcileContentHashResult = {
  obs: Observation;
  integrity: ObservationContentIntegrity;
};

/**
 * 詳細・レポート表示時に DB 行から content_hash を検証する。
 * 欠落・不一致は表示のみ（自動修復・UPDATE は行わない。DB トリガーでも証跡ハッシュは固定）。
 */
export async function reconcileObservationContentHashIfNeeded(
  supabase: SupabaseClient,
  obs: Observation,
): Promise<ReconcileContentHashResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return { obs, integrity: obs.contentHash?.trim() ? "ok" : "missing" };
  }

  const { data: row, error: fetchError } = await supabase
    .from("observations")
    .select(HASH_ROW_SELECT)
    .eq("id", obs.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !row) {
    console.warn("[observation-content-hash] verify fetch failed", fetchError?.message);
    return { obs, integrity: obs.contentHash?.trim() ? "ok" : "missing" };
  }

  const dbRow = row as Record<string, unknown>;
  const integrity = verifyObservationStoredHashFromDbRow(dbRow);
  const stored =
    typeof dbRow.content_hash === "string" ? dbRow.content_hash.toLowerCase() : obs.contentHash;

  return {
    obs: { ...obs, contentHash: stored ?? obs.contentHash },
    integrity,
  };
}
