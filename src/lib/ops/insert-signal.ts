import { createClient } from "@supabase/supabase-js";
import { normalizeSupabaseUrl } from "@/lib/supabase/url";

export type OpsSignalType =
  | "server_error"
  | "auth_failure"
  | "suspicious_request"
  | "ops_cron_heartbeat";

function isTransientFetchFailure(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("fetch failed") ||
    m.includes("econnreset") ||
    m.includes("etimedout") ||
    m.includes("socket") ||
    m.includes("network")
  );
}

/**
 * 認証失敗などの運用シグナルを `ops_monitoring_events` に書く。
 * 本体処理（ログイン等）は止めない。ネットワーク一過性は 1 回だけ再試行する。
 */
export async function insertOpsSignal(
  signalType: OpsSignalType,
  payload: Record<string, unknown>,
): Promise<void> {
  if (process.env.OPS_MONITORING_DISABLED === "1") return;

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!rawUrl || !serviceRole) return;

  const url = normalizeSupabaseUrl(rawUrl);
  const admin = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const write = () =>
    admin.from("ops_monitoring_events").insert({
      signal_type: signalType,
      payload,
    });

  try {
    let { error } = await write();
    if (error && isTransientFetchFailure(error.message)) {
      ({ error } = await write());
    }
    if (error) {
      console.warn("[ops] insertOpsSignal failed", {
        signalType,
        message: error.message,
        hint: "telemetry only; auth flow is unaffected",
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.warn("[ops] insertOpsSignal threw", {
      signalType,
      message,
      hint: "telemetry only; auth flow is unaffected",
    });
  }
}
