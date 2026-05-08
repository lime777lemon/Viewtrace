import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const AUDIT_ACTION = {
  OBSERVATION_RECORD: "observation.record",
  OBSERVATIONS_EXPORT_CSV: "observations.export_csv",
  AUTH_SIGN_IN: "auth.sign_in",
  AUTH_SIGN_OUT: "auth.sign_out",
} as const;

function stableMetaJson(meta: Record<string, unknown>): string {
  if (!meta || Object.keys(meta).length === 0) return "{}";
  const keys = Object.keys(meta).sort();
  const o: Record<string, unknown> = {};
  for (const k of keys) o[k] = meta[k];
  return JSON.stringify(o);
}

/**
 * ログイン済みセッション向けにアプリ内監査ログへ行を追記する。
 * 失敗してもユーザー操作は止めない（コンソールに警告）。
 */
export async function appendAuditEvent(
  supabase: SupabaseClient,
  input: {
    action: string;
    resourceType?: string | null;
    resourceId?: string | null;
    meta?: Record<string, unknown>;
  },
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return;

  const { data: lastRow } = await supabase
    .from("audit_events")
    .select("chain_hash")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prev = typeof lastRow?.chain_hash === "string" ? lastRow.chain_hash : "";
  const createdAt = new Date().toISOString();
  const payload = [
    prev,
    user.id,
    input.action,
    input.resourceType ?? "",
    input.resourceId ?? "",
    createdAt,
    stableMetaJson(input.meta ?? {}),
  ].join("|");

  const chainHash = createHash("sha256").update(payload, "utf8").digest("hex");

  const { error } = await supabase.from("audit_events").insert({
    user_id: user.id,
    action: input.action,
    resource_type: input.resourceType ?? null,
    resource_id: input.resourceId ?? null,
    meta: input.meta ?? {},
    chain_hash: chainHash,
    created_at: createdAt,
  });

  if (error) {
    console.warn("[audit] insert failed", error.code, error.message);
  }
}
