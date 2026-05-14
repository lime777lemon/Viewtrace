import { siteEmail } from "@/lib/site";

export function isOpsMonitoringDisabled(): boolean {
  return process.env.OPS_MONITORING_DISABLED === "1";
}

export function getOpsAlertRecipients(): string[] {
  const multi = process.env.OPS_ALERT_EMAILS?.trim();
  if (multi) {
    return multi
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const single = process.env.OPS_ALERT_EMAIL?.trim();
  if (single) return [single];
  return [siteEmail];
}

export function getOpsSignalRouteSecret(): string | null {
  return (
    process.env.OPS_SIGNAL_ROUTE_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    null
  );
}

function numEnv(name: string, fallback: number): number {
  const v = process.env[name]?.trim();
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function getOpsThresholds() {
  return {
    /** Absolute active connection count (pg_stat_activity, this database) */
    dbConnectionsWarn: numEnv("OPS_DB_CONN_WARN", 35),
    dbConnectionsCritical: numEnv("OPS_DB_CONN_CRITICAL", 70),
    /** Growth vs previous cron sample (0.2 = 20%) */
    dbStorageGrowthRatio: numEnv("OPS_STORAGE_GROWTH_RATIO", 0.2),
    /** Minimum prior bytes before growth ratio applies */
    minPriorDbBytes: numEnv("OPS_MIN_PRIOR_DB_BYTES", 50_000_000),
    /** server_error signals in rolling window */
    serverErrorWindowMinutes: numEnv("OPS_SERVER_ERROR_WINDOW_MINUTES", 60),
    serverErrorCountWarn: numEnv("OPS_SERVER_ERROR_COUNT_WARN", 20),
    /** auth_failure signals */
    authFailureWindowMinutes: numEnv("OPS_AUTH_FAIL_WINDOW_MINUTES", 15),
    authFailureCountWarn: numEnv("OPS_AUTH_FAIL_COUNT_WARN", 25),
    /** suspicious_request signals */
    suspiciousWindowMinutes: numEnv("OPS_SUSPICIOUS_WINDOW_MINUTES", 15),
    suspiciousCountWarn: numEnv("OPS_SUSPICIOUS_COUNT_WARN", 8),
    /** Self health fetch */
    selfLatencyWarnMs: numEnv("OPS_SELF_LATENCY_WARN_MS", 4000),
    /** Cooldown per alert_key (minutes) */
    alertCooldownMinutes: numEnv("OPS_ALERT_COOLDOWN_MINUTES", 45),
  };
}
