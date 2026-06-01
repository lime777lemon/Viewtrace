import type { SupabaseClient } from "@supabase/supabase-js";
import { appendAuditEvent, AUDIT_ACTION } from "@/lib/audit-log";
import type { Observation } from "@/lib/demo/observations";
import {
  computeObservationContentHashFromDbRow,
  OBSERVATION_CONTENT_HASH_VERSION,
  verifyObservationStoredHashFromDbRow,
  type ObservationContentIntegrity,
} from "@/lib/observation-content-hash";

const HASH_ROW_SELECT =
  "id,url,region,region_label,status,note,page_title,snapshot_image_url,captured_at,events,content_hash" as const;

export type ReconcileContentHashResult = {
  obs: Observation;
  integrity: ObservationContentIntegrity;
};

/**
 * 詳細・レポート表示時に DB 行から content_hash を検証し、欠落・不一致なら
 * 現在の DB カラム値に合わせて更新する（UI 用 regionLabel フォールバックは使わない）。
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
    console.warn("[observation-content-hash-repair] fetch failed", fetchError?.message);
    return { obs, integrity: obs.contentHash?.trim() ? "ok" : "missing" };
  }

  const dbRow = row as Record<string, unknown>;
  const integrity = verifyObservationStoredHashFromDbRow(dbRow);
  if (integrity === "ok") {
    const stored =
      typeof dbRow.content_hash === "string" ? dbRow.content_hash.toLowerCase() : obs.contentHash;
    return { obs: { ...obs, contentHash: stored ?? obs.contentHash }, integrity: "ok" };
  }

  const recomputed = computeObservationContentHashFromDbRow(dbRow).toLowerCase();
  const stored = typeof dbRow.content_hash === "string" ? dbRow.content_hash.trim().toLowerCase() : "";

  const { error: updateError } = await supabase
    .from("observations")
    .update({
      content_hash: recomputed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", obs.id)
    .eq("user_id", user.id);

  if (updateError) {
    console.warn("[observation-content-hash-repair] update failed", updateError.code, updateError.message);
    return { obs, integrity };
  }

  const reason = integrity === "missing" ? "content_hash_backfill" : "content_hash_repaired";

  await appendAuditEvent(supabase, {
    scope: "observation",
    action: AUDIT_ACTION.OBSERVATION_CONTENT_HASH_SYNC,
    observationId: obs.id,
    meta: {
      reason,
      hash_version: OBSERVATION_CONTENT_HASH_VERSION,
      ...(stored ? { previous_hash_prefix: stored.slice(0, 12) } : {}),
      new_hash_prefix: recomputed.slice(0, 12),
    },
  });

  return { obs: { ...obs, contentHash: recomputed }, integrity: "ok" };
}
