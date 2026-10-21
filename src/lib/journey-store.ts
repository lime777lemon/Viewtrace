import type { SupabaseClient } from "@supabase/supabase-js";
import { computeNextRunAfter, type WatchFrequency } from "@/lib/observation-watch-schedule";
import { countObservationsThisUtcMonth, utcMonthStartIso } from "@/lib/observation-quota";
import {
  parseJourneySteps,
  resolveJourneySteps,
  validateJourneySteps,
  type JourneyDeviceClass,
  type JourneyStepDefinition,
} from "@/lib/journey-definition";
import { journeyAlert, runJourneyInBrowserless, type JourneyStepEvidence } from "@/lib/journey-runner";

export type JourneyDefinitionPublic = {
  id: string;
  name: string;
  start_url: string;
  steps: JourneyStepDefinition[];
  regions: string[];
  device_classes: JourneyDeviceClass[];
  watch_enabled: boolean;
  watch_frequency: "daily" | "weekly";
  next_run_at: string | null;
  last_run_at: string | null;
  has_credentials: boolean;
};

export type JourneyRunPublic = {
  id: string;
  region: string;
  device_class: JourneyDeviceClass;
  environment: Record<string, unknown> | null;
  status: "passed" | "failed" | "blocked" | "incomplete";
  steps: JourneyStepEvidence[];
  alert: string | null;
  duration_ms: number | null;
  created_at: string;
};

const DEFINITION_COLUMNS = "id, name, start_url, steps, regions, device_classes, watch_enabled, watch_frequency, next_run_at, last_run_at, secret_credentials, created_at";

function asDevices(raw: unknown): JourneyDeviceClass[] {
  const values = Array.isArray(raw) ? raw : [];
  const devices = values.filter((value): value is JourneyDeviceClass => value === "desktop" || value === "mobile");
  return devices.length ? devices.slice(0, 2) : ["desktop"];
}

function toPublic(row: Record<string, unknown>): JourneyDefinitionPublic {
  const secret = row.secret_credentials && typeof row.secret_credentials === "object" ? row.secret_credentials as Record<string, unknown> : {};
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    start_url: String(row.start_url ?? ""),
    steps: parseJourneySteps(row.steps),
    regions: Array.isArray(row.regions) ? row.regions.filter((value): value is string => typeof value === "string").slice(0, 4) : [],
    device_classes: asDevices(row.device_classes),
    watch_enabled: row.watch_enabled === true,
    watch_frequency: row.watch_frequency === "weekly" ? "weekly" : "daily",
    next_run_at: typeof row.next_run_at === "string" ? row.next_run_at : null,
    last_run_at: typeof row.last_run_at === "string" ? row.last_run_at : null,
    has_credentials: typeof secret.username === "string" && secret.username.length > 0,
  };
}

export async function listJourneys(supabase: SupabaseClient, userId: string): Promise<JourneyDefinitionPublic[]> {
  const { data, error } = await supabase
    .from("journey_definitions")
    .select(DEFINITION_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => toPublic(row as Record<string, unknown>));
}

export async function getJourney(supabase: SupabaseClient, userId: string, id: string): Promise<JourneyDefinitionPublic | null> {
  const { data, error } = await supabase
    .from("journey_definitions")
    .select(DEFINITION_COLUMNS)
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toPublic(data as Record<string, unknown>) : null;
}

export async function listJourneyRuns(supabase: SupabaseClient, userId: string, journeyId: string): Promise<JourneyRunPublic[]> {
  const { data, error } = await supabase
    .from("journey_runs")
    .select("id, region, device_class, environment, status, steps, alert, duration_ms, created_at")
    .eq("user_id", userId)
    .eq("journey_id", journeyId)
    .order("created_at", { ascending: false })
    .limit(24);
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const item = row as Record<string, unknown>;
    const status = item.status;
    const device = item.device_class;
    if ((status !== "passed" && status !== "failed" && status !== "blocked" && status !== "incomplete") || (device !== "desktop" && device !== "mobile")) return [];
    return [{
      id: String(item.id),
      region: String(item.region ?? ""),
      device_class: device,
      environment: item.environment && typeof item.environment === "object" ? item.environment as Record<string, unknown> : null,
      status,
      steps: Array.isArray(item.steps) ? item.steps as JourneyStepEvidence[] : [],
      alert: typeof item.alert === "string" ? item.alert : null,
      duration_ms: typeof item.duration_ms === "number" ? item.duration_ms : null,
      created_at: String(item.created_at ?? ""),
    }];
  });
}

async function monthlyJourneyRuns(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("journey_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", utcMonthStartIso());
  if (error) return 0;
  return count ?? 0;
}

export async function saveJourney(
  supabase: SupabaseClient,
  userId: string,
  input: {
    id?: string;
    name: string;
    startUrl: string;
    steps: JourneyStepDefinition[];
    regions: string[];
    deviceClasses: JourneyDeviceClass[];
    watchEnabled: boolean;
    watchFrequency: "daily" | "weekly";
    username?: string;
    password?: string;
    watchAllowed: boolean;
  },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const steps = resolveJourneySteps(input.startUrl, parseJourneySteps(input.steps));
  const invalid = validateJourneySteps(input.startUrl, steps);
  if (invalid) return { ok: false, error: invalid };
  const regions = input.regions.map((region) => region.trim()).filter(Boolean).slice(0, 4);
  if (!regions.length) return { ok: false, error: "region_required" };
  const devices = input.deviceClasses.filter((device) => device === "desktop" || device === "mobile").slice(0, 2);
  if (!devices.length) return { ok: false, error: "environment_required" };
  const watchEnabled = input.watchAllowed && input.watchEnabled;
  const frequency: WatchFrequency = input.watchFrequency === "weekly" ? "weekly" : "daily";
  const next = watchEnabled ? computeNextRunAfter(new Date(), frequency, 1, 1).toISOString() : null;
  const payload: Record<string, unknown> = {
    user_id: userId,
    name: input.name.trim().slice(0, 80),
    start_url: input.startUrl.trim().slice(0, 500),
    steps,
    regions,
    device_classes: devices,
    watch_enabled: watchEnabled,
    watch_frequency: frequency,
    next_run_at: next,
    updated_at: new Date().toISOString(),
  };
  if (input.username || input.password) {
    let username = (input.username ?? "").slice(0, 120);
    let password = (input.password ?? "").slice(0, 200);
    if (input.id && (!username || !password)) {
      const existing = await supabase
        .from("journey_definitions")
        .select("secret_credentials")
        .eq("id", input.id)
        .eq("user_id", userId)
        .maybeSingle();
      const secret = existing.data && typeof (existing.data as { secret_credentials?: unknown }).secret_credentials === "object"
        ? (existing.data as { secret_credentials: Record<string, unknown> }).secret_credentials
        : {};
      if (!username && typeof secret.username === "string") username = secret.username;
      if (!password && typeof secret.password === "string") password = secret.password;
    }
    payload.secret_credentials = { username, password };
  }
  if (input.id) {
    const { error } = await supabase.from("journey_definitions").update(payload).eq("id", input.id).eq("user_id", userId);
    if (error) return { ok: false, error: "save_failed" };
    return { ok: true, id: input.id };
  }
  const { data, error } = await supabase.from("journey_definitions").insert(payload).select("id").single();
  if (error || !data) return { ok: false, error: "save_failed" };
  return { ok: true, id: String((data as { id: string }).id) };
}

export async function executeJourney(
  supabase: SupabaseClient,
  userId: string,
  journeyId: string,
  monthlyLimit: number,
  options?: { fixtureHtml?: string },
): Promise<{ ok: true; runs: number; runIds: string[] } | { ok: false; error: string; runIds: string[] }> {
  const { data, error } = await supabase
    .from("journey_definitions")
    .select(DEFINITION_COLUMNS)
    .eq("id", journeyId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "not_found", runIds: [] };
  const row = data as Record<string, unknown>;
  const journey = toPublic(row);
  const steps = resolveJourneySteps(journey.start_url, journey.steps);
  const secret = row.secret_credentials && typeof row.secret_credentials === "object" ? row.secret_credentials as Record<string, unknown> : {};
  const credentials = {
    username: typeof secret.username === "string" ? secret.username : "",
    password: typeof secret.password === "string" ? secret.password : "",
  };
  const pairs = journey.regions.flatMap((region) => journey.device_classes.map((device) => ({ region, device })));
  const observations = await countObservationsThisUtcMonth(supabase, userId);
  const used = (observations ?? 0) + await monthlyJourneyRuns(supabase, userId);
  if (observations == null || used + pairs.length > monthlyLimit) return { ok: false, error: "quota", runIds: [] };

  const runIds: string[] = [];
  let runs = 0;
  for (const pair of pairs) {
    const previous = await supabase
      .from("journey_runs")
      .select("steps")
      .eq("journey_id", journeyId)
      .eq("region", pair.region)
      .eq("device_class", pair.device)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const priorSteps = previous.data && Array.isArray((previous.data as { steps?: unknown }).steps)
      ? (previous.data as { steps: JourneyStepEvidence[] }).steps
      : null;
    const result = await runJourneyInBrowserless({
      url: journey.start_url,
      region: pair.region,
      deviceClass: pair.device,
      steps,
      credentials,
      fixtureHtml: journey.start_url.endsWith("/tests/journey") ? options?.fixtureHtml : undefined,
    });
    if (!result.ok) return { ok: false, error: result.error, runIds };
    const alert = journeyAlert(priorSteps, result.steps);
    const { data: inserted, error: insertError } = await supabase.from("journey_runs").insert({
      journey_id: journeyId,
      user_id: userId,
      region: pair.region,
      device_class: pair.device,
      environment: result.environment,
      status: result.status,
      steps: result.steps,
      alert,
      duration_ms: result.durationMs,
    }).select("id").single();
    if (insertError || !inserted) return { ok: false, error: "save_failed", runIds };
    runIds.push(String((inserted as { id: string }).id));
    runs += 1;
  }
  await supabase.from("journey_definitions").update({
    last_run_at: new Date().toISOString(),
    next_run_at: journey.watch_enabled ? computeNextRunAfter(new Date(), journey.watch_frequency, 1, 1).toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", journeyId);
  return { ok: true, runs, runIds };
}

export async function runDueJourneyWatches(
  supabase: SupabaseClient,
  limitForUser: (userId: string) => Promise<number>,
  options?: { fixtureHtml?: string },
): Promise<{ ran: number; skipped: number }> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("journey_definitions")
    .select("id, user_id")
    .eq("watch_enabled", true)
    .lte("next_run_at", now)
    .limit(8);
  if (error || !data) return { ran: 0, skipped: 0 };
  let ran = 0;
  let skipped = 0;
  for (const row of data as Array<{ id: string; user_id: string }>) {
    const limit = await limitForUser(row.user_id);
    const result = await executeJourney(supabase, row.user_id, row.id, limit, options);
    if (result.ok) ran += result.runs;
    else skipped += 1;
  }
  return { ran, skipped };
}
