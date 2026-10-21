import type { SupabaseClient } from "@supabase/supabase-js";
import { screenshotCompareField } from "@/lib/observation-compare";
import { findPreviousObservationForCompare, observationFromCompareRow } from "@/lib/observation-previous";
import { countObservationsThisUtcMonth, utcMonthStartIso } from "@/lib/observation-quota";
import { loadObservationScrollInteraction } from "@/lib/observation-optional-metrics-store";
import type { JourneyStepDefinition } from "@/lib/journey-definition";
import type { JourneyStepEvidence } from "@/lib/journey-runner";
import { parseMonitoringRunPlan, type MonitoringPageFact, monitoringPageFact } from "@/lib/monitoring-run";

const OBSERVATION_SELECT =
  "id,url,region,region_label,status,captured_at,snapshot_image_url,snapshot_sha256,snapshot_phash,snapshot_purged_at,capture_conditions";

export type MonitoringRunRecord = {
  id: string;
  targetUrl: string;
  startedAt: string;
  execution: "executed" | "not_executed";
  requiredChecks: number;
  availableChecks: number | null;
  journeyId: string | null;
  plan: ReturnType<typeof parseMonitoringRunPlan>;
};

export type MonitoringRunObservationFact = {
  id: string;
  region: string;
  regionLabel: string;
  page: MonitoringPageFact;
  working: number | null;
  newUnknown: boolean;
};

export type MonitoringRunJourneyFactRow = {
  id: string;
  journeyId: string;
  region: string;
  deviceClass: "desktop" | "mobile";
  status: string;
  steps: JourneyStepEvidence[];
};

export async function countMeteredChecksThisUtcMonth(
  supabase: SupabaseClient,
  userId: string,
): Promise<number | null> {
  const observations = await countObservationsThisUtcMonth(supabase, userId);
  if (observations == null) return null;
  const { count, error } = await supabase
    .from("journey_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", utcMonthStartIso());
  if (error) return null;
  return observations + (count ?? 0);
}

export async function createMonitoringRun(
  supabase: SupabaseClient,
  input: {
    userId: string;
    targetUrl: string;
    execution: "executed" | "not_executed";
    requiredChecks: number;
    availableChecks: number | null;
    journeyId?: string | null;
    plan: { regions: string[]; environments: string[]; workflowSteps: number };
  },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("monitoring_runs")
    .insert({
      user_id: input.userId,
      target_url: input.targetUrl,
      execution: input.execution,
      required_checks: input.requiredChecks,
      available_checks: input.availableChecks,
      journey_id: input.journeyId ?? null,
      plan: input.plan,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "save_failed" };
  return { ok: true, id: String((data as { id: string }).id) };
}

export async function linkMonitoringObservations(
  supabase: SupabaseClient,
  runId: string,
  rows: Array<{ observationId: string; region: string }>,
): Promise<void> {
  if (!rows.length) return;
  await supabase.from("monitoring_run_observations").insert(
    rows.map((row) => ({
      monitoring_run_id: runId,
      observation_id: row.observationId,
      region: row.region,
    })),
  );
}

export async function linkMonitoringJourneyRuns(
  supabase: SupabaseClient,
  runId: string,
  journeyRunIds: string[],
): Promise<void> {
  if (!journeyRunIds.length) return;
  await supabase.from("monitoring_run_journey_runs").insert(
    journeyRunIds.map((id) => ({ monitoring_run_id: runId, journey_run_id: id })),
  );
}

export async function listRecentMonitoringRuns(
  supabase: SupabaseClient,
  userId: string,
): Promise<Array<{ id: string; targetUrl: string; startedAt: string; execution: "executed" | "not_executed" }>> {
  const { data, error } = await supabase
    .from("monitoring_runs")
    .select("id,target_url,started_at,execution")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(8);
  if (error || !data) return [];
  return (data as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    targetUrl: String(row.target_url ?? ""),
    startedAt: String(row.started_at ?? ""),
    execution: row.execution === "not_executed" ? "not_executed" : "executed",
  }));
}

function runRecord(row: Record<string, unknown>): MonitoringRunRecord | null {
  const id = typeof row.id === "string" ? row.id : "";
  const targetUrl = typeof row.target_url === "string" ? row.target_url : "";
  if (!id || !targetUrl) return null;
  return {
    id,
    targetUrl,
    startedAt: typeof row.started_at === "string" ? row.started_at : "",
    execution: row.execution === "not_executed" ? "not_executed" : "executed",
    requiredChecks: typeof row.required_checks === "number" ? row.required_checks : 0,
    availableChecks: typeof row.available_checks === "number" ? row.available_checks : null,
    journeyId: typeof row.journey_id === "string" ? row.journey_id : null,
    plan: parseMonitoringRunPlan(row.plan),
  };
}

export async function loadMonitoringRun(
  supabase: SupabaseClient,
  userId: string,
  runId: string,
): Promise<{
  run: MonitoringRunRecord;
  observations: MonitoringRunObservationFact[];
  journeyRuns: MonitoringRunJourneyFactRow[];
  journeyName: string | null;
  journeySteps: JourneyStepDefinition[];
} | null> {
  const { data, error } = await supabase
    .from("monitoring_runs")
    .select("id,target_url,started_at,execution,required_checks,available_checks,journey_id,plan")
    .eq("id", runId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  const run = runRecord(data as Record<string, unknown>);
  if (!run) return null;

  const { data: observationLinks } = await supabase
    .from("monitoring_run_observations")
    .select("observation_id,region")
    .eq("monitoring_run_id", runId);
  const observationIds = (observationLinks ?? [])
    .map((row) => (typeof (row as { observation_id?: unknown }).observation_id === "string" ? (row as { observation_id: string }).observation_id : ""))
    .filter(Boolean);

  const observations: MonitoringRunObservationFact[] = [];
  if (observationIds.length) {
    const { data: rows } = await supabase.from("observations").select(OBSERVATION_SELECT).in("id", observationIds).eq("user_id", userId);
    for (const raw of rows ?? []) {
      const current = observationFromCompareRow(raw as Record<string, unknown>);
      if (!current) continue;
      const region = current.regionValue || "";
      const captured = current.status === "success";
      let verdict: "same" | "changed" | "incomparable" | "unknown" | null = null;
      if (captured) {
        const previous = await findPreviousObservationForCompare(supabase, {
          userId,
          url: current.url,
          region,
          beforeCapturedAt: current.capturedAt,
          excludeId: current.id,
        });
        verdict = previous ? screenshotCompareField(previous, current).verdict : null;
        if (verdict === "unknown") verdict = "incomparable";
      }
      const stored = await loadObservationScrollInteraction(supabase, userId, current.id);
      const working = stored
        ? stored.result.types.filter((row) => row.status === "working").length
        : null;
      const newUnknown = stored?.behavior_diff?.map_diffs.some((row) => row.section === "new") ?? false;
      observations.push({
        id: current.id,
        region,
        regionLabel: current.regionLabel,
        page: monitoringPageFact({ captured, verdict }),
        working,
        newUnknown,
      });
    }
  }

  const { data: journeyLinks } = await supabase
    .from("monitoring_run_journey_runs")
    .select("journey_run_id")
    .eq("monitoring_run_id", runId);
  const journeyRunIds = (journeyLinks ?? [])
    .map((row) => (typeof (row as { journey_run_id?: unknown }).journey_run_id === "string" ? (row as { journey_run_id: string }).journey_run_id : ""))
    .filter(Boolean);
  const journeyRuns: MonitoringRunJourneyFactRow[] = [];
  if (journeyRunIds.length) {
    const { data: runs } = await supabase
      .from("journey_runs")
      .select("id,journey_id,region,device_class,status,steps")
      .in("id", journeyRunIds)
      .eq("user_id", userId);
    for (const raw of runs ?? []) {
      const row = raw as Record<string, unknown>;
      const device = row.device_class === "mobile" ? "mobile" : "desktop";
      journeyRuns.push({
        id: String(row.id),
        journeyId: String(row.journey_id ?? ""),
        region: String(row.region ?? ""),
        deviceClass: device,
        status: String(row.status ?? ""),
        steps: Array.isArray(row.steps) ? row.steps as JourneyStepEvidence[] : [],
      });
    }
  }

  let journeyName: string | null = null;
  let journeySteps: JourneyStepDefinition[] = [];
  if (run.journeyId) {
    const { data: journey } = await supabase
      .from("journey_definitions")
      .select("name,steps")
      .eq("id", run.journeyId)
      .eq("user_id", userId)
      .maybeSingle();
    if (journey) {
      const row = journey as { name?: unknown; steps?: unknown };
      journeyName = typeof row.name === "string" ? row.name : null;
      journeySteps = Array.isArray(row.steps) ? row.steps as JourneyStepDefinition[] : [];
    }
  }

  return { run, observations, journeyRuns, journeyName, journeySteps };
}
