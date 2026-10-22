import { readFileSync } from "node:fs";
import WebSocket from "ws";
import { disableJourneyMonitoring, runDueMonitoringWatches } from "../src/lib/monitoring-watch-store";
import { countMeteredChecksThisUtcMonth } from "../src/lib/monitoring-run-store";
import { remainingObservations, utcMonthStartIso } from "../src/lib/observation-quota";
import { getPlan, parsePlanId } from "../src/lib/plans";
import { createSupabaseAdminClient } from "../src/lib/supabase/admin";

function loadEnvLocal() {
  let text = "";
  try {
    text = readFileSync(".env.local", "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = value;
  }
}

loadEnvLocal();
if (!globalThis.WebSocket) globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;

const JOURNEY_ID = "3334a3ef-eb50-4340-9e6a-c71b2565b80d";

async function main() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("admin");
  const journey = await supabase.from("journey_definitions").select("user_id, watch_enabled").eq("id", JOURNEY_ID).maybeSingle();
  const userId = journey.data && typeof (journey.data as { user_id?: unknown }).user_id === "string"
    ? String((journey.data as { user_id: string }).user_id)
    : "";
  if (!userId) throw new Error("owner_missing");
  if ((journey.data as { watch_enabled?: boolean }).watch_enabled === true) throw new Error("journey_watch_already_on");
  const user = await supabase.from("users").select("plan").eq("id", userId).maybeSingle();
  const plan = getPlan(parsePlanId(typeof (user.data as { plan?: unknown } | null)?.plan === "string" ? String((user.data as { plan: string }).plan) : null));
  const used = await countMeteredChecksThisUtcMonth(supabase, userId);
  const available = used == null ? null : remainingObservations(used, plan.monthlyObservations);
  if (available == null || available < 2) {
    console.log(JSON.stringify({ ok: false, error: "capacity", available }));
    return;
  }
  const link = await supabase.from("monitoring_watch_journeys").select("monitoring_watch_id").eq("journey_id", JOURNEY_ID).maybeSingle();
  const watchId = link.data && typeof (link.data as { monitoring_watch_id?: unknown }).monitoring_watch_id === "string"
    ? String((link.data as { monitoring_watch_id: string }).monitoring_watch_id)
    : "";
  if (!watchId) throw new Error("watch_missing");

  const beforeObservations = await supabase.from("observations").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("captured_at", utcMonthStartIso());
  const beforeRuns = await supabase.from("journey_runs").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", utcMonthStartIso());
  const dueAt = new Date(Date.now() - 60_000).toISOString();
  const armed = await supabase.from("monitoring_watches").update({
    enabled: true,
    include_page: true,
    regions: ["US-CA"],
    environments: ["desktop"],
    schedule: "daily",
    target_url: "https://viewtrace.net/",
    next_run_at: dueAt,
  }).eq("id", watchId).eq("user_id", userId);
  if (armed.error) throw new Error("arm_failed");

  try {
    const due = await runDueMonitoringWatches(supabase, async () => plan.monthlyObservations);
    const monitoring = await supabase
      .from("monitoring_runs")
      .select("id, execution, required_checks")
      .eq("user_id", userId)
      .eq("journey_id", JOURNEY_ID)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const monitoringId = monitoring.data && typeof (monitoring.data as { id?: unknown }).id === "string"
      ? String((monitoring.data as { id: string }).id)
      : null;
    const children = monitoringId
      ? await supabase.from("monitoring_run_journey_runs").select("journey_run_id").eq("monitoring_run_id", monitoringId)
      : { data: [] };
    const pages = monitoringId
      ? await supabase.from("monitoring_run_observations").select("observation_id").eq("monitoring_run_id", monitoringId)
      : { data: [] };
    const afterObservations = await supabase.from("observations").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("captured_at", utcMonthStartIso());
    const afterRuns = await supabase.from("journey_runs").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", utcMonthStartIso());
    console.log(JSON.stringify({
      ok: due.ran === 1
        && (pages.data?.length ?? 0) === 1
        && (children.data?.length ?? 0) === 1
        && (monitoring.data as { required_checks?: number } | null)?.required_checks === 2
        && (monitoring.data as { execution?: string } | null)?.execution === "executed"
        && beforeObservations.count != null
        && afterObservations.count === beforeObservations.count + 1
        && beforeRuns.count != null
        && afterRuns.count === beforeRuns.count + 1,
      due,
      monitoringRunId: monitoringId,
      requiredChecks: monitoring.data ? (monitoring.data as { required_checks?: number }).required_checks ?? null : null,
      execution: monitoring.data ? (monitoring.data as { execution?: string }).execution ?? null : null,
      observations: pages.data?.length ?? 0,
      journeyRuns: children.data?.length ?? 0,
      observationCountBefore: beforeObservations.count,
      observationCountAfter: afterObservations.count,
      journeyRunCountBefore: beforeRuns.count,
      journeyRunCountAfter: afterRuns.count,
    }));
  } finally {
    await disableJourneyMonitoring(supabase, userId, JOURNEY_ID);
    await supabase.from("monitoring_watches").update({ include_page: false }).eq("id", watchId).eq("user_id", userId);
    const left = await supabase.from("monitoring_watches").select("enabled, include_page, next_run_at").eq("id", watchId).maybeSingle();
    const journeyLeft = await supabase.from("journey_definitions").select("watch_enabled, next_run_at").eq("id", JOURNEY_ID).maybeSingle();
    console.log(JSON.stringify({
      watchEnabled: left.data ? (left.data as { enabled?: boolean }).enabled === true : null,
      includePage: left.data ? (left.data as { include_page?: boolean }).include_page === true : null,
      watchNext: left.data ? (left.data as { next_run_at?: string | null }).next_run_at ?? null : null,
      journeyWatch: journeyLeft.data ? (journeyLeft.data as { watch_enabled?: boolean }).watch_enabled === true : null,
      journeyNext: journeyLeft.data ? (journeyLeft.data as { next_run_at?: string | null }).next_run_at ?? null : null,
    }));
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "proof_failed");
  process.exitCode = 1;
});
