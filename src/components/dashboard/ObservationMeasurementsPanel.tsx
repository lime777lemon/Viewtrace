import type { Observation } from "@/lib/demo/observations";
import { formatJaDate } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import { previousObservationForCompare } from "@/lib/observation-compare";
import {
  buildObservationMeasurements,
  measurementUrlHostPath,
  type ObservationMeasurementRow,
} from "@/lib/observation-measurements";
import type { SyntheticInteractionV1 } from "@/lib/observation-synthetic-interaction";

type Props = {
  current: Observation;
  timeSiblings: Observation[];
  locale: Locale;
  synthetic?: SyntheticInteractionV1 | null;
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
    case "console":
      return t.measurementNotMeasured;
    case "performance":
      return performanceSummary(row, t);
  }
}

export function ObservationMeasurementsPanel({
  current,
  timeSiblings,
  locale,
  synthetic = null,
}: Props) {
  const t = copy[locale].observationDetail;
  const rows = buildObservationMeasurements(current, { synthetic });
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
        <ul className="mt-4 divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
              <p className="text-sm font-medium text-ink">{rowLabel(row.id, t)}</p>
              <p
                className={`max-w-full break-all text-right text-xs ${
                  row.presence === "not_measured" ? "text-ink-muted" : "text-ink"
                }`}
              >
                {rowValue(row, t)}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-ink-muted">{t.measurementsNotMeasuredHint}</p>
        {previous ? (
          <p className="mt-2 text-xs text-ink-muted">
            {t.measurementsPreviousNote.replace("{when}", formatJaDate(previous.capturedAt, locale))}
          </p>
        ) : null}
      </section>
    </div>
  );
}
