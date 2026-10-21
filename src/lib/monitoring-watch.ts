import {
  resolveJourneyOpenUrl,
  validateJourneySteps,
  type JourneyDeviceClass,
  type JourneyStepDefinition,
} from "@/lib/journey-definition";

export type MonitoringSchedule = "daily" | "weekly";

export type MonitoringPreflight = {
  urlValid: boolean;
  definitionValid: boolean;
  credentialsAvailable: boolean;
  selectionValid: boolean;
  capacityAvailable: boolean;
  testRunPassed: boolean;
  requiredChecks: number;
  availableChecks: number | null;
  /** One extra check when a saved success does not exist yet. */
  testRunChecks: number;
  ready: boolean;
};

type ProofStep = { kind?: string; status?: string; detail?: string | null };

export function journeyOpenFailedInvalidUrl(detail: string | null | undefined): boolean {
  return /invalid url/i.test(detail ?? "");
}

/** A failed navigation to a scheme-less URL is not proof that monitoring can start. */
export function journeyRunProvesMonitoring(status: string, steps: ProofStep[]): boolean {
  if (status !== "passed") return false;
  const open = steps.find((step) => step.kind === "open_url");
  if (!open || open.status !== "pass") return false;
  if (journeyOpenFailedInvalidUrl(open.detail)) return false;
  return true;
}

export function journeyCredentialsRequired(steps: JourneyStepDefinition[]): boolean {
  return steps.some((step) => step.value.includes("{{username}}") || step.value.includes("{{password}}"));
}

export function credentialsSatisfyJourney(
  steps: JourneyStepDefinition[],
  secret: { username?: string; password?: string },
): boolean {
  if (!journeyCredentialsRequired(steps)) return true;
  return Boolean(secret.username && secret.password);
}

export function normalizeMonitoringSelection(input: {
  regions: string[];
  environments: JourneyDeviceClass[];
}): { regions: string[]; environments: JourneyDeviceClass[] } {
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
  return { regions, environments };
}

/** Journey sessions only. Page observations are a separate Monitoring Watch flag. */
export function journeyMonitoringChecks(regions: string[], environments: JourneyDeviceClass[]): number {
  const selection = normalizeMonitoringSelection({ regions, environments });
  return selection.regions.length * selection.environments.length;
}

/** One page observation per region, plus one Journey Run per region and environment. */
export function monitoringExecutionChecks(input: {
  includePage: boolean;
  regions: string[];
  environments: JourneyDeviceClass[];
  journeys: number;
}): number {
  const selection = normalizeMonitoringSelection(input);
  const pages = input.includePage ? selection.regions.length : 0;
  const journeyCount = Math.max(0, Math.floor(input.journeys));
  const journeyRuns = journeyCount > 0 ? selection.regions.length * selection.environments.length * journeyCount : 0;
  return pages + journeyRuns;
}

export function evaluateMonitoringPreflight(input: {
  startUrl: string;
  steps: JourneyStepDefinition[];
  regions: string[];
  environments: JourneyDeviceClass[];
  credentialsAvailable: boolean;
  availableChecks: number | null;
  runs: Array<{ status: string; steps: ProofStep[] }>;
}): MonitoringPreflight {
  const start = resolveJourneyOpenUrl(input.startUrl, input.startUrl);
  const open = input.steps.find((step) => step.kind === "open_url");
  const urlValid = Boolean(start && open && resolveJourneyOpenUrl(start, open.url || start));
  const definitionValid = urlValid && validateJourneySteps(start ?? input.startUrl, input.steps) == null;
  const selection = normalizeMonitoringSelection(input);
  const selectionValid = selection.regions.length > 0 && selection.environments.length > 0;
  const requiredChecks = selection.regions.length * selection.environments.length;
  const testRunPassed = input.runs.some((run) => journeyRunProvesMonitoring(run.status, run.steps));
  const testRunChecks = testRunPassed ? 0 : 1;
  const needed = requiredChecks + testRunChecks;
  const capacityAvailable = input.availableChecks != null && needed > 0 && input.availableChecks >= needed;
  const credentialsAvailable = input.credentialsAvailable;
  const ready = urlValid && definitionValid && credentialsAvailable && selectionValid && capacityAvailable && testRunPassed;
  return {
    urlValid,
    definitionValid,
    credentialsAvailable,
    selectionValid,
    capacityAvailable,
    testRunPassed,
    requiredChecks,
    availableChecks: input.availableChecks,
    testRunChecks,
    ready,
  };
}

/** Short capacity runs nothing. An unknown balance does not invent a skip record. */
export function scheduledRunDecision(
  required: number,
  available: number | null,
): "execute" | "skip" | "unknown" {
  if (available == null) return "unknown";
  if (required < 1 || available < required) return "skip";
  return "execute";
}
