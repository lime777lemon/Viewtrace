import { readFileSync } from "node:fs";
import WebSocket from "ws";
import { disableJourneyMonitoring, enableJourneyMonitoring, runDueMonitoringWatches } from "../src/lib/monitoring-watch-store";
import { getPlan, parsePlanId } from "../src/lib/plans";
import { countMeteredChecksThisUtcMonth } from "../src/lib/monitoring-run-store";
import { remainingObservations, utcMonthStartIso } from "../src/lib/observation-quota";
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

const OWNER_JOURNEY = "803e2a58-0e2b-4c9b-a7f8-299eb27321a5";

async function main() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("admin");
  const owner = await supabase.from("journey_definitions").select("user_id").eq("id", OWNER_JOURNEY).maybeSingle();
  const userId = owner.data && typeof (owner.data as { user_id?: unknown }).user_id === "string"
    ? String((owner.data as { user_id: string }).user_id)
    : "";
  if (!userId) throw new Error("owner_missing");
  const user = await supabase.from("users").select("plan").eq("id", userId).maybeSingle();
  const plan = getPlan(parsePlanId(typeof (user.data as { plan?: unknown } | null)?.plan === "string" ? String((user.data as { plan: string }).plan) : null));
  if (!plan.autoObservationWatch) {
    console.log(JSON.stringify({ ok: false, error: "plan_without_watch" }));
    return;
  }
  const used = await countMeteredChecksThisUtcMonth(supabase, userId);
  const available = used == null ? null : remainingObservations(used, plan.monthlyObservations);
  if (available == null || available < 2) {
    console.log(JSON.stringify({ ok: false, error: "capacity", available }));
    return;
  }

  const created = await supabase.from("journey_definitions").insert({
    user_id: userId,
    name: "Monitoring proof",
    start_url: "https://viewtrace.net/",
    steps: [{
      id: "open",
      kind: "open_url",
      selector: "",
      value: "",
      url: "viewtrace.net",
      wait_ms: 1000,
      permitted_side_effect: null,
      expect_selector: "",
      expect_text: "",
      expect_visible: false,
      expect_url: "",
    }],
    regions: ["US-CA"],
    device_classes: ["desktop"],
    watch_enabled: false,
    watch_frequency: "daily",
    purpose: "test",
    secret_credentials: {},
  }).select("id").single();
  const journeyId = created.data && typeof (created.data as { id?: unknown }).id === "string"
    ? String((created.data as { id: string }).id)
    : "";
  if (!journeyId) throw new Error("journey_create_failed");

  let enabled = false;
  try {
    const turnedOn = await enableJourneyMonitoring(supabase, userId, {
      journeyId,
      frequency: "daily",
      regions: ["US-CA"],
      deviceClasses: ["desktop"],
      monthlyLimit: plan.monthlyObservations,
    });
    if (!turnedOn.ok) {
      const latest = await supabase
        .from("journey_runs")
        .select("id, status, steps")
        .eq("journey_id", journeyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const steps = latest.data && Array.isArray((latest.data as { steps?: unknown }).steps)
        ? (latest.data as { steps: Array<{ kind?: string; status?: string; detail?: string | null }> }).steps
        : [];
      const open = steps.find((step) => step.kind === "open_url");
      console.log(JSON.stringify({
        ok: false,
        error: turnedOn.error,
        journeyId,
        runId: latest.data ? (latest.data as { id?: string }).id ?? null : null,
        runStatus: latest.data ? (latest.data as { status?: string }).status ?? null : null,
        openStatus: open?.status ?? null,
        openDetail: open?.detail ?? null,
        preflight: {
          urlValid: turnedOn.preflight.urlValid,
          testRunPassed: turnedOn.preflight.testRunPassed,
          capacityAvailable: turnedOn.preflight.capacityAvailable,
        },
      }));
      return;
    }
    enabled = true;
    const saved = await supabase.from("journey_definitions").select("start_url, steps, next_run_at, watch_enabled").eq("id", journeyId).single();
    const savedSteps = saved.data && Array.isArray((saved.data as { steps?: unknown }).steps)
      ? (saved.data as { steps: Array<{ url?: string }> }).steps
      : [];
    const beforeObservations = await supabase.from("observations").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("captured_at", utcMonthStartIso());
    const beforeRuns = await supabase.from("journey_runs").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", utcMonthStartIso());
    const linked = await supabase.from("monitoring_watch_journeys").select("monitoring_watch_id").eq("journey_id", journeyId).maybeSingle();
    const proofWatchId = linked.data && typeof (linked.data as { monitoring_watch_id?: unknown }).monitoring_watch_id === "string"
      ? String((linked.data as { monitoring_watch_id: string }).monitoring_watch_id)
      : null;
    const dueAt = new Date(Date.now() - 60_000).toISOString();
    if (proofWatchId) await supabase.from("monitoring_watches").update({ next_run_at: dueAt }).eq("id", proofWatchId);
    await supabase.from("journey_definitions").update({ next_run_at: dueAt }).eq("id", journeyId);
    const due = await runDueMonitoringWatches(supabase, async () => plan.monthlyObservations);
    const watch = await supabase
      .from("monitoring_watch_journeys")
      .select("monitoring_watch_id")
      .eq("journey_id", journeyId)
      .maybeSingle();
    const watchId = watch.data && typeof (watch.data as { monitoring_watch_id?: unknown }).monitoring_watch_id === "string"
      ? String((watch.data as { monitoring_watch_id: string }).monitoring_watch_id)
      : null;
    const monitoring = watchId
      ? await supabase.from("monitoring_runs").select("id, execution, required_checks").eq("user_id", userId).eq("journey_id", journeyId).order("started_at", { ascending: false }).limit(1).maybeSingle()
      : { data: null };
    const monitoringId = monitoring.data && typeof (monitoring.data as { id?: unknown }).id === "string"
      ? String((monitoring.data as { id: string }).id)
      : null;
    const children = monitoringId
      ? await supabase.from("monitoring_run_journey_runs").select("journey_run_id").eq("monitoring_run_id", monitoringId)
      : { data: [] };
    const observations = monitoringId
      ? await supabase.from("monitoring_run_observations").select("observation_id").eq("monitoring_run_id", monitoringId)
      : { data: [] };
    const afterObservations = await supabase.from("observations").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("captured_at", utcMonthStartIso());
    const afterRuns = await supabase.from("journey_runs").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", utcMonthStartIso());
    const schedule = await supabase.from("monitoring_watches").select("enabled, next_run_at").eq("id", watchId ?? "").maybeSingle();
    const nextRunAt = schedule.data && typeof (schedule.data as { next_run_at?: unknown }).next_run_at === "string"
      ? String((schedule.data as { next_run_at: string }).next_run_at)
      : null;
    console.log(JSON.stringify({
      ok: due.ran === 1
        && (children.data?.length ?? 0) === 1
        && (observations.data?.length ?? 0) === 0
        && beforeObservations.count != null
        && afterObservations.count === beforeObservations.count
        && beforeRuns.count != null
        && afterRuns.count === beforeRuns.count + 1,
      journeyId,
      testRunId: turnedOn.testRunId,
      savedOpenUrl: savedSteps[0]?.url ?? null,
      savedStartUrl: saved.data ? (saved.data as { start_url?: string }).start_url ?? null : null,
      watchEnabledBeforeDue: saved.data ? (saved.data as { watch_enabled?: boolean }).watch_enabled === true : false,
      due,
      monitoringRunId: monitoringId,
      monitoringExecution: monitoring.data ? (monitoring.data as { execution?: string }).execution ?? null : null,
      childJourneyRuns: children.data?.length ?? 0,
      childObservations: observations.data?.length ?? 0,
      observationCountBefore: beforeObservations.count,
      observationCountAfter: afterObservations.count,
      journeyRunCountBefore: beforeRuns.count,
      journeyRunCountAfter: afterRuns.count,
      nextRunAdvanced: Boolean(nextRunAt && new Date(nextRunAt).getTime() > Date.now()),
      nextRunAt,
    }));
  } finally {
    if (enabled) await disableJourneyMonitoring(supabase, userId, journeyId);
    const left = await supabase.from("journey_definitions").select("watch_enabled, next_run_at").eq("id", journeyId).maybeSingle();
    const link = await supabase.from("monitoring_watch_journeys").select("monitoring_watch_id").eq("journey_id", journeyId).maybeSingle();
    const watchId = link.data && typeof (link.data as { monitoring_watch_id?: unknown }).monitoring_watch_id === "string"
      ? String((link.data as { monitoring_watch_id: string }).monitoring_watch_id)
      : null;
    const watch = watchId
      ? await supabase.from("monitoring_watches").select("enabled, next_run_at").eq("id", watchId).maybeSingle()
      : { data: null };
    console.log(JSON.stringify({
      disabled: left.data ? (left.data as { watch_enabled?: boolean }).watch_enabled === false : false,
      journeyNext: left.data ? (left.data as { next_run_at?: string | null }).next_run_at ?? null : null,
      watchEnabled: watch.data ? (watch.data as { enabled?: boolean }).enabled === true : false,
      watchNext: watch.data ? (watch.data as { next_run_at?: string | null }).next_run_at ?? null : null,
    }));
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "proof_failed");
  process.exitCode = 1;
});
