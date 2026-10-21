import type { SupabaseClient } from "@supabase/supabase-js";
import { emptyBehaviorFindings, groupBehaviorFindings, type BehaviorFindings } from "@/lib/behavior-findings";
import {
  buildMonitoringNotification,
  DEFAULT_MONITORING_NOTIFICATION_POLICY,
} from "@/lib/monitoring-notification";
import { isResendConfigured, sendResendEmail } from "@/lib/resend";
import { getAppOriginForEmailLinks } from "@/lib/site";
import { clientMeasuredFromCheck } from "@/lib/measured-client-summary";
import { screenshotCompareField } from "@/lib/observation-compare";
import { findPreviousObservationForCompare, observationFromCompareRow } from "@/lib/observation-previous";
import { countObservationsThisUtcMonth, utcMonthStartIso } from "@/lib/observation-quota";
import { loadObservationScrollInteraction } from "@/lib/observation-optional-metrics-store";
import type { JourneyStepDefinition } from "@/lib/journey-definition";
import type { JourneyStepEvidence } from "@/lib/journey-runner";
import {
  buildMonitoringRunDiff,
  diffMonitoringPage,
  parseMonitoringAlerts,
  parseMonitoringRunDiff,
  selectMonitoringAlerts,
  type MonitoringAlert,
  type MonitoringJourneyInput,
  type MonitoringJourneyStepInput,
  type MonitoringRunDiff,
} from "@/lib/monitoring-run-diff";
import { monitoringJourneyFact, parseMonitoringRunPlan, type MonitoringPageFact, monitoringPageFact } from "@/lib/monitoring-run";
import type { Observation } from "@/lib/demo/observations";
import type { RegionalInteractionCheckV1 } from "@/lib/observation-regional-interaction";

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

export type MonitoringRunBehaviorFact = {
  verified: number | null;
  unknownChanges: number | null;
  notClicked: number | null;
  notClickedDetail: string;
  /** Derived for display. The stored check is not rewritten. */
  findings: BehaviorFindings;
};

export type MonitoringRunObservationFact = {
  id: string;
  region: string;
  regionLabel: string;
  page: MonitoringPageFact;
  working: number | null;
  newUnknown: boolean;
  /** Null when this Observation has no stored behavior check. */
  behavior: MonitoringRunBehaviorFact | null;
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
  diff: MonitoringRunDiff;
  alerts: MonitoringAlert[];
  diffStored: boolean;
} | null> {
  const { data, error } = await supabase
    .from("monitoring_runs")
    .select("id,target_url,started_at,execution,required_checks,available_checks,journey_id,plan,diff,alerts")
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
  const observationByRegion = new Map<string, Observation>();
  const checkByRegion = new Map<string, RegionalInteractionCheckV1 | null>();
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
      observationByRegion.set(region, current);
      checkByRegion.set(region, stored?.result ?? null);
      const measured = stored ? clientMeasuredFromCheck(stored.result) : null;
      const working = measured?.verified ?? null;
      const newUnknown = stored?.behavior_diff?.map_diffs.some((row) => row.section === "new") ?? false;
      observations.push({
        id: current.id,
        region,
        regionLabel: current.regionLabel,
        page: monitoringPageFact({ captured, verdict }),
        working,
        newUnknown,
        behavior: measured
          ? {
              verified: measured.verified,
              unknownChanges: measured.unknownChanges,
              notClicked: measured.notClicked,
              notClickedDetail: measured.notClickedDetail,
              findings: stored?.result.discovery
                ? groupBehaviorFindings({
                    map: stored.result.discovery.map ?? [],
                    blocked: stored.result.discovery.safety?.blocked ?? [],
                  })
                : emptyBehaviorFindings(),
            }
          : null,
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

  const previousRunId = await findPreviousExecutedMonitoringRun(supabase, userId, run.targetUrl, run.startedAt, run.id);
  const previousScope = previousRunId
    ? await loadMonitoringScope(supabase, userId, previousRunId)
    : { observations: new Map<string, Observation>(), checks: new Map<string, RegionalInteractionCheckV1 | null>(), journeys: [] as MonitoringRunJourneyFactRow[] };
  const pages = run.plan.regions.map((region) => {
    const current = observationByRegion.get(region) ?? null;
    const previous = previousScope.observations.get(region) ?? null;
    const captured = current?.status === "success";
    let verdict: "same" | "changed" | "incomparable" | "unknown" | null = null;
    if (captured && previous) {
      verdict = screenshotCompareField(previous, current).verdict;
      if (verdict === "unknown") verdict = "incomparable";
    }
    return diffMonitoringPage({
      region,
      regionLabel: current?.regionLabel || observations.find((row) => row.region === region)?.regionLabel || region,
      captured,
      verdict,
      currentObservationId: current?.id ?? null,
      previousObservationId: previous?.id ?? null,
    });
  });
  const behaviorChecks = run.plan.regions.map((region) => ({
    region,
    current: checkByRegion.get(region) ?? null,
    previous: previousScope.checks.get(region) ?? null,
    previousObservationId: previousScope.observations.get(region)?.id ?? null,
  }));
  const journeys = journeyRuns.map((row) => ({
    current: journeyInput(row, journeyName, journeySteps),
    previous: (() => {
      const prior = previousScope.journeys.find((item) => item.region === row.region && item.deviceClass === row.deviceClass);
      return prior ? journeyInput(prior, journeyName, journeySteps) : null;
    })(),
  }));
  const computed = buildMonitoringRunDiff({
    previousRunId,
    pages,
    behaviorChecks,
    journeys,
  });
  const computedAlerts = selectMonitoringAlerts(computed);
  const storedDiff = parseMonitoringRunDiff((data as { diff?: unknown }).diff);
  const storedAlerts = parseMonitoringAlerts((data as { alerts?: unknown }).alerts);
  const diffStored = Boolean(storedDiff && storedAlerts);
  return {
    run,
    observations,
    journeyRuns,
    journeyName,
    journeySteps,
    diff: diffStored && storedDiff ? storedDiff : computed,
    alerts: diffStored && storedAlerts ? storedAlerts : computedAlerts,
    diffStored,
  };
}

function journeyInput(
  row: MonitoringRunJourneyFactRow,
  name: string | null,
  definitions: JourneyStepDefinition[],
): MonitoringJourneyInput {
  return {
    region: row.region,
    environment: row.deviceClass,
    name: name || "Journey",
    status: monitoringJourneyFact(row.status),
    required: false,
    steps: row.steps.map((step, index) => journeyStepInput(step, definitions.find((item) => item.id === step.id) ?? definitions[index] ?? null)),
  };
}

function journeyStepInput(step: JourneyStepEvidence, defined: JourneyStepDefinition | null): MonitoringJourneyStepInput {
  const status = step.status === "pass" || step.status === "fail" || step.status === "blocked_for_safety" || step.status === "not_run" || step.status === "incomplete"
    ? step.status
    : "incomplete";
  let before: string | null = null;
  let after: string | null = null;
  if (step.before_text != null || step.after_text != null) {
    before = step.before_text;
    after = step.after_text;
  } else if (step.before_visible != null || step.after_visible != null) {
    before = step.before_visible == null ? null : step.before_visible ? "visible" : "hidden";
    after = step.after_visible == null ? null : step.after_visible ? "visible" : "hidden";
  }
  return {
    id: step.id,
    label: defined?.selector || step.kind,
    expected: defined?.expect_text
      || (defined?.expect_visible ? "Becomes visible" : "")
      || (defined?.expect_url ? defined.expect_url : ""),
    status,
    before,
    after,
  };
}

async function findPreviousExecutedMonitoringRun(
  supabase: SupabaseClient,
  userId: string,
  targetUrl: string,
  before: string,
  excludeId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("monitoring_runs")
    .select("id")
    .eq("user_id", userId)
    .eq("target_url", targetUrl)
    .eq("execution", "executed")
    .lt("started_at", before)
    .neq("id", excludeId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const id = (data as { id?: unknown } | null)?.id;
  return typeof id === "string" ? id : null;
}

async function loadMonitoringScope(
  supabase: SupabaseClient,
  userId: string,
  runId: string,
): Promise<{
  observations: Map<string, Observation>;
  checks: Map<string, RegionalInteractionCheckV1 | null>;
  journeys: MonitoringRunJourneyFactRow[];
}> {
  const observations = new Map<string, Observation>();
  const checks = new Map<string, RegionalInteractionCheckV1 | null>();
  const { data: observationLinks } = await supabase
    .from("monitoring_run_observations")
    .select("observation_id")
    .eq("monitoring_run_id", runId);
  const observationIds = (observationLinks ?? [])
    .map((row) => (typeof (row as { observation_id?: unknown }).observation_id === "string" ? (row as { observation_id: string }).observation_id : ""))
    .filter(Boolean);
  if (observationIds.length) {
    const { data: rows } = await supabase.from("observations").select(OBSERVATION_SELECT).in("id", observationIds).eq("user_id", userId);
    for (const raw of rows ?? []) {
      const current = observationFromCompareRow(raw as Record<string, unknown>);
      if (!current) continue;
      observations.set(current.regionValue || "", current);
      const stored = await loadObservationScrollInteraction(supabase, userId, current.id);
      checks.set(current.regionValue || "", stored?.result ?? null);
    }
  }
  const journeys: MonitoringRunJourneyFactRow[] = [];
  const { data: journeyLinks } = await supabase
    .from("monitoring_run_journey_runs")
    .select("journey_run_id")
    .eq("monitoring_run_id", runId);
  const journeyRunIds = (journeyLinks ?? [])
    .map((row) => (typeof (row as { journey_run_id?: unknown }).journey_run_id === "string" ? (row as { journey_run_id: string }).journey_run_id : ""))
    .filter(Boolean);
  if (journeyRunIds.length) {
    const { data: runs } = await supabase
      .from("journey_runs")
      .select("id,journey_id,region,device_class,status,steps")
      .in("id", journeyRunIds)
      .eq("user_id", userId);
    for (const raw of runs ?? []) {
      const row = raw as Record<string, unknown>;
      journeys.push({
        id: String(row.id),
        journeyId: String(row.journey_id ?? ""),
        region: String(row.region ?? ""),
        deviceClass: row.device_class === "mobile" ? "mobile" : "desktop",
        status: String(row.status ?? ""),
        steps: Array.isArray(row.steps) ? row.steps as JourneyStepEvidence[] : [],
      });
    }
  }
  return { observations, checks, journeys };
}

export async function saveMonitoringRunJudgment(
  supabase: SupabaseClient,
  userId: string,
  runId: string,
): Promise<boolean> {
  const loaded = await loadMonitoringRun(supabase, userId, runId);
  if (!loaded || loaded.run.execution !== "executed") return false;
  if (!loaded.diffStored) {
    const { error } = await supabase
      .from("monitoring_runs")
      .update({ diff: loaded.diff, alerts: loaded.alerts })
      .eq("id", runId)
      .eq("user_id", userId);
    if (error) return false;
  }
  await deliverMonitoringNotification(supabase, userId, runId, loaded.alerts, loaded.diff.behavior.rows);
  return true;
}

async function deliverMonitoringNotification(
  supabase: SupabaseClient,
  userId: string,
  runId: string,
  alerts: Parameters<typeof buildMonitoringNotification>[0]["alerts"],
  rows: Parameters<typeof buildMonitoringNotification>[0]["rows"],
): Promise<void> {
  const { data } = await supabase
    .from("monitoring_runs")
    .select("notification")
    .eq("id", runId)
    .eq("user_id", userId)
    .maybeSingle();
  if ((data as { notification?: unknown } | null)?.notification) return;
  const policy = DEFAULT_MONITORING_NOTIFICATION_POLICY;
  const at = new Date().toISOString();
  const runUrl = `${getAppOriginForEmailLinks()}/dashboard/monitoring-runs/${runId}`;
  const draft = buildMonitoringNotification({ alerts, rows, policy, runUrl });
  const write = async (notification: Record<string, string>) => {
    await supabase.from("monitoring_runs").update({ notification }).eq("id", runId).eq("user_id", userId);
  };
  if (!draft.send) {
    await write({ status: "skipped", policy, reason: "below_policy", at });
    return;
  }
  const user = await supabase.auth.admin.getUserById(userId);
  const email = user.data.user?.email?.trim() || "";
  if (!email) {
    await write({ status: "failed", policy, reason: "no_email", at });
    return;
  }
  if (!isResendConfigured()) {
    await write({ status: "failed", policy, reason: "resend_not_configured", at });
    return;
  }
  const sent = await sendResendEmail({
    to: email,
    subject: draft.subject,
    text: draft.text,
    html: draft.html,
    idempotencyKey: `monitoring-run/${runId}`,
  });
  if (!sent.ok) {
    await write({ status: "failed", policy, reason: "send_failed", at });
    return;
  }
  await write({ status: "sent", policy, emailId: sent.id, at });
}
