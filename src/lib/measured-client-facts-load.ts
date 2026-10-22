import { isObservationUuid } from "@/lib/observation-route-id";
import {
  parseStoredScroll,
  SCROLL_INTERACTION_ANALYSIS_TYPE,
} from "@/lib/observation-optional-metrics-store";
import {
  clientMeasuredFromCheck,
  emptyClientMeasuredFacts,
  type ClientJourneyFact,
  type ClientMeasuredFacts,
} from "@/lib/measured-client-summary";
import type { SupabaseClient } from "@supabase/supabase-js";

const CHUNK = 80;

function chunks(ids: string[]): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK) out.push(ids.slice(i, i + CHUNK));
  return out;
}

function quietMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205";
}

/**
 * Stored interaction totals and linked Journey runs for these observations.
 * A missing check stays null. Journey rows are attached only when a Monitoring Run linked them.
 */
export async function loadClientMeasuredFacts(
  supabase: SupabaseClient,
  userId: string,
  observationIds: string[],
): Promise<Map<string, ClientMeasuredFacts>> {
  const ids = [...new Set(observationIds.filter((id) => isObservationUuid(id)))];
  const out = new Map<string, ClientMeasuredFacts>();
  for (const id of ids) out.set(id, emptyClientMeasuredFacts());
  if (ids.length === 0) return out;

  for (const slice of chunks(ids)) {
    const { data, error } = await supabase
      .from("ai_analyses")
      .select("observation_id,notes")
      .eq("user_id", userId)
      .eq("analysis_type", SCROLL_INTERACTION_ANALYSIS_TYPE)
      .in("observation_id", slice);
    if (error) {
      if (!quietMissing(error)) {
        console.warn("[measured] interaction load failed", error.code, error.message);
      }
      break;
    }
    for (const row of data ?? []) {
      const id = typeof row.observation_id === "string" ? row.observation_id : "";
      const stored = parseStoredScroll(row.notes);
      if (!id || !stored?.result || !out.has(id)) continue;
      const current = out.get(id) ?? emptyClientMeasuredFacts();
      const measured = clientMeasuredFromCheck(stored.result, stored.behavior_diff);
      out.set(id, { ...measured, journeys: current.journeys });
    }
  }

  const links: { observationId: string; runId: string; region: string }[] = [];
  for (const slice of chunks(ids)) {
    const { data, error } = await supabase
      .from("monitoring_run_observations")
      .select("observation_id, monitoring_run_id, region")
      .in("observation_id", slice);
    if (error) {
      if (!quietMissing(error)) {
        console.warn("[measured] monitoring link load failed", error.code, error.message);
      }
      return out;
    }
    for (const row of data ?? []) {
      const observationId = typeof row.observation_id === "string" ? row.observation_id : "";
      const runId = typeof row.monitoring_run_id === "string" ? row.monitoring_run_id : "";
      const region = typeof row.region === "string" ? row.region : "";
      if (observationId && runId && out.has(observationId)) {
        links.push({ observationId, runId, region });
      }
    }
  }
  if (links.length === 0) return out;

  const runIds = [...new Set(links.map((link) => link.runId))];
  const journeyByRun = new Map<string, string>();
  const { data: runs, error: runsError } = await supabase
    .from("monitoring_runs")
    .select("id, journey_id")
    .eq("user_id", userId)
    .in("id", runIds);
  if (runsError) {
    if (!quietMissing(runsError)) {
      console.warn("[measured] monitoring run load failed", runsError.code, runsError.message);
    }
    return out;
  }
  const journeyIds: string[] = [];
  for (const row of runs ?? []) {
    const id = typeof row.id === "string" ? row.id : "";
    const journeyId = typeof row.journey_id === "string" ? row.journey_id : "";
    if (id && journeyId) {
      journeyByRun.set(id, journeyId);
      journeyIds.push(journeyId);
    }
  }
  if (journeyIds.length === 0) return out;

  const nameByJourney = new Map<string, string>();
  const { data: definitions, error: defError } = await supabase
    .from("journey_definitions")
    .select("id, name")
    .eq("user_id", userId)
    .in("id", [...new Set(journeyIds)]);
  if (defError) {
    console.warn("[measured] journey name load failed", defError.code, defError.message);
    return out;
  }
  for (const row of definitions ?? []) {
    const id = typeof row.id === "string" ? row.id : "";
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (id && name) nameByJourney.set(id, name);
  }

  const { data: runLinks, error: linkError } = await supabase
    .from("monitoring_run_journey_runs")
    .select("monitoring_run_id, journey_run_id")
    .in("monitoring_run_id", runIds);
  if (linkError) {
    if (!quietMissing(linkError)) {
      console.warn("[measured] journey link load failed", linkError.code, linkError.message);
    }
    return out;
  }
  const journeyRunIds = (runLinks ?? [])
    .map((row) => (typeof row.journey_run_id === "string" ? row.journey_run_id : ""))
    .filter(Boolean);
  if (journeyRunIds.length === 0) return out;

  const { data: journeyRuns, error: journeyError } = await supabase
    .from("journey_runs")
    .select("id, region, device_class, status")
    .eq("user_id", userId)
    .in("id", journeyRunIds);
  if (journeyError) {
    console.warn("[measured] journey run load failed", journeyError.code, journeyError.message);
    return out;
  }

  const runById = new Map<
    string,
    { region: string; device: "desktop" | "mobile"; status: string }
  >();
  for (const row of journeyRuns ?? []) {
    const id = typeof row.id === "string" ? row.id : "";
    const device = row.device_class === "mobile" || row.device_class === "desktop" ? row.device_class : null;
    const status = typeof row.status === "string" ? row.status : "";
    const region = typeof row.region === "string" ? row.region : "";
    if (id && device && status) runById.set(id, { region, device, status });
  }

  const journeysByObservation = new Map<string, ClientJourneyFact[]>();
  for (const link of runLinks ?? []) {
    const runId = typeof link.monitoring_run_id === "string" ? link.monitoring_run_id : "";
    const journeyRunId = typeof link.journey_run_id === "string" ? link.journey_run_id : "";
    const journeyId = journeyByRun.get(runId);
    const journeyRun = runById.get(journeyRunId);
    if (!journeyId || !journeyRun) continue;
    const name = nameByJourney.get(journeyId) ?? "";
    if (!name) continue;
    for (const observation of links) {
      if (observation.runId !== runId) continue;
      if (observation.region && journeyRun.region && observation.region !== journeyRun.region) continue;
      const list = journeysByObservation.get(observation.observationId) ?? [];
      const duplicate = list.some(
        (row) => row.name === name && row.device === journeyRun.device && row.status === journeyRun.status,
      );
      if (!duplicate) {
        list.push({ name, device: journeyRun.device, status: journeyRun.status });
        journeysByObservation.set(observation.observationId, list);
      }
    }
  }

  for (const [observationId, journeys] of journeysByObservation) {
    const current = out.get(observationId) ?? emptyClientMeasuredFacts();
    out.set(observationId, { ...current, journeys });
  }
  return out;
}
