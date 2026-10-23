import type { Observation } from "@/lib/demo/observations";
import type { HtmlHeadSignalsV1 } from "@/lib/url-preview";
import {
  compareObservations,
  previousObservationForCompare,
  type ObservationCompareVerdict,
} from "@/lib/observation-compare";
import {
  homepageObservationModeFromConditions,
  isHomepageVideoContentType,
} from "@/lib/observation-homepage-mode";
import { buildJourneyRun } from "@/lib/observation-journey";
import {
  observationRuntimeFacts,
  selectJourneyRunsForObservation,
  type JourneyRunFacts,
  type ResourceCounts,
  type JourneyTraffic,
} from "@/lib/observation-measure-ledger";
import type { SessionSignalsV1 } from "@/lib/session-signals";
import type { SyntheticInteractionV1 } from "@/lib/observation-synthetic-interaction";

export const OBSERVATION_MEASUREMENT_IDS = [
  "visual",
  "http",
  "journey",
  "page_signals",
  "content",
  "network",
  "performance",
  "console",
] as const;

export type ObservationMeasurementId = (typeof OBSERVATION_MEASUREMENT_IDS)[number];

export type MeasurementPresence = "recorded" | "not_measured" | "optional";

export type VisualKind = "still" | "clip" | "live" | "none";

export type ObservationMeasurementRow =
  | {
      id: "visual";
      presence: "recorded" | "not_measured";
      kind: VisualKind;
    }
  | {
      id: "http";
      presence: "recorded" | "not_measured";
      status: number | null;
      finalUrl: string | null;
      redirected: boolean;
    }
  | {
      id: "journey";
      presence: "recorded" | "not_measured";
      overall: "pass" | "fail" | "not_run";
      stepCount: number;
    }
  | {
      id: "page_signals";
      presence: "recorded" | "not_measured";
      presentCount: number;
    }
  | {
      id: "content";
      presence: "recorded" | "not_measured";
      sampleSha256: string | null;
      sampleBytes: number | null;
    }
  | {
      id: "network";
      presence: "recorded" | "not_measured";
      resources: ResourceCounts | null;
      journey: Pick<JourneyTraffic, "requests" | "failed"> | null;
    }
  | {
      id: "console";
      presence: "recorded" | "not_measured";
      behavior: { consoleErrors: number; pageErrors: number } | null;
      journey: { consoleErrors: number; pageErrors: number } | null;
    }
  | {
      id: "performance";
      presence: "optional" | "not_measured";
      lcpMs: number | null;
      cls: number | null;
    };

export type ObservationMeasurementDiff = {
  id: string;
  verdict: ObservationCompareVerdict;
  previousValue: string;
  currentValue: string;
};

function text(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function hostPath(raw: string | null | undefined): string {
  const value = text(raw);
  if (!value) return "";
  try {
    const u = new URL(value);
    return `${u.host}${u.pathname}${u.search}`;
  } catch {
    return value;
  }
}

export function countHtmlHeadSignalsPresent(signals: HtmlHeadSignalsV1 | null | undefined): number {
  if (!signals) return 0;
  let n = 0;
  const push = (value: unknown) => {
    if (value == null) return;
    if (typeof value === "string" && !value.trim()) return;
    if (Array.isArray(value) && value.length === 0) return;
    n += 1;
  };
  push(signals.document_title);
  push(signals.meta_description);
  push(signals.canonical_url);
  push(signals.robots_meta);
  push(signals.x_robots_tag);
  push(signals.og_title);
  push(signals.og_description);
  push(signals.og_image);
  push(signals.json_ld_types);
  push(signals.html_lang);
  push(signals.viewport);
  push(signals.twitter_card);
  push(signals.twitter_title);
  push(signals.twitter_description);
  push(signals.twitter_image);
  if (signals.http_status != null && signals.http_status > 0) n += 1;
  if (signals.final_url) push(signals.final_url);
  if (signals.noindex === true || signals.noindex === false) n += 1;
  if (signals.canonical_mismatch === true || signals.canonical_mismatch === false) n += 1;
  return n;
}

export function observationHttpStatus(obs: Observation): number | null {
  const fromSignals = obs.captureConditions?.html_signals?.http_status;
  if (typeof fromSignals === "number" && fromSignals > 0) return fromSignals;
  const fromFacts = obs.captureConditions?.web_facts?.http.status;
  if (typeof fromFacts === "number" && fromFacts > 0) return fromFacts;
  const fromFetch = obs.captureConditions?.engine?.direct_fetch?.http_status;
  if (typeof fromFetch === "number" && fromFetch > 0) return fromFetch;
  return null;
}

export function observationFinalUrl(obs: Observation): string | null {
  const fromSignals = text(obs.captureConditions?.html_signals?.final_url);
  if (fromSignals) return fromSignals;
  const fromFacts = text(obs.captureConditions?.web_facts?.http.final_url);
  if (fromFacts) return fromFacts;
  const requested = text(obs.url);
  return requested || null;
}

function observationRedirected(obs: Observation): boolean {
  const requested = text(obs.url);
  const finalUrl = observationFinalUrl(obs);
  if (!requested || !finalUrl) return false;
  return hostPath(requested) !== hostPath(finalUrl);
}

export function observationVisualKind(obs: Observation): VisualKind {
  const mode = homepageObservationModeFromConditions(obs.captureConditions);
  if (mode === "live_check") return "live";
  if (mode === "share_clip" || isHomepageVideoContentType(obs.snapshotContentType)) return "clip";
  if (text(obs.snapshotImageUrl) && !obs.snapshotPurgedAt) return "still";
  return "none";
}

function htmlSample(obs: Observation): { sha256: string | null; bytes: number | null } {
  const html = obs.captureConditions?.web_facts?.html;
  const sha = text(html?.sample_sha256) || null;
  const bytes = typeof html?.sample_bytes === "number" ? html.sample_bytes : null;
  return { sha256: sha, bytes };
}

export function buildObservationMeasurements(
  obs: Observation,
  opts?: {
    synthetic?: SyntheticInteractionV1 | null;
    session?: SessionSignalsV1 | null;
    journeyRuns?: JourneyRunFacts[];
  },
): ObservationMeasurementRow[] {
  const visualKind = observationVisualKind(obs);
  const httpStatus = observationHttpStatus(obs);
  const finalUrl = observationFinalUrl(obs);
  const signalCount = countHtmlHeadSignalsPresent(obs.captureConditions?.html_signals);
  const sample = htmlSample(obs);
  const lab = obs.captureConditions?.lab_cwv;
  const hasLab = Boolean(lab && (lab.lcp_ms != null || lab.cls != null || lab.fcp_ms != null));
  const journey = buildJourneyRun({
    observationStatus: obs.status,
    synthetic: opts?.synthetic,
  });
  const matchedJourneys = selectJourneyRunsForObservation(obs, opts?.journeyRuns ?? []);
  const traffic = observationRuntimeFacts({ session: opts?.session, journeys: matchedJourneys });
  const consoleRecorded = Boolean(opts?.session) || Boolean(traffic.journey);

  return [
    {
      id: "visual",
      presence: visualKind === "none" ? "not_measured" : "recorded",
      kind: visualKind,
    },
    {
      id: "http",
      presence: httpStatus != null || finalUrl ? "recorded" : "not_measured",
      status: httpStatus,
      finalUrl,
      redirected: observationRedirected(obs),
    },
    {
      id: "journey",
      presence: journey.overall === "not_run" ? "not_measured" : "recorded",
      overall: journey.overall,
      stepCount: journey.steps.filter((step) => step.status !== "not_run").length,
    },
    {
      id: "page_signals",
      presence: signalCount > 0 ? "recorded" : "not_measured",
      presentCount: signalCount,
    },
    {
      id: "content",
      presence: sample.sha256 || (sample.bytes != null && sample.bytes > 0) ? "recorded" : "not_measured",
      sampleSha256: sample.sha256,
      sampleBytes: sample.bytes,
    },
    {
      id: "network",
      presence: traffic.resources || traffic.journey ? "recorded" : "not_measured",
      resources: traffic.resources,
      journey: traffic.journey ? { requests: traffic.journey.requests, failed: traffic.journey.failed } : null,
    },
    hasLab
      ? {
          id: "performance",
          presence: "optional",
          lcpMs: lab?.lcp_ms ?? null,
          cls: lab?.cls ?? null,
        }
      : { id: "performance", presence: "not_measured", lcpMs: null, cls: null },
    {
      id: "console",
      presence: consoleRecorded ? "recorded" : "not_measured",
      behavior: opts?.session
        ? { consoleErrors: opts.session.errors.console_error, pageErrors: opts.session.errors.pageerror }
        : null,
      journey: traffic.journey
        ? { consoleErrors: traffic.journey.consoleErrors, pageErrors: traffic.journey.pageErrors }
        : null,
    },
  ];
}

function shaShort(value: string | null | undefined): string {
  const hex = text(value);
  if (!hex) return "";
  return hex.slice(0, 12);
}

export function buildObservationMeasurementDiffs(
  current: Observation,
  previous: Observation,
): ObservationMeasurementDiff[] {
  const fields = compareObservations(previous, current);
  const rows: ObservationMeasurementDiff[] = fields.map((row) => ({
    id: row.key,
    verdict: row.verdict,
    previousValue: row.left,
    currentValue: row.right,
  }));

  const prevHttp = observationHttpStatus(previous);
  const curHttp = observationHttpStatus(current);
  if (prevHttp != null || curHttp != null) {
    rows.push({
      id: "http_status",
      verdict: String(prevHttp ?? "") === String(curHttp ?? "") ? "same" : "changed",
      previousValue: prevHttp != null ? String(prevHttp) : "",
      currentValue: curHttp != null ? String(curHttp) : "",
    });
  }

  const prevHtml = shaShort(htmlSample(previous).sha256);
  const curHtml = shaShort(htmlSample(current).sha256);
  if (prevHtml || curHtml) {
    rows.push({
      id: "html_sample",
      verdict: prevHtml && curHtml ? (prevHtml === curHtml ? "same" : "changed") : "unknown",
      previousValue: prevHtml,
      currentValue: curHtml,
    });
  }

  return rows;
}

export function measurementDiffsForPrevious(
  current: Observation,
  siblings: Observation[],
): { previous: Observation; diffs: ObservationMeasurementDiff[] } | null {
  const previous = previousObservationForCompare(current, siblings);
  if (!previous) return null;
  return { previous, diffs: buildObservationMeasurementDiffs(current, previous) };
}

export { hostPath as measurementUrlHostPath };
