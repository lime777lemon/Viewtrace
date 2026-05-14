import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runSql } from "@/lib/db/sql";
import { sendResendEmail, isResendConfigured } from "@/lib/resend";
import { siteOrigin } from "@/lib/site";
import {
  getOpsAlertRecipients,
  getOpsThresholds,
  isOpsMonitoringDisabled,
} from "@/lib/ops/alert-config";

type DbMetrics = { activeConnections: number | null; dbBytes: bigint | null };

async function readDbMetrics(): Promise<DbMetrics> {
  const res = await runSql(`
    SELECT
      (SELECT count(*)::int
         FROM pg_stat_activity
        WHERE datname = current_database()
          AND state = 'active') AS active_connections,
      (SELECT pg_database_size(current_database())::bigint) AS db_bytes
  `);
  if (!res.ok || res.rows.length === 0) {
    return { activeConnections: null, dbBytes: null };
  }
  const row = res.rows[0] as Record<string, unknown>;
  const ac = row.active_connections;
  const db = row.db_bytes;
  return {
    activeConnections: typeof ac === "number" ? ac : null,
    dbBytes: typeof db === "number" || typeof db === "bigint" ? BigInt(String(db)) : null,
  };
}

async function measureSelfLatencyMs(): Promise<{ ms: number; ok: boolean; status: number }> {
  const origin = siteOrigin;
  const t0 = Date.now();
  try {
    const r = await fetch(`${origin}/api/health`, {
      method: "GET",
      headers: { "user-agent": "ViewtraceOpsCron/1.0" },
      cache: "no-store",
    });
    return { ms: Date.now() - t0, ok: r.ok, status: r.status };
  } catch {
    return { ms: Date.now() - t0, ok: false, status: 0 };
  }
}

async function countSignals(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  signalType: string,
  windowMinutes: number,
): Promise<number> {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { count, error } = await admin
    .from("ops_monitoring_events")
    .select("id", { count: "exact", head: true })
    .eq("signal_type", signalType)
    .gte("created_at", since);
  if (error) {
    console.warn("[ops] countSignals failed", signalType, error.message);
    return 0;
  }
  return count ?? 0;
}

async function shouldSendDedupe(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  alertKey: string,
  cooldownMinutes: number,
): Promise<boolean> {
  const { data, error } = await admin
    .from("ops_alert_dedupe")
    .select("last_sent_at")
    .eq("alert_key", alertKey)
    .maybeSingle();
  if (error) {
    console.warn("[ops] dedupe read failed", error.message);
    return true;
  }
  if (!data?.last_sent_at) return true;
  const elapsed = Date.now() - new Date(data.last_sent_at as string).getTime();
  return elapsed > cooldownMinutes * 60_000;
}

async function markDedupe(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  alertKey: string,
): Promise<void> {
  await admin.from("ops_alert_dedupe").upsert({
    alert_key: alertKey,
    last_sent_at: new Date().toISOString(),
  });
}

type BaselineRow = {
  last_db_connections: number | null;
  last_db_size_bytes: string | number | null;
  last_self_latency_ms: number | null;
};

async function readBaseline(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
): Promise<BaselineRow | null> {
  const { data, error } = await admin.from("ops_monitoring_baseline").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return null;
  return data as BaselineRow;
}

async function writeBaseline(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  patch: {
    last_db_connections: number | null;
    last_db_size_bytes: bigint | null;
    last_self_latency_ms: number | null;
  },
): Promise<void> {
  await admin.from("ops_monitoring_baseline").upsert({
    id: 1,
    last_db_connections: patch.last_db_connections,
    last_db_size_bytes:
      patch.last_db_size_bytes === null ? null : patch.last_db_size_bytes.toString(),
    last_self_latency_ms: patch.last_self_latency_ms,
    updated_at: new Date().toISOString(),
  });
}

export type OpsMonitoringRunResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  emailSent?: boolean;
  lines?: string[];
};

/**
 * Cron entry: sample DB/storage/latency, roll up recent signals, email when thresholds breach (deduped).
 */
export async function runOpsMonitoringCheck(): Promise<OpsMonitoringRunResult> {
  if (isOpsMonitoringDisabled()) {
    return { ok: true, skipped: true, reason: "disabled" };
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return { ok: false, reason: "supabase_admin_missing" };
  }

  const t = getOpsThresholds();
  const issues: { key: string; line: string }[] = [];

  const dbMetrics = await readDbMetrics();
  const latency = await measureSelfLatencyMs();

  const serverErrCount = await countSignals(admin, "server_error", t.serverErrorWindowMinutes);
  const authFailCount = await countSignals(admin, "auth_failure", t.authFailureWindowMinutes);
  const suspiciousCount = await countSignals(admin, "suspicious_request", t.suspiciousWindowMinutes);

  const baseline = await readBaseline(admin);

  if (dbMetrics.activeConnections != null) {
    if (dbMetrics.activeConnections >= t.dbConnectionsCritical) {
      issues.push({
        key: "db_connections_critical",
        line: `DB active connections (critical): ${dbMetrics.activeConnections} (threshold ${t.dbConnectionsCritical})`,
      });
    } else if (dbMetrics.activeConnections >= t.dbConnectionsWarn) {
      issues.push({
        key: "db_connections_warn",
        line: `DB active connections (warn): ${dbMetrics.activeConnections} (threshold ${t.dbConnectionsWarn})`,
      });
    }
  }

  if (dbMetrics.dbBytes != null && baseline?.last_db_size_bytes != null) {
    const prior = BigInt(String(baseline.last_db_size_bytes));
    if (prior >= BigInt(t.minPriorDbBytes)) {
      const growth = Number(dbMetrics.dbBytes - prior) / Number(prior);
      if (growth >= t.dbStorageGrowthRatio) {
        issues.push({
          key: "db_storage_growth",
          line: `DB storage grew ~${(growth * 100).toFixed(1)}% since last sample (now ${dbMetrics.dbBytes} bytes, was ${prior})`,
        });
      }
    }
  }

  if (latency.ms >= t.selfLatencyWarnMs || !latency.ok) {
    issues.push({
      key: "api_self_latency",
      line: `Health endpoint latency / status: ${latency.ms}ms, ok=${latency.ok}, http=${latency.status}`,
    });
  }

  if (serverErrCount >= t.serverErrorCountWarn) {
    issues.push({
      key: "error_rate_server",
      line: `Server-side errors (instrumentation): ${serverErrCount} in last ${t.serverErrorWindowMinutes}m (threshold ${t.serverErrorCountWarn})`,
    });
  }

  if (authFailCount >= t.authFailureCountWarn) {
    issues.push({
      key: "auth_failures",
      line: `Failed login attempts (recorded): ${authFailCount} in last ${t.authFailureWindowMinutes}m (threshold ${t.authFailureCountWarn})`,
    });
  }

  if (suspiciousCount >= t.suspiciousCountWarn) {
    issues.push({
      key: "suspicious_requests",
      line: `Suspicious URL patterns hit: ${suspiciousCount} in last ${t.suspiciousWindowMinutes}m (threshold ${t.suspiciousCountWarn})`,
    });
  }

  await writeBaseline(admin, {
    last_db_connections: dbMetrics.activeConnections,
    last_db_size_bytes: dbMetrics.dbBytes,
    last_self_latency_ms: latency.ms,
  });

  const toSend: { key: string; line: string }[] = [];
  for (const issue of issues) {
    if (await shouldSendDedupe(admin, issue.key, t.alertCooldownMinutes)) {
      toSend.push(issue);
    }
  }

  if (toSend.length === 0) {
    return {
      ok: true,
      emailSent: false,
      lines: issues.length ? issues.map((i) => i.line) : ["no breaches beyond dedupe"],
    };
  }

  if (!isResendConfigured()) {
    console.warn("[ops] alerts pending but RESEND_API_KEY not set", toSend);
    return { ok: true, emailSent: false, reason: "resend_not_configured", lines: toSend.map((i) => i.line) };
  }

  const bodyLines = [
    "Viewtrace ops monitoring detected one or more conditions worth reviewing.",
    "",
    ...toSend.map((i) => `- ${i.line}`),
    "",
    `Sample time (UTC): ${new Date().toISOString()}`,
    `Health check: ${siteOrigin}/api/health`,
    "",
    "Tune thresholds via OPS_* env vars. Disable with OPS_MONITORING_DISABLED=1.",
  ];

  const recipients = getOpsAlertRecipients();
  const res = await sendResendEmail({
    to: recipients,
    subject: `[Viewtrace Ops] ${toSend.length} alert(s): ${toSend.map((i) => i.key).join(", ")}`,
    text: bodyLines.join("\n"),
  });

  if (!res.ok) {
    console.error("[ops] email send failed", res.error);
    return { ok: false, reason: res.error, lines: toSend.map((i) => i.line) };
  }

  for (const issue of toSend) {
    await markDedupe(admin, issue.key);
  }

  return { ok: true, emailSent: true, lines: toSend.map((i) => i.line) };
}
