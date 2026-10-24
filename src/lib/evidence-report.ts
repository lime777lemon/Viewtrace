import type { Observation } from "@/lib/demo/observations";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import {
  compareObservations,
  previousObservationForCompare,
  type ObservationCompareField,
} from "@/lib/observation-compare";
import { observationGeoCopyFrom, observationGeoReadout } from "@/lib/observation-geo-readout";
import {
  observationLedgerCopy,
  selectJourneyRunsForObservation,
  type JourneyRunFacts,
} from "@/lib/observation-measure-ledger";
import { observationHttpStatus } from "@/lib/observation-measurements";
import { parseMotionTrace } from "@/lib/motion-frames";
import { parseMotionDriver, type MotionDriverEvidence } from "@/lib/motion-driver";
import type { InteractionTypeRow } from "@/lib/observation-regional-interaction";
import type { ScrollInteractionStatus } from "@/lib/observation-scroll-interaction";
import type { SyntheticInteractionV1 } from "@/lib/observation-synthetic-interaction";
import type { SessionSignalsV1 } from "@/lib/session-signals";

export type EvidenceReportVerdict = "same" | "changed" | "incomparable";

export type EvidenceReportFact = {
  key: "screenshot" | "title" | "canonical" | "robots" | "ogImage";
  verdict: EvidenceReportVerdict;
  previous: string;
  current: string;
  hint: string | null;
};

export type EvidenceReportBehaviorRow = {
  type: InteractionTypeRow["type"];
  status: ScrollInteractionStatus;
  driver?: MotionDriverEvidence;
  lines?: string[];
};

export type EvidenceReportJourneyStatus =
  | "pass"
  | "fail"
  | "blocked_for_safety"
  | "incomplete"
  | "no_safe_target";

export type EvidenceReportJourneyRow = {
  label: string;
  status: EvidenceReportJourneyStatus;
};

export type EvidenceReportFacts = {
  region: { requested: string; observed: string | null };
  reachability: {
    http: string | null;
    finalUrl: string | null;
    pageTitle: string | null;
    dns: string | null;
    tls: string | null;
  };
  detected: {
    previousCapturedAt: string;
    fields: EvidenceReportFact[];
  } | null;
  behavior: EvidenceReportBehaviorRow[] | null;
  journey: EvidenceReportJourneyRow[] | null;
};

const DETECTED_KEYS = ["screenshot", "title", "canonical", "robots", "ogImage"] as const;

function text(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function recordedFinalUrl(obs: Observation, session: SessionSignalsV1 | null): string | null {
  return (
    text(obs.captureConditions?.html_signals?.final_url) ||
    text(obs.captureConditions?.web_facts?.http.final_url) ||
    text(session?.http.final_url) ||
    null
  );
}

function recordedTitle(obs: Observation): string | null {
  return text(obs.captureConditions?.html_signals?.document_title) || text(obs.pageTitle) || null;
}

function tlsText(connection: SessionSignalsV1["connection"] | null | undefined, locale: Locale): string | null {
  const copyLedger = observationLedgerCopy(locale);
  if (!connection || (connection.tls_ms == null && connection.secure == null && !connection.protocol)) {
    return null;
  }
  if (connection.secure === false) return copyLedger.tlsNone;
  const protocol = connection.protocol || "https";
  if (typeof connection.tls_ms === "number") return `${protocol} · ${connection.tls_ms} ms`;
  return `${protocol} · ${copyLedger.tlsReused}`;
}

function regionOf(obs: Observation, locale: Locale): EvidenceReportFacts["region"] {
  const readout = observationGeoReadout({
    requestedLabel: obs.regionLabel,
    regionValue: obs.regionValue,
    captureConditions: obs.captureConditions,
    copy: observationGeoCopyFrom(copy[locale].observationDetail),
    locale,
  });
  const geo = obs.captureConditions?.geo;
  const country = text(geo?.country);
  if (!geo || !country || geo.proxy_mode === "none" || geo.proxy_mode === "retry_without_proxy") {
    return { requested: readout.requestedLabel, observed: null };
  }
  const observed = text(readout.observedLabel);
  return { requested: readout.requestedLabel, observed: observed || null };
}

function verdictOf(field: ObservationCompareField): EvidenceReportVerdict {
  if (field.verdict === "changed") return "changed";
  if (field.verdict === "same") return "same";
  return "incomparable";
}

function screenshotHint(field: ObservationCompareField, locale: Locale): string | null {
  const t = copy[locale].observationCompare;
  if (field.verdict === "changed") return t.screenshotChangedHint;
  if (field.verdict !== "incomparable") return null;
  if (field.incomparableReason === "scope") return t.screenshotIncomparableScope;
  if (field.incomparableReason === "viewport") return t.screenshotIncomparableViewport;
  return t.screenshotIncomparableUnknown;
}

function detectedFacts(current: Observation, siblings: Observation[], locale: Locale): EvidenceReportFacts["detected"] {
  const region = text(current.regionValue);
  if (!region) return null;
  const sameRegion = siblings.filter((row) => text(row.regionValue) === region);
  const previous = previousObservationForCompare(current, sameRegion);
  if (!previous) return null;
  const compared = compareObservations(previous, current);
  const byKey = new Map(compared.map((field) => [field.key, field]));
  const fields: EvidenceReportFact[] = [];
  for (const key of DETECTED_KEYS) {
    const field = byKey.get(key);
    if (!field) continue;
    const verdict = verdictOf(field);
    fields.push({
      key,
      verdict,
      previous: field.left,
      current: field.right,
      hint: key === "screenshot" ? screenshotHint(field, locale) : null,
    });
  }
  return { previousCapturedAt: previous.capturedAt, fields };
}

function triggerLine(actions: string[] | undefined, locale: Locale): string | null {
  const action = actions?.find((item) => item !== "WAIT") ?? actions?.[0];
  if (!action) return null;
  const ja = locale === "ja";
  if (action === "SCROLL") return ja ? "トリガー: Scroll" : "Trigger: Scroll";
  if (action === "HOVER") return ja ? "トリガー: Hover" : "Trigger: Hover";
  if (action === "MOUSE_MOVE") return ja ? "トリガー: マウス移動" : "Trigger: mouse move";
  if (action === "WAIT" || action === "LOAD") return ja ? "トリガー: 読み込み" : "Trigger: load";
  return null;
}

function motionLines(row: InteractionTypeRow, locale: Locale): string[] {
  if (row.type !== "css_animation" && row.type !== "js_animation") return [];
  const trace = parseMotionTrace(row.evidence?.trace);
  if (!trace) return [];
  const ja = locale === "ja";
  const lines = [];
  const selector = row.evidence?.selector?.trim();
  if (selector) lines.push(`${ja ? "対象" : "Target"}: ${selector}`);
  const trigger = triggerLine(row.evidence?.actions, locale);
  if (trigger) lines.push(trigger);
  if (trace.x) lines.push(`${ja ? "位置" : "Position"}: ${trace.x}`);
  if (trace.opacity) lines.push(`Opacity: ${trace.opacity}`);
  if (trace.transform) lines.push(`${ja ? "変形" : "Transform"}: ${trace.transform}`);
  if (trace.time) lines.push(`Animation time: ${trace.time}`);
  return lines;
}

function behaviorRows(types: InteractionTypeRow[] | null, locale: Locale): EvidenceReportBehaviorRow[] | null {
  if (!types?.length) return null;
  const rows = types
    .filter((row) => row.status !== "not_measured")
    .map((row) => {
      const driver = parseMotionDriver(row.evidence?.driver);
      const lines = motionLines(row, locale);
      return {
        type: row.type,
        status: row.status,
        ...(driver ? { driver } : {}),
        ...(lines.length ? { lines } : {}),
      };
    });
  return rows.length ? rows : null;
}

function journeyRows(
  obs: Observation,
  synthetic: SyntheticInteractionV1 | null,
  runs: JourneyRunFacts[],
): EvidenceReportJourneyRow[] | null {
  const rows: EvidenceReportJourneyRow[] = [];
  if (synthetic) {
    if (synthetic.interactions.length) {
      for (const step of synthetic.interactions) {
        rows.push({ label: step.label, status: step.error ? "fail" : "pass" });
      }
    } else if (synthetic.error === "no_safe_target") {
      rows.push({ label: "", status: "no_safe_target" });
    } else if (synthetic.error === "failed") {
      rows.push({ label: "", status: "fail" });
    }
  }
  for (const run of selectJourneyRunsForObservation(obs, runs)) {
    for (const step of run.steps) {
      if (step.status !== "pass" && step.status !== "fail" && step.status !== "blocked_for_safety" && step.status !== "incomplete") {
        continue;
      }
      rows.push({ label: step.kind || step.id, status: step.status });
    }
  }
  return rows.length ? rows : null;
}

export function buildEvidenceReportFacts(input: {
  observation: Observation;
  locale: Locale;
  siblings: Observation[];
  session?: SessionSignalsV1 | null;
  behaviorTypes?: InteractionTypeRow[] | null;
  synthetic?: SyntheticInteractionV1 | null;
  journeyRuns?: JourneyRunFacts[];
}): EvidenceReportFacts {
  const session = input.session ?? null;
  const http = observationHttpStatus(input.observation) ?? (session?.http.status && session.http.status > 0 ? session.http.status : null);
  const connection = session?.connection;
  const dns = connection && typeof connection.dns_ms === "number" ? `${connection.dns_ms} ms` : null;
  return {
    region: regionOf(input.observation, input.locale),
    reachability: {
      http: http == null ? null : String(http),
      finalUrl: recordedFinalUrl(input.observation, session),
      pageTitle: recordedTitle(input.observation),
      dns,
      tls: tlsText(connection, input.locale),
    },
    detected: detectedFacts(input.observation, input.siblings, input.locale),
    behavior: behaviorRows(input.behaviorTypes ?? null, input.locale),
    journey: journeyRows(input.observation, input.synthetic ?? null, input.journeyRuns ?? []),
  };
}
