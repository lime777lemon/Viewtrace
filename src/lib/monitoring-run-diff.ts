import { behaviorSectionLabel } from "@/lib/behavior-findings";
import type { JourneyDeviceClass } from "@/lib/journey-definition";
import { buildBehaviorDiff } from "@/lib/observation-behavior-diff";
import type { RegionalInteractionCheckV1 } from "@/lib/observation-regional-interaction";

export const MONITORING_DIFF_SCHEMA_VERSION = 1 as const;

export type MonitoringPageVerdict = "same" | "changed" | "not_comparable";

export type MonitoringPageDiff = {
  region: string;
  regionLabel: string;
  captured: boolean;
  verdict: MonitoringPageVerdict;
  currentObservationId: string | null;
  previousObservationId: string | null;
};

export type MonitoringBehaviorSection = "new" | "changed" | "missing" | "unchanged";

/** One stored map or type row. The key is the evidence identity, not a grouped finding. */
export type MonitoringBehaviorDiffRow = {
  region: string;
  environment: JourneyDeviceClass | null;
  section: MonitoringBehaviorSection;
  key: string;
  label: string;
  previous: string | null;
  current: string;
  selector: string | null;
  known: boolean;
};

export type MonitoringBehaviorDiff = {
  measured: boolean;
  compared: boolean;
  rows: MonitoringBehaviorDiffRow[];
};

export type MonitoringJourneyStepDiff = {
  id: string;
  label: string;
  expected: string;
  previousStatus: string | null;
  currentStatus: string;
  previousObserved: string | null;
  currentObserved: string | null;
  regression: boolean;
};

export type MonitoringAlertSeverity = "critical" | "warning" | "info";

export type MonitoringJourneyDiff = {
  region: string;
  environment: JourneyDeviceClass;
  name: string;
  previousStatus: "passed" | "failed" | "blocked" | "incomplete" | null;
  currentStatus: "passed" | "failed" | "blocked" | "incomplete";
  /** User-marked required journey. Raises Passed → Blocked from Info to Warning. */
  required: boolean;
  verdict: "unchanged" | "regression" | "blocked_candidate" | "recorded";
  steps: MonitoringJourneyStepDiff[];
};

export type MonitoringRunDiff = {
  schemaVersion: typeof MONITORING_DIFF_SCHEMA_VERSION;
  previousRunId: string | null;
  pages: MonitoringPageDiff[];
  behavior: MonitoringBehaviorDiff;
  journeys: MonitoringJourneyDiff[];
};

export type MonitoringAlert =
  | {
      id: string;
      layer: "page";
      level: "attention";
      code: "screenshot_differs" | "screenshot_not_comparable";
      region: string;
      paired: boolean;
      severity: MonitoringAlertSeverity;
    }
  | {
      id: string;
      layer: "behavior";
      level: "alert";
      code: "behavior_regression" | "behavior_missing" | "behavior_new_unknown";
      region: string;
      label: string;
      previous: string | null;
      current: string;
      severity: MonitoringAlertSeverity;
    }
  | {
      id: string;
      layer: "journey";
      level: "alert" | "candidate";
      code: "journey_failed" | "journey_blocked";
      region: string;
      environment: JourneyDeviceClass;
      name: string;
      previous: string | null;
      current: string;
      required: boolean;
      severity: MonitoringAlertSeverity;
      steps: Array<{ label: string; expected: string; previous: string; current: string }>;
    };

export type MonitoringJourneyStepInput = {
  id: string;
  label: string;
  expected: string;
  status: "pass" | "fail" | "blocked_for_safety" | "not_run" | "incomplete" | "not_measured";
  before: string | null;
  after: string | null;
};

export type MonitoringJourneyInput = {
  region: string;
  environment: JourneyDeviceClass;
  name: string;
  status: "passed" | "failed" | "blocked" | "incomplete";
  /** When true, Passed → Blocked is Warning. Default is Info. */
  required?: boolean;
  steps: MonitoringJourneyStepInput[];
};

function observedPair(before: string | null, after: string | null): string | null {
  if (before == null && after == null) return null;
  return `${before ?? ""} → ${after ?? ""}`;
}

export function diffMonitoringPage(input: {
  region: string;
  regionLabel: string;
  captured: boolean;
  verdict: "same" | "changed" | "incomparable" | "unknown" | null;
  currentObservationId: string | null;
  previousObservationId: string | null;
}): MonitoringPageDiff {
  let verdict: MonitoringPageVerdict = "not_comparable";
  if (input.captured && input.previousObservationId && input.verdict === "same") verdict = "same";
  else if (input.captured && input.previousObservationId && input.verdict === "changed") verdict = "changed";
  return {
    region: input.region,
    regionLabel: input.regionLabel,
    captured: input.captured,
    verdict,
    currentObservationId: input.currentObservationId,
    previousObservationId: input.previousObservationId,
  };
}

function behaviorEnvironment(check: RegionalInteractionCheckV1 | null): JourneyDeviceClass | null {
  const device = check?.discovery?.environment?.device_class;
  return device === "desktop" || device === "mobile" ? device : null;
}

/** Behavior diff reads the stored check and its map. Grouped findings are not an input. */
export function diffMonitoringBehavior(input: {
  region: string;
  current: RegionalInteractionCheckV1 | null;
  previous: RegionalInteractionCheckV1 | null;
  previousObservationId: string | null;
}): MonitoringBehaviorDiffRow[] {
  if (!input.current || !input.previous) return [];
  const built = buildBehaviorDiff(input.previous, input.current, input.previousObservationId);
  const environment = behaviorEnvironment(input.current) ?? behaviorEnvironment(input.previous);
  return built.map_diffs.map((row) => {
    const known = row.type != null;
    const selector = row.selector;
    const label = known
      ? row.label
      : (selector ? behaviorSectionLabel(selector) ?? row.label : row.label);
    return {
      region: input.region,
      environment,
      section: row.section,
      key: known ? `type:${row.type}` : `map:${selector ?? row.label}`,
      label,
      previous: known ? row.detail.split(" → ")[0] ?? null : null,
      current: known ? (row.detail.split(" → ")[1] ?? row.detail) : row.detail,
      selector,
      known,
    };
  });
}

function journeyVerdict(
  previous: MonitoringJourneyInput["status"] | null,
  current: MonitoringJourneyInput["status"],
): MonitoringJourneyDiff["verdict"] {
  if (!previous || previous === current) return previous ? "unchanged" : "recorded";
  if (previous === "passed" && current === "failed") return "regression";
  if (previous === "passed" && current === "blocked") return "blocked_candidate";
  return "recorded";
}

export function diffMonitoringJourney(
  current: MonitoringJourneyInput,
  previous: MonitoringJourneyInput | null,
): MonitoringJourneyDiff {
  const priorSteps = new Map((previous?.steps ?? []).map((step) => [step.id, step]));
  const steps: MonitoringJourneyStepDiff[] = [];
  for (const step of current.steps) {
    const prior = priorSteps.get(step.id) ?? null;
    const previousObserved = prior ? observedPair(prior.before, prior.after) : null;
    const currentObserved = observedPair(step.before, step.after);
    const failedNow = step.status === "fail" || step.status === "blocked_for_safety";
    const regression = Boolean(prior && prior.status === "pass" && failedNow);
    const changed = regression
      || (prior != null && (prior.status !== step.status || previousObserved !== currentObserved));
    if (!changed && prior) continue;
    if (!prior && !failedNow) continue;
    steps.push({
      id: step.id,
      label: step.label,
      expected: step.expected,
      previousStatus: prior?.status ?? null,
      currentStatus: step.status,
      previousObserved,
      currentObserved,
      regression,
    });
  }
  return {
    region: current.region,
    environment: current.environment,
    name: current.name,
    previousStatus: previous?.status ?? null,
    currentStatus: current.status,
    required: current.required === true,
    verdict: journeyVerdict(previous?.status ?? null, current.status),
    steps,
  };
}

/** Severity is fixed when the alert is saved. Notification policy does not change it. */
export function monitoringAlertSeverity(alert: {
  layer: string;
  code: string;
  required?: boolean;
  severity?: MonitoringAlertSeverity;
}): MonitoringAlertSeverity {
  if (alert.severity === "critical" || alert.severity === "warning" || alert.severity === "info") return alert.severity;
  if (alert.layer === "journey" && alert.code === "journey_failed") return "critical";
  if (alert.layer === "journey" && alert.code === "journey_blocked") return alert.required ? "warning" : "info";
  if (alert.layer === "behavior") return "warning";
  return "info";
}

export function buildMonitoringRunDiff(input: {
  previousRunId: string | null;
  pages: MonitoringPageDiff[];
  behaviorChecks: Array<{
    region: string;
    current: RegionalInteractionCheckV1 | null;
    previous: RegionalInteractionCheckV1 | null;
    previousObservationId: string | null;
  }>;
  journeys: Array<{ current: MonitoringJourneyInput; previous: MonitoringJourneyInput | null }>;
}): MonitoringRunDiff {
  const rows = input.behaviorChecks.flatMap((row) => diffMonitoringBehavior(row));
  const measured = input.behaviorChecks.some((row) => row.current != null);
  const compared = input.behaviorChecks.some((row) => row.current != null && row.previous != null);
  return {
    schemaVersion: MONITORING_DIFF_SCHEMA_VERSION,
    previousRunId: input.previousRunId,
    pages: input.pages,
    behavior: { measured, compared, rows },
    journeys: input.journeys.map((row) => diffMonitoringJourney(row.current, row.previous)),
  };
}

function stepAlert(step: MonitoringJourneyStepDiff): { label: string; expected: string; previous: string; current: string } | null {
  if (!step.regression) return null;
  return {
    label: step.label,
    expected: step.expected,
    previous: step.previousObserved ?? step.previousStatus ?? "",
    current: step.currentObserved ?? step.currentStatus,
  };
}

/** Stable id for one atomic behavior alert. Summary grouping does not change this id. */
export function monitoringBehaviorAlertId(row: MonitoringBehaviorDiffRow): string {
  const suffix = row.section === "missing" ? "missing" : row.section === "changed" ? "changed" : "new";
  return `behavior:${row.region}:${row.key}:${suffix}`;
}

/** Alerts are a selection of the saved diff. Unchanged rows and new known Working stay in the diff only. */
export function selectMonitoringAlerts(diff: MonitoringRunDiff): MonitoringAlert[] {
  const alerts: MonitoringAlert[] = [];
  for (const page of diff.pages) {
    if (!page.captured) continue;
    if (page.verdict === "changed") {
      alerts.push({
        id: `page:${page.region}:changed`,
        layer: "page",
        level: "attention",
        code: "screenshot_differs",
        region: page.regionLabel || page.region,
        paired: true,
        severity: "info",
      });
    } else if (page.verdict === "not_comparable") {
      alerts.push({
        id: `page:${page.region}:not_comparable`,
        layer: "page",
        level: "attention",
        code: "screenshot_not_comparable",
        region: page.regionLabel || page.region,
        paired: Boolean(page.previousObservationId),
        severity: "info",
      });
    }
  }
  for (const row of diff.behavior.rows) {
    if (row.section === "unchanged") continue;
    if (row.section === "new" && row.known) continue;
    if (row.section === "missing") {
      alerts.push({
        id: monitoringBehaviorAlertId(row),
        layer: "behavior",
        level: "alert",
        code: "behavior_missing",
        region: row.region,
        label: row.label,
        previous: row.previous,
        current: row.current,
        severity: "warning",
      });
      continue;
    }
    if (row.section === "changed") {
      alerts.push({
        id: monitoringBehaviorAlertId(row),
        layer: "behavior",
        level: "alert",
        code: "behavior_regression",
        region: row.region,
        label: row.label,
        previous: row.previous,
        current: row.current,
        severity: "warning",
      });
      continue;
    }
    if (row.section === "new") {
      alerts.push({
        id: monitoringBehaviorAlertId(row),
        layer: "behavior",
        level: "alert",
        code: "behavior_new_unknown",
        region: row.region,
        label: row.label,
        previous: null,
        current: row.current,
        severity: "warning",
      });
    }
  }
  for (const journey of diff.journeys) {
    const steps = journey.steps.flatMap((step) => {
      const alert = stepAlert(step);
      return alert ? [alert] : [];
    });
    if (journey.verdict === "regression" || (journey.currentStatus === "failed" && journey.previousStatus !== "failed")) {
      alerts.push({
        id: `journey:${journey.region}:${journey.environment}:failed`,
        layer: "journey",
        level: "alert",
        code: "journey_failed",
        region: journey.region,
        environment: journey.environment,
        name: journey.name,
        previous: journey.previousStatus,
        current: journey.currentStatus,
        required: journey.required,
        severity: "critical",
        steps,
      });
      continue;
    }
    if (journey.verdict === "blocked_candidate" || (journey.currentStatus === "blocked" && journey.previousStatus !== "blocked")) {
      alerts.push({
        id: `journey:${journey.region}:${journey.environment}:blocked`,
        layer: "journey",
        level: "candidate",
        code: "journey_blocked",
        region: journey.region,
        environment: journey.environment,
        name: journey.name,
        previous: journey.previousStatus,
        current: journey.currentStatus,
        required: journey.required,
        severity: journey.required ? "warning" : "info",
        steps,
      });
    }
  }
  return alerts;
}

export function monitoringReviewStatus(input: {
  incomplete: boolean;
  alerts: readonly MonitoringAlert[];
}): "incomplete" | "attention_needed" | "blocked" | "healthy" {
  if (input.incomplete) return "incomplete";
  if (input.alerts.some((alert) => alert.level === "attention" || alert.level === "alert")) return "attention_needed";
  if (input.alerts.some((alert) => alert.level === "candidate")) return "blocked";
  return "healthy";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseMonitoringRunDiff(raw: unknown): MonitoringRunDiff | null {
  if (!isRecord(raw) || raw.schemaVersion !== MONITORING_DIFF_SCHEMA_VERSION) return null;
  if (!Array.isArray(raw.pages) || !isRecord(raw.behavior) || !Array.isArray(raw.journeys)) return null;
  return raw as MonitoringRunDiff;
}

export function parseMonitoringAlerts(raw: unknown): MonitoringAlert[] | null {
  if (!Array.isArray(raw)) return null;
  const alerts: MonitoringAlert[] = [];
  for (const row of raw) {
    if (!isRecord(row) || typeof row.id !== "string" || typeof row.layer !== "string") return null;
    alerts.push(row as MonitoringAlert);
  }
  return alerts;
}

export function behaviorPlaceLabel(selector: string | null, fallback: string): string {
  if (!selector) return fallback;
  return behaviorSectionLabel(selector) ?? fallback;
}
