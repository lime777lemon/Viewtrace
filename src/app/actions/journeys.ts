"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { getPlan } from "@/lib/plans";
import { discoveryJourneyCandidates, journeyStepsFromCandidates } from "@/lib/discovery-to-journey";
import { journeyStepHostAllowed, parseJourneySteps, type JourneyDeviceClass, type JourneyStepDefinition } from "@/lib/journey-definition";
import { loadObservationScrollInteraction } from "@/lib/observation-optional-metrics-store";
import { isValidObservationRegionForPlan } from "@/lib/regions";
import { normalizeUserUrlInput } from "@/lib/url-preview";
import { executeJourney, getJourney, saveJourney } from "@/lib/journey-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type JourneySaveInput = {
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
};

export async function saveJourneyAction(input: JourneySaveInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  const startUrl = normalizeUserUrlInput(input.startUrl);
  if (!startUrl) return { ok: false, error: "invalid_url" };
  const plan = getPlan(session.plan);
  const regions = input.regions.filter((region) => isValidObservationRegionForPlan(session.plan, region));
  const supabase = await createSupabaseServerClient();
  const saved = await saveJourney(supabase, session.userId, {
    ...input,
    startUrl,
    steps: parseJourneySteps(input.steps),
    regions,
    watchAllowed: plan.autoObservationWatch,
  });
  if (saved.ok) revalidatePath("/dashboard/journeys");
  return saved;
}

export async function runJourneyNowAction(id: string): Promise<{ ok: true; runs: number } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  const supabase = await createSupabaseServerClient();
  const result = await executeJourney(supabase, session.userId, id, getPlan(session.plan).monthlyObservations);
  if (result.ok) revalidatePath(`/dashboard/journeys/${id}`);
  return result;
}

export async function addDiscoveryToJourneyAction(input: {
  observationId: string;
  journeyId?: string;
  candidateIds: string[];
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  const supabase = await createSupabaseServerClient();
  const { data: observation, error } = await supabase
    .from("observations")
    .select("url, region")
    .eq("id", input.observationId)
    .maybeSingle();
  if (error || !observation) return { ok: false, error: "not_found" };
  const startUrl = normalizeUserUrlInput(typeof observation.url === "string" ? observation.url : "");
  const region = typeof observation.region === "string" ? observation.region : "";
  if (!startUrl || !isValidObservationRegionForPlan(session.plan, region)) return { ok: false, error: "region" };
  const stored = await loadObservationScrollInteraction(supabase, session.userId, input.observationId);
  const discovery = stored?.result?.discovery;
  if (!discovery) return { ok: false, error: "no_discovery" };
  const wanted = new Set(input.candidateIds);
  const selected = discoveryJourneyCandidates({
    transitions: discovery.transitions,
    blocked: discovery.safety.blocked,
  }).filter((candidate) => wanted.has(candidate.id));
  if (!selected.length) return { ok: false, error: "no_candidates" };
  const plan = getPlan(session.plan);
  const device: JourneyDeviceClass = discovery.environment?.device_class === "mobile" ? "mobile" : "desktop";
  if (input.journeyId) {
    const journey = await getJourney(supabase, session.userId, input.journeyId);
    if (!journey || !journeyStepHostAllowed(journey.start_url, startUrl)) return { ok: false, error: "host" };
    const known = new Set(journey.steps.map((step) => step.selector));
    const added = journeyStepsFromCandidates(startUrl, selected).filter((step) => step.kind === "click" && !known.has(step.selector));
    const steps = [...journey.steps, ...added].slice(0, 8);
    if (steps.length === journey.steps.length) return { ok: false, error: "already_added" };
    const saved = await saveJourney(supabase, session.userId, {
      id: journey.id,
      name: journey.name,
      startUrl: journey.start_url,
      steps,
      regions: journey.regions,
      deviceClasses: journey.device_classes,
      watchEnabled: journey.watch_enabled,
      watchFrequency: journey.watch_frequency,
      watchAllowed: plan.autoObservationWatch,
    });
    if (saved.ok) {
      revalidatePath("/dashboard/journeys");
      revalidatePath(`/dashboard/journeys/${saved.id}`);
    }
    return saved;
  }
  const name = selected[0]?.label.replace(/\s+/g, " ").trim().slice(0, 60) || "Discovered journey";
  const saved = await saveJourney(supabase, session.userId, {
    name,
    startUrl,
    steps: journeyStepsFromCandidates(startUrl, selected),
    regions: [region],
    deviceClasses: [device],
    watchEnabled: false,
    watchFrequency: "daily",
    watchAllowed: plan.autoObservationWatch,
  });
  if (saved.ok) {
    revalidatePath("/dashboard/journeys");
    revalidatePath(`/dashboard/journeys/${saved.id}`);
    revalidatePath(`/dashboard/observations/${input.observationId}`);
  }
  return saved;
}

export async function deleteJourneyAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("journey_definitions").delete().eq("id", id).eq("user_id", session.userId);
  if (error) return { ok: false, error: "delete_failed" };
  revalidatePath("/dashboard/journeys");
  return { ok: true };
}
