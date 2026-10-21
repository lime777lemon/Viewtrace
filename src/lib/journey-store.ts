import type { SupabaseClient } from "@supabase/supabase-js";
import { credentialsSatisfyJourney } from "@/lib/monitoring-watch";
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
import { normalizeUserUrlInput } from "@/lib/url-preview";

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
  credentials_ready: boolean;
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
  const steps = parseJourneySteps(row.steps);
  const username = typeof secret.username === "string" ? secret.username : "";
  const password = typeof secret.password === "string" ? secret.password : "";
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    start_url: String(row.start_url ?? ""),
    steps,
    regions: Array.isArray(row.regions) ? row.regions.filter((value): value is string => typeof value === "string").slice(0, 4) : [],
    device_classes: asDevices(row.device_classes),
    watch_enabled: row.watch_enabled === true,
    watch_frequency: row.watch_frequency === "weekly" ? "weekly" : "daily",
    next_run_at: typeof row.next_run_at === "string" ? row.next_run_at : null,
    last_run_at: typeof row.last_run_at === "string" ? row.last_run_at : null,
    has_credentials: username.length > 0,
    credentials_ready: credentialsSatisfyJourney(steps, { username, password }),
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
    /** Leave an existing schedule untouched. Enabling goes through the monitoring preflight. */
    preserveWatch?: boolean;
  },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const startUrl = normalizeUserUrlInput(input.startUrl);
  if (!startUrl) return { ok: false, error: "invalid_url" };
  const steps = resolveJourneySteps(startUrl, parseJourneySteps(input.steps));
  const invalid = validateJourneySteps(startUrl, steps);
  if (invalid) return { ok: false, error: invalid };
  const regions = input.regions.map((region) => region.trim()).filter(Boolean).slice(0, 4);
  if (!regions.length) return { ok: false, error: "region_required" };
  const devices = input.deviceClasses.filter((device) => device === "desktop" || device === "mobile").slice(0, 2);
  if (!devices.length) return { ok: false, error: "environment_required" };
  const frequency: WatchFrequency = input.watchFrequency === "weekly" ? "weekly" : "daily";
  const payload: Record<string, unknown> = {
    user_id: userId,
    name: input.name.trim().slice(0, 80),
    start_url: startUrl,
    steps,
    regions,
    device_classes: devices,
    updated_at: new Date().toISOString(),
  };
  if (!(input.preserveWatch && input.id)) {
    payload.watch_enabled = false;
    payload.watch_frequency = frequency;
    payload.next_run_at = null;
  }
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
  options?: {
    fixtureHtml?: string;
    pairs?: Array<{ region: string; device: JourneyDeviceClass }>;
    /** Manual runs move a legacy Journey Watch. A Monitoring Watch advances its own schedule. */
    advanceSchedule?: boolean;
  },
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
  const startUrl = normalizeUserUrlInput(journey.start_url);
  if (!startUrl) return { ok: false, error: "invalid_url", runIds: [] };
  const steps = resolveJourneySteps(startUrl, journey.steps);
  const invalid = validateJourneySteps(startUrl, steps);
  if (invalid) return { ok: false, error: invalid, runIds: [] };
  await supabase.from("journey_definitions").update({
    start_url: startUrl,
    steps,
    updated_at: new Date().toISOString(),
  }).eq("id", journeyId).eq("user_id", userId);
  const secret = row.secret_credentials && typeof row.secret_credentials === "object" ? row.secret_credentials as Record<string, unknown> : {};
  const credentials = {
    username: typeof secret.username === "string" ? secret.username : "",
    password: typeof secret.password === "string" ? secret.password : "",
  };
  const pairs = (options?.pairs ?? journey.regions.flatMap((region) => journey.device_classes.map((device) => ({ region, device }))))
    .filter((pair) => pair.region.trim() && (pair.device === "desktop" || pair.device === "mobile"))
    .slice(0, 8);
  if (!pairs.length) return { ok: false, error: "region_required", runIds: [] };
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
      url: startUrl,
      region: pair.region,
      deviceClass: pair.device,
      steps,
      credentials,
      fixtureHtml: startUrl.endsWith("/tests/journey") ? options?.fixtureHtml : undefined,
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
  const advanceSchedule = options?.advanceSchedule !== false;
  await supabase.from("journey_definitions").update({
    last_run_at: new Date().toISOString(),
    next_run_at: advanceSchedule && journey.watch_enabled
      ? computeNextRunAfter(new Date(), journey.watch_frequency, 1, 1).toISOString()
      : journey.next_run_at,
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
  const covered = new Set<string>();
  const watches = await supabase.from("monitoring_watches").select("id").eq("enabled", true);
  const watchIds = !watches.error && Array.isArray(watches.data)
    ? (watches.data as Array<{ id?: string }>).map((watch) => watch.id).filter((id): id is string => typeof id === "string")
    : [];
  if (watchIds.length) {
    const links = await supabase.from("monitoring_watch_journeys").select("journey_id").in("monitoring_watch_id", watchIds);
    if (!links.error && Array.isArray(links.data)) {
      for (const link of links.data as Array<{ journey_id?: string }>) {
        if (typeof link.journey_id === "string") covered.add(link.journey_id);
      }
    }
  }
  let ran = 0;
  let skipped = 0;
  for (const row of data as Array<{ id: string; user_id: string }>) {
    if (covered.has(row.id)) continue;
    const limit = await limitForUser(row.user_id);
    const result = await executeJourney(supabase, row.user_id, row.id, limit, options);
    if (result.ok) ran += result.runs;
    else skipped += 1;
  }
  return { ran, skipped };
}
