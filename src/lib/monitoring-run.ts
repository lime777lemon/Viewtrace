import type { JourneyDeviceClass } from "@/lib/journey-definition";

export type MonitoringParentStatus = "incomplete" | "attention_needed" | "blocked" | "healthy";

export type MonitoringPageFact = "same" | "changed" | "not_comparable" | "incomplete";

export type MonitoringJourneyFact = "passed" | "failed" | "blocked" | "incomplete";

export type MonitoringCheckPlan = {
  regions: string[];
  environments: JourneyDeviceClass[];
  pageObservations: number;
  journeyRuns: number;
  total: number;
};

/** Page observations are one per region. Journey sessions run only when a step follows open URL. */
export function monitoringCheckPlan(input: {
  regions: string[];
  environments: JourneyDeviceClass[];
  workflowSteps: number;
}): MonitoringCheckPlan {
  const regions: string[] = [];
  for (const region of input.regions) {
    const value = region.trim();
    if (!value || regions.includes(value) || regions.length >= 4) continue;
    regions.push(value);
  }
  const environments: JourneyDeviceClass[] = [];
  for (const device of input.environments) {
    if ((device === "desktop" || device === "mobile") && !environments.includes(device)) environments.push(device);
  }
  const pageObservations = regions.length;
  const journeyRuns = input.workflowSteps > 0 ? regions.length * environments.length : 0;
  return {
    regions,
    environments,
    pageObservations,
    journeyRuns,
    total: pageObservations + journeyRuns,
  };
}

export function monitoringPageFact(input: {
  captured: boolean;
  verdict: "same" | "changed" | "incomparable" | "unknown" | null;
}): MonitoringPageFact {
  if (!input.captured) return "incomplete";
  if (input.verdict === "same") return "same";
  if (input.verdict === "changed") return "changed";
  return "not_comparable";
}

export function monitoringJourneyFact(status: string | null): MonitoringJourneyFact {
  if (status === "passed" || status === "failed" || status === "blocked") return status;
  return "incomplete";
}

export function parseMonitoringRunPlan(raw: unknown): {
  regions: string[];
  environments: JourneyDeviceClass[];
  workflowSteps: number;
} {
  const row = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const regions = Array.isArray(row.regions)
    ? row.regions.filter((value): value is string => typeof value === "string" && value.trim().length > 0).slice(0, 4)
    : [];
  const environments = Array.isArray(row.environments)
    ? row.environments.filter((value): value is JourneyDeviceClass => value === "desktop" || value === "mobile")
    : [];
  const workflowSteps = typeof row.workflowSteps === "number" && Number.isFinite(row.workflowSteps)
    ? Math.max(0, Math.round(row.workflowSteps))
    : 0;
  return { regions, environments, workflowSteps };
}

/** Incomplete outranks a Journey failure. Changed and Not comparable ask for review. Blocked is only the safety boundary. */
export function monitoringParentStatus(input: {
  pages: MonitoringPageFact[];
  journeys: MonitoringJourneyFact[];
  newUnknown: boolean;
}): MonitoringParentStatus {
  if (
    input.pages.length === 0
    || input.pages.some((page) => page === "incomplete")
    || input.journeys.some((journey) => journey === "incomplete")
  ) {
    return "incomplete";
  }
  if (
    input.newUnknown
    || input.pages.some((page) => page === "changed" || page === "not_comparable")
    || input.journeys.some((journey) => journey === "failed")
  ) {
    return "attention_needed";
  }
  if (input.journeys.some((journey) => journey === "blocked")) return "blocked";
  return "healthy";
}
