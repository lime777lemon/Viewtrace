import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const AUDIT_ACTION = {
  OBSERVATION_RECORD: "observation.record",
  /** content_hash を現在の行内容に合わせて更新（欠落埋め戻し or 不一致修復） */
  OBSERVATION_CONTENT_HASH_SYNC: "observation.content_hash_sync",
  OBSERVATIONS_EXPORT_CSV: "observations.export_csv",
  AUTH_SIGN_IN: "auth.sign_in",
  AUTH_SIGN_OUT: "auth.sign_out",
} as const;

/** crypto.randomUUID 等の標準 36 文字形式（大文字小文字可） */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isAuditObservationId(value: string): boolean {
  return UUID_RE.test(value.trim());
}

function stableMetaJson(meta: Record<string, unknown>): string {
  if (!meta || Object.keys(meta).length === 0) return "{}";
  const keys = Object.keys(meta).sort();
  const o: Record<string, unknown> = {};
  for (const k of keys) o[k] = meta[k];
  return JSON.stringify(o);
}

/** システムイベント（認証・CSV 等）— resource_type / resource_id は DB 上 NULL */
export type AppendAuditSystemEventInput = {
  scope: "system";
  action: string;
  meta?: Record<string, unknown>;
};

/** オブザベーションに紐づくイベント — resource_type = observation, resource_id = UUID 必須 */
export type AppendAuditObservationEventInput = {
  scope: "observation";
  action: string;
  observationId: string;
  meta?: Record<string, unknown>;
};

export type AppendAuditEventInput = AppendAuditSystemEventInput | AppendAuditObservationEventInput;

/**
 * ログイン済みセッション向けにアプリ内監査ログへ行を追記する。
 * 失敗してもユーザー操作は止めない（コンソールに警告）。
 *
 * DB 制約（移行適用後）: (resource_type, resource_id) は (NULL,NULL) または ('observation', uuid) のみ。
 */
export async function appendAuditEvent(supabase: SupabaseClient, input: AppendAuditEventInput): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return;

  let resourceType: string | null = null;
  let resourceId: string | null = null;
  if (input.scope === "observation") {
    const id = input.observationId.trim();
    if (!isAuditObservationId(id)) {
      console.warn("[audit] skip insert: invalid observation UUID", { action: input.action });
      return;
    }
    resourceType = "observation";
    resourceId = id;
  }

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
    resourceType ?? "",
    resourceId ?? "",
    createdAt,
    stableMetaJson(input.meta ?? {}),
  ].join("|");

  const chainHash = createHash("sha256").update(payload, "utf8").digest("hex");

  const { error } = await supabase.from("audit_events").insert({
    user_id: user.id,
    action: input.action,
    resource_type: resourceType,
    resource_id: resourceId,
    meta: input.meta ?? {},
    chain_hash: chainHash,
    created_at: createdAt,
  });

  if (error) {
    console.warn("[audit] insert failed", error.code, error.message);
  }
}
