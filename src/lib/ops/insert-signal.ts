import { createClient } from "@supabase/supabase-js";
import { normalizeSupabaseUrl } from "@/lib/supabase/url";

export type OpsSignalType =
  | "server_error"
  | "auth_failure"
  | "suspicious_request"
  | "ops_cron_heartbeat";

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

  const { error } = await admin.from("ops_monitoring_events").insert({
    signal_type: signalType,
    payload,
  });
  if (error) {
    console.warn("[ops] insertOpsSignal failed", { signalType, message: error.message });
  }
}
