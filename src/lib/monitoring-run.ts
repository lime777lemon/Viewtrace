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

/**
 * One user check is one region × one environment.
 * Page, metadata, and rendered behavior are inside that check.
 * Journey steps run in the same check and do not add another one.
 */
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
  const pageObservations = regions.length * environments.length;
  const journeyRuns = input.workflowSteps > 0 ? pageObservations : 0;
  return {
    regions,
    environments,
    pageObservations,
    journeyRuns,
    total: pageObservations,
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

/**
 * Diff compares this completed Monitoring Run with the previous completed run
 * of the same target URL and region. Journey results also match environment.
 * Page scope leaves environment null.
 */
export type MonitoringDiffScope = {
  targetUrl: string;
  region: string;
  environment: "desktop" | "mobile" | null;
};

export function monitoringDiffScope(input: {
  targetUrl: string;
  region: string;
  environment?: "desktop" | "mobile" | null;
}): MonitoringDiffScope {
  const environment = input.environment === "desktop" || input.environment === "mobile" ? input.environment : null;
  return {
    targetUrl: input.targetUrl.trim(),
    region: input.region.trim(),
    environment,
  };
}

export type MonitoringStatusReason =
  | { code: "screenshot_differs"; region: string }
  | { code: "screenshot_not_comparable"; region: string }
  | { code: "page_incomplete"; region: string }
  | { code: "behavior_new" }
  | { code: "journey_failed"; name: string }
  | { code: "journey_incomplete"; name: string }
  | { code: "journey_blocked"; name: string };

/** Facts that explain a non-healthy parent status. An unmeasured behavior is not a reason. */
export function monitoringStatusReasons(input: {
  pages: Array<{ label: string; fact: MonitoringPageFact }>;
  journeys: Array<{ name: string; status: MonitoringJourneyFact }>;
  newUnknown: boolean;
}): MonitoringStatusReason[] {
  const reasons: MonitoringStatusReason[] = [];
  for (const page of input.pages) {
    if (page.fact === "incomplete") reasons.push({ code: "page_incomplete", region: page.label });
    else if (page.fact === "changed") reasons.push({ code: "screenshot_differs", region: page.label });
    else if (page.fact === "not_comparable") reasons.push({ code: "screenshot_not_comparable", region: page.label });
  }
  if (input.newUnknown) reasons.push({ code: "behavior_new" });
  for (const journey of input.journeys) {
    if (journey.status === "failed") reasons.push({ code: "journey_failed", name: journey.name });
    else if (journey.status === "incomplete") reasons.push({ code: "journey_incomplete", name: journey.name });
    else if (journey.status === "blocked") reasons.push({ code: "journey_blocked", name: journey.name });
  }
  return reasons;
}

export type MonitoringPreviousPage = {
  region: string;
  label: string;
  device: "desktop" | "mobile" | null;
};

function placeLabel(label: string, device: "desktop" | "mobile" | null): string {
  if (device === "mobile") return `${label} · Mobile`;
  if (device === "desktop") return `${label} · Desktop`;
  return label;
}

function joinPlaces(locale: "ja" | "en", places: string[]): string {
  if (places.length <= 1) return places[0] ?? "";
  if (locale === "ja") return places.length === 2 ? `${places[0]} と ${places[1]}` : places.join("、");
  if (places.length === 2) return `${places[0]} and ${places[1]}`;
  return `${places.slice(0, -1).join(", ")}, and ${places[places.length - 1]}`;
}

/** Display only. A missing same-region screenshot stays Not comparable. */
export function firstScreenshotCompareNote(input: {
  locale: "ja" | "en";
  regionLabel: string;
  device: "desktop" | "mobile" | null;
  previousPages: readonly MonitoringPreviousPage[];
}): string {
  const here = placeLabel(input.regionLabel, input.device);
  const others = input.previousPages
    .map((page) => placeLabel(page.label || page.region, page.device))
    .filter(Boolean);
  if (input.locale === "ja") {
    if (others.length === 0) {
      return `この URL の ${here} は、この記録が最初です。比べる前回の画像がないので、Same にも Changed にもせず Not comparable にしています。`;
    }
    return `この URL の ${here} は、この記録が最初です。直前の確認は同じ URL の ${joinPlaces("ja", others)} だけで、${input.regionLabel} の画像はありません。比較は同じ地域の前回だけを見るので、Same にも Changed にもせず Not comparable にしています。`;
  }
  if (others.length === 0) {
    return `This is the first ${here} record for this URL. There is no earlier screenshot from this region, so it stays Not comparable.`;
  }
  return `This is the first ${here} record for this URL. The previous check for this URL recorded only ${joinPlaces("en", others)}, so there is no ${input.regionLabel} screenshot. Comparison uses the previous record from the same region, so this stays Not comparable.`;
}
