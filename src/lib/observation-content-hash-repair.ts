import type { SupabaseClient } from "@supabase/supabase-js";
import { appendAuditEvent, AUDIT_ACTION } from "@/lib/audit-log";
import type { Observation } from "@/lib/demo/observations";
import {
  computeObservationContentHash,
  OBSERVATION_CONTENT_HASH_VERSION,
  verifyObservationStoredHash,
} from "@/lib/observation-content-hash";

/**
 * 一覧・詳細で読み込んだオブザベーションについて、保存されている content_hash を
 * 現在の行から再計算した値へ揃える（欠落の埋め戻し・表示経路とのズレの修復）。
 * いまの DB 上のフィールドを正とする自己整合処理であり、第三者改ざん検知の代替ではない。
 */
export async function reconcileObservationContentHashIfNeeded(
  supabase: SupabaseClient,
  obs: Observation,
): Promise<Observation> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return obs;

  const integrity = verifyObservationStoredHash(obs);
  if (integrity === "ok") return obs;

  const recomputed = computeObservationContentHash(obs).toLowerCase();
  const stored = obs.contentHash?.trim().toLowerCase() ?? "";

  if (integrity === "mismatch" && recomputed === stored) return obs;

  const { error } = await supabase
    .from("observations")
    .update({
      content_hash: recomputed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", obs.id)
    .eq("user_id", user.id);

  if (error) {
    console.warn("[observation-content-hash-repair] update failed", error.code, error.message);
    return obs;
  }

  const reason = integrity === "missing" ? "content_hash_backfill" : "content_hash_repaired";

  await appendAuditEvent(supabase, {
    action: AUDIT_ACTION.OBSERVATION_CONTENT_HASH_SYNC,
    resourceType: "observation",
    resourceId: obs.id,
    meta: {
      reason,
      hash_version: OBSERVATION_CONTENT_HASH_VERSION,
      ...(stored ? { previous_hash_prefix: stored.slice(0, 12) } : {}),
      new_hash_prefix: recomputed.slice(0, 12),
    },
  });

  return { ...obs, contentHash: recomputed };
}
