import type { Observation } from "@/lib/demo/observations";
import { formatJaDate } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import { previousObservationForCompare } from "@/lib/observation-compare";
import {
  buildObservationMeasureLedger,
  ledgerLayerLabel,
  ledgerLineLabel,
  ledgerStateLabel,
  selectJourneyRunsForObservation,
  type BehaviorTypeFact,
  type JourneyRunFacts,
} from "@/lib/observation-measure-ledger";
import {
  buildObservationMeasurements,
  measurementUrlHostPath,
  observationFinalUrl,
  observationHttpStatus,
  observationVisualKind,
  type ObservationMeasurementRow,
} from "@/lib/observation-measurements";
import type { RenderedPageMeasurementV1 } from "@/lib/browser-rendered-page";
import type { SessionSignalsV1 } from "@/lib/session-signals";
import type { SyntheticInteractionV1 } from "@/lib/observation-synthetic-interaction";

type Props = {
  current: Observation;
  timeSiblings: Observation[];
  locale: Locale;
  synthetic?: SyntheticInteractionV1 | null;
  session?: SessionSignalsV1 | null;
  renderedPage?: RenderedPageMeasurementV1 | null;
  behaviorTypes?: BehaviorTypeFact[] | null;
  journeyRuns?: JourneyRunFacts[];
};

function visualSummary(row: Extract<ObservationMeasurementRow, { id: "visual" }>, t: PropsCopy): string {
  if (row.kind === "clip") return t.measurementVisualClip;
  if (row.kind === "live") return t.measurementVisualLive;
  if (row.kind === "still") return t.measurementVisualStill;
  return t.measurementNotMeasured;
}

function httpSummary(row: Extract<ObservationMeasurementRow, { id: "http" }>, t: PropsCopy): string {
  if (row.presence === "not_measured") return t.measurementNotMeasured;
  const status = row.status != null ? String(row.status) : "—";
  const url = measurementUrlHostPath(row.finalUrl) || "—";
  const base = `${status} · ${url}`;
  return row.redirected ? `${base} · ${t.measurementHttpRedirect}` : base;
}

function contentSummary(row: Extract<ObservationMeasurementRow, { id: "content" }>, t: PropsCopy): string {
  if (row.presence === "not_measured") return t.measurementNotMeasured;
  const parts: string[] = [];
  if (row.sampleBytes != null) parts.push(t.measurementContentBytes.replace("{n}", String(row.sampleBytes)));
  if (row.sampleSha256) parts.push(row.sampleSha256.slice(0, 12));
  return parts.join(" · ") || t.measurementRecorded;
}

function joinParts(parts: string[]): string {
  return parts.filter(Boolean).join(" · ");
}

function networkSummary(row: Extract<ObservationMeasurementRow, { id: "network" }>, t: PropsCopy): string {
  if (row.presence === "not_measured") return t.measurementNotMeasured;
  const parts: string[] = [];
  if (row.resources) {
    parts.push(
      `${t.measurementBehaviorSource} · JS ${row.resources.script} · CSS ${row.resources.stylesheet} · ${t.measurementResourceImage} ${row.resources.image} · ${t.measurementResourceFont} ${row.resources.font} · XHR ${row.resources.xhr} · fetch ${row.resources.fetch} · ${t.measurementFailedRequests} ${row.resources.failed}`,
    );
  }
  if (row.journey) {
    parts.push(`${t.measurementJourneySource} · ${t.measurementRequests} ${row.journey.requests} · ${t.measurementFailedRequests} ${row.journey.failed}`);
  }
  return joinParts(parts) || t.measurementRecorded;
}

function consoleSummary(row: Extract<ObservationMeasurementRow, { id: "console" }>, t: PropsCopy): string {
  if (row.presence === "not_measured") return t.measurementNotMeasured;
  const parts: string[] = [];
  if (row.behavior) {
    parts.push(`${t.measurementBehaviorSource} · console error ${row.behavior.consoleErrors} · pageerror ${row.behavior.pageErrors}`);
  }
  if (row.journey) {
    parts.push(`${t.measurementJourneySource} · console error ${row.journey.consoleErrors} · pageerror ${row.journey.pageErrors}`);
  }
  return joinParts(parts) || t.measurementRecorded;
}

function performanceSummary(
  row: Extract<ObservationMeasurementRow, { id: "performance" }>,
  t: PropsCopy,
): string {
  if (row.presence === "not_measured") return t.measurementNotMeasured;
  const parts: string[] = [t.measurementLabOptional];
  if (row.lcpMs != null) {
    parts.push(String(t.measurementLcp).replace("{ms}", String(Math.round(row.lcpMs))));
  }
  if (row.cls != null) {
    parts.push(String(t.measurementCls).replace("{cls}", row.cls.toFixed(3)));
  }
  return parts.join(" · ");
}

type PropsCopy = (typeof copy)[Locale]["observationDetail"];

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d="M3.5 8.4 6.4 11.3 12.5 4.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MeasureCheck({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
        on ? "bg-emerald-100 text-emerald-800" : "border border-border bg-surface"
      }`}
      role="img"
      aria-label={label}
    >
      {on ? <CheckIcon /> : null}
    </span>
  );
}

function rowLabel(id: ObservationMeasurementRow["id"], t: PropsCopy): string {
  switch (id) {
    case "visual":
      return t.measurementVisual;
    case "http":
      return t.measurementHttp;
    case "journey":
      return t.measurementJourney;
    case "page_signals":
      return t.measurementPageSignals;
    case "content":
      return t.measurementContent;
    case "network":
      return t.measurementNetwork;
    case "performance":
      return t.measurementPerformance;
    case "console":
      return t.measurementConsole;
  }
}

function rowValue(row: ObservationMeasurementRow, t: PropsCopy): string {
  switch (row.id) {
    case "visual":
      return visualSummary(row, t);
    case "http":
      return httpSummary(row, t);
    case "journey":
      if (row.presence === "not_measured") return t.measurementNotMeasured;
      if (row.overall === "fail") {
        return t.measurementJourneyFail.replace("{n}", String(row.stepCount));
      }
      return t.measurementJourneyPass.replace("{n}", String(row.stepCount));
    case "page_signals":
      return row.presence === "not_measured"
        ? t.measurementNotMeasured
        : t.measurementPageSignalsValue.replace("{n}", String(row.presentCount));
    case "content":
      return contentSummary(row, t);
    case "network":
      return networkSummary(row, t);
    case "console":
      return consoleSummary(row, t);
    case "performance":
      return performanceSummary(row, t);
  }
}

export function ObservationMeasurementsPanel({
  current,
  timeSiblings,
  locale,
  synthetic = null,
  session = null,
  renderedPage = null,
  behaviorTypes = null,
  journeyRuns = [],
}: Props) {
  const t = copy[locale].observationDetail;
  const matchedJourneys = selectJourneyRunsForObservation(current, journeyRuns);
  const rows = buildObservationMeasurements(current, { synthetic, session, journeyRuns: matchedJourneys });
  const http = rows.find((row) => row.id === "http");
  const journey = rows.find((row) => row.id === "journey");
  const ledger = buildObservationMeasureLedger({
    observation: current,
    locale,
    httpStatus: observationHttpStatus(current),
    finalUrl: observationFinalUrl(current),
    redirected: http?.id === "http" ? http.redirected : false,
    visual: observationVisualKind(current),
    session,
    renderedPage,
    behaviorTypes,
    journeyRuns: matchedJourneys,
    syntheticOverall: synthetic && journey?.id === "journey" ? journey.overall : "not_run",
    syntheticSteps: synthetic && journey?.id === "journey" ? journey.stepCount : 0,
  });
  const previous = previousObservationForCompare(current, timeSiblings);

  return (
    <div className="space-y-6">
      <section
        id="observation-measurements"
        className="scroll-mt-28 rounded-xl border border-border bg-surface-elevated p-4 sm:p-5"
        aria-labelledby="observation-measurements-heading"
      >
        <h3 id="observation-measurements-heading" className="text-sm font-semibold text-ink">
          {t.measurementsTitle}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t.measurementsHint}</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {rows.map((row) => {
            const measured = row.presence !== "not_measured";
            return (
              <li key={row.id} className="flex items-start gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5">
                <MeasureCheck on={measured} label={measured ? t.measurementRecorded : t.measurementNotMeasured} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{rowLabel(row.id, t)}</p>
                  <p className={`mt-0.5 wrap-break-word text-xs ${measured ? "text-ink" : "text-ink-muted"}`}>
                    {rowValue(row, t)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-ink-muted">{t.measurementsNotMeasuredHint}</p>
        <div className="mt-6 space-y-5 border-t border-border pt-4">
          <h4 className="text-sm font-semibold text-ink">{t.measurementLedgerTitle}</h4>
          {ledger.layers.map((layer) => (
            <div key={layer.id}>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{ledgerLayerLabel(layer.id, locale)}</p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {layer.lines.map((item) => {
                  const measured = item.state === "observed";
                  const stateLabel = ledgerStateLabel(item.state, locale);
                  return (
                    <li key={item.id} className="flex items-start gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5">
                      <MeasureCheck on={measured} label={stateLabel} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{ledgerLineLabel(item.id, locale)}</p>
                        {measured && item.detail ? (
                          <p className="mt-0.5 wrap-break-word text-xs text-ink">{item.detail}</p>
                        ) : null}
                        {!measured ? (
                          <p className="mt-0.5 wrap-break-word text-xs text-ink-muted">
                            {item.detail ? `${stateLabel} · ${item.detail}` : stateLabel}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {layer.id === "reachability" ? (
                <p className="mt-2 text-xs leading-relaxed text-ink-muted">{ledger.dnsNote}</p>
              ) : null}
            </div>
          ))}
        </div>
        {previous ? (
          <p className="mt-2 text-xs text-ink-muted">
            {t.measurementsPreviousNote.replace("{when}", formatJaDate(previous.capturedAt, locale))}
          </p>
        ) : null}
      </section>
    </div>
  );
}
