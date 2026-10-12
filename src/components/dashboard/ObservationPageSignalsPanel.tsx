import { formatJaDate } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import {
  PAGE_SIGNALS_MAX,
  formatPageSignalReason,
  formatPageSignalSeverity,
  pageSignalsPieSlices,
  type PageSignalBand,
  type PageSignalReason,
  type PageSignalReasonMessages,
  type PageSignalSeverity,
  type PageSignalsPieSlice,
  type PageSignalsScore,
  scorePageSignals,
} from "@/lib/observation-page-signals";
import type { HtmlHeadSignalsV1 } from "@/lib/url-preview";

export type ObservationPageSignalsCopy = {
  title: string;
  badge: string;
  hint: string;
  outOf: string;
  bandGood: string;
  bandReview: string;
  bandAttention: string;
  severityCritical: string;
  severityImportant: string;
  severityMinor: string;
  pieRemaining: string;
  whyTitle: string;
  noDeductions: string;
  reasonHttpError: string;
  reasonNoindex: string;
  reasonCanonicalMismatch: string;
  reasonTitleMissing: string;
  reasonDescriptionMissing: string;
  reasonCanonicalMissing: string;
  reasonRobotsMissing: string;
  reasonOgMissing: string;
  reasonOgTitleMissing: string;
  reasonOgDescriptionMissing: string;
  reasonOgImageMissing: string;
  reasonLangMissing: string;
  reasonViewportMissing: string;
  reasonTwitterMissing: string;
  reasonFinalUrlMissing: string;
  historyTitle: string;
  historyHint: string;
  historyThis: string;
};

export function observationPageSignalsCopyFrom(t: {
  pageSignalsTitle: string;
  pageSignalsBadge: string;
  pageSignalsHint: string;
  pageSignalsOutOf: string;
  pageSignalsBandGood: string;
  pageSignalsBandReview: string;
  pageSignalsBandAttention: string;
  pageSignalsSeverityCritical: string;
  pageSignalsSeverityImportant: string;
  pageSignalsSeverityMinor: string;
  pageSignalsPieRemaining: string;
  pageSignalsWhyTitle: string;
  pageSignalsNoDeductions: string;
  pageSignalsReasonHttpError: string;
  pageSignalsReasonNoindex: string;
  pageSignalsReasonCanonicalMismatch: string;
  pageSignalsReasonTitleMissing: string;
  pageSignalsReasonDescriptionMissing: string;
  pageSignalsReasonCanonicalMissing: string;
  pageSignalsReasonRobotsMissing: string;
  pageSignalsReasonOgMissing: string;
  pageSignalsReasonOgTitleMissing: string;
  pageSignalsReasonOgDescriptionMissing: string;
  pageSignalsReasonOgImageMissing: string;
  pageSignalsReasonLangMissing: string;
  pageSignalsReasonViewportMissing: string;
  pageSignalsReasonTwitterMissing: string;
  pageSignalsReasonFinalUrlMissing: string;
  pageSignalsHistoryTitle: string;
  pageSignalsHistoryHint: string;
  pageSignalsHistoryThis: string;
}): ObservationPageSignalsCopy {
  return {
    title: t.pageSignalsTitle,
    badge: t.pageSignalsBadge,
    hint: t.pageSignalsHint,
    outOf: t.pageSignalsOutOf,
    bandGood: t.pageSignalsBandGood,
    bandReview: t.pageSignalsBandReview,
    bandAttention: t.pageSignalsBandAttention,
    severityCritical: t.pageSignalsSeverityCritical,
    severityImportant: t.pageSignalsSeverityImportant,
    severityMinor: t.pageSignalsSeverityMinor,
    pieRemaining: t.pageSignalsPieRemaining,
    whyTitle: t.pageSignalsWhyTitle,
    noDeductions: t.pageSignalsNoDeductions,
    reasonHttpError: t.pageSignalsReasonHttpError,
    reasonNoindex: t.pageSignalsReasonNoindex,
    reasonCanonicalMismatch: t.pageSignalsReasonCanonicalMismatch,
    reasonTitleMissing: t.pageSignalsReasonTitleMissing,
    reasonDescriptionMissing: t.pageSignalsReasonDescriptionMissing,
    reasonCanonicalMissing: t.pageSignalsReasonCanonicalMissing,
    reasonRobotsMissing: t.pageSignalsReasonRobotsMissing,
    reasonOgMissing: t.pageSignalsReasonOgMissing,
    reasonOgTitleMissing: t.pageSignalsReasonOgTitleMissing,
    reasonOgDescriptionMissing: t.pageSignalsReasonOgDescriptionMissing,
    reasonOgImageMissing: t.pageSignalsReasonOgImageMissing,
    reasonLangMissing: t.pageSignalsReasonLangMissing,
    reasonViewportMissing: t.pageSignalsReasonViewportMissing,
    reasonTwitterMissing: t.pageSignalsReasonTwitterMissing,
    reasonFinalUrlMissing: t.pageSignalsReasonFinalUrlMissing,
    historyTitle: t.pageSignalsHistoryTitle,
    historyHint: t.pageSignalsHistoryHint,
    historyThis: t.pageSignalsHistoryThis,
  };
}

function pageSignalsReasonMessages(copy: ObservationPageSignalsCopy): PageSignalReasonMessages {
  return {
    http_error: copy.reasonHttpError,
    noindex: copy.reasonNoindex,
    canonical_mismatch: copy.reasonCanonicalMismatch,
    title_missing: copy.reasonTitleMissing,
    description_missing: copy.reasonDescriptionMissing,
    canonical_missing: copy.reasonCanonicalMissing,
    robots_missing: copy.reasonRobotsMissing,
    og_missing: copy.reasonOgMissing,
    og_title_missing: copy.reasonOgTitleMissing,
    og_description_missing: copy.reasonOgDescriptionMissing,
    og_image_missing: copy.reasonOgImageMissing,
    lang_missing: copy.reasonLangMissing,
    viewport_missing: copy.reasonViewportMissing,
    twitter_missing: copy.reasonTwitterMissing,
    final_url_missing: copy.reasonFinalUrlMissing,
  };
}

function pageSignalReasonText(reason: PageSignalReason, copy: ObservationPageSignalsCopy): string {
  return formatPageSignalReason(reason, pageSignalsReasonMessages(copy));
}

function bandLabel(band: PageSignalBand, copy: ObservationPageSignalsCopy): string {
  if (band === "good") return copy.bandGood;
  if (band === "review") return copy.bandReview;
  return copy.bandAttention;
}

function bandColor(band: PageSignalBand): string {
  if (band === "good") return "#276248";
  if (band === "review") return "#b45309";
  return "#be123c";
}

function pageSignalSeverityLabel(severity: PageSignalSeverity, copy: ObservationPageSignalsCopy): string {
  return formatPageSignalSeverity(severity, {
    critical: copy.severityCritical,
    important: copy.severityImportant,
    minor: copy.severityMinor,
  });
}

function sliceColor(key: PageSignalsPieSlice["key"], band: PageSignalBand): string {
  if (key === "remaining") return bandColor(band);
  if (key === "critical") return "#be123c";
  if (key === "important") return "#b45309";
  return "#a8a29e";
}

function sliceLabel(key: PageSignalsPieSlice["key"], copy: ObservationPageSignalsCopy): string {
  if (key === "remaining") return copy.pieRemaining;
  return pageSignalSeverityLabel(key, copy);
}

function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function slicePath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const sweep = endDeg - startDeg;
  if (sweep >= 359.99) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
  }
  const large = sweep > 180 ? 1 : 0;
  const [x1, y1] = polar(cx, cy, r, startDeg);
  const [x2, y2] = polar(cx, cy, r, endDeg);
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

function PageSignalsPie({
  result,
  copy,
  size = 140,
}: {
  result: PageSignalsScore;
  copy: ObservationPageSignalsCopy;
  size?: number;
}) {
  const slices = pageSignalsPieSlices(result);
  const total = slices.reduce((sum, row) => sum + row.value, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  let cursor = 0;
  const paths = slices.map((slice) => {
    const start = (cursor / total) * 360;
    cursor += slice.value;
    const end = (cursor / total) * 360;
    return { ...slice, d: slicePath(cx, cy, r, start, end) };
  });
  const aria = slices
    .map((slice) => `${sliceLabel(slice.key, copy)} ${slice.value}`)
    .join(", ");

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${copy.title} ${result.score} ${copy.outOf}. ${aria}`}
      className="shrink-0"
    >
      {paths.map((slice) => (
        <path key={slice.key} d={slice.d} fill={sliceColor(slice.key, result.band)} />
      ))}
    </svg>
  );
}

export type PageSignalsHistoryPoint = {
  id: string;
  capturedAt: string;
  signals: HtmlHeadSignalsV1 | null | undefined;
};

type PanelProps = {
  signals: HtmlHeadSignalsV1 | null | undefined;
  copy: ObservationPageSignalsCopy;
  history?: PageSignalsHistoryPoint[];
  currentId?: string;
  locale?: Locale;
};

export function ObservationPageSignalsPanel({
  signals,
  copy,
  history,
  currentId,
  locale = "ja",
}: PanelProps) {
  const result = scorePageSignals(signals);
  if (!result) return null;
  return (
    <PageSignalsBody
      result={result}
      copy={copy}
      history={history}
      currentId={currentId}
      locale={locale}
    />
  );
}

export function ObservationPageSignalsCompare({
  left,
  right,
  copy,
}: {
  left: HtmlHeadSignalsV1 | null | undefined;
  right: HtmlHeadSignalsV1 | null | undefined;
  copy: ObservationPageSignalsCopy;
}) {
  const a = scorePageSignals(left);
  const b = scorePageSignals(right);
  if (!a && !b) return null;
  return (
    <section
      aria-labelledby="page-signals-compare-heading"
      className="rounded-xl border border-dashed border-border bg-surface-elevated p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="page-signals-compare-heading" className="font-display text-lg font-semibold text-ink">
          {copy.title}
        </h2>
        <p className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
          {copy.badge}
        </p>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{copy.hint}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <PageSignalsCompact result={a} copy={copy} />
        <PageSignalsCompact result={b} copy={copy} />
      </div>
    </section>
  );
}

function PageSignalsCompact({
  result,
  copy,
}: {
  result: PageSignalsScore | null;
  copy: ObservationPageSignalsCopy;
}) {
  if (!result) return <p className="text-sm text-ink-muted">—</p>;
  return (
    <div className="flex items-center gap-3">
      <PageSignalsPie result={result} copy={copy} size={88} />
      <div>
        <p className="font-display text-3xl font-semibold tabular-nums text-ink">{result.score}</p>
        <p className="text-sm font-semibold text-ink">{bandLabel(result.band, copy)}</p>
        <p className="text-xs text-ink-muted">{copy.outOf}</p>
      </div>
    </div>
  );
}

function PageSignalsHistory({
  points,
  currentId,
  copy,
  locale,
}: {
  points: PageSignalsHistoryPoint[];
  currentId?: string;
  copy: ObservationPageSignalsCopy;
  locale: Locale;
}) {
  const scored = points
    .map((point) => {
      const result = scorePageSignals(point.signals);
      if (!result) return null;
      return { ...point, result };
    })
    .filter((row): row is PageSignalsHistoryPoint & { result: PageSignalsScore } => Boolean(row))
    .sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));
  if (scored.length < 2) return null;

  return (
    <div className="mt-5 border-t border-border pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
        {copy.historyTitle}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">{copy.historyHint}</p>
      <div
        className="mt-3 flex items-end gap-2"
        role="img"
        aria-label={copy.historyTitle}
      >
        {scored.map((point) => {
          const current = point.id === currentId;
          const height = Math.max(8, Math.round((point.result.score / PAGE_SIGNALS_MAX) * 72));
          return (
            <div key={point.id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <p className="text-[11px] font-semibold tabular-nums text-ink">{point.result.score}</p>
              <span
                className={`w-full max-w-8 rounded-t ${current ? "ring-2 ring-accent ring-offset-2 ring-offset-surface-elevated" : ""}`}
                style={{
                  height: `${height}px`,
                  backgroundColor: bandColor(point.result.band),
                }}
              />
              <p className="w-full truncate text-center text-[10px] text-ink-muted">
                {current ? copy.historyThis : formatJaDate(point.capturedAt, locale)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PageSignalsBody({
  result,
  copy,
  history,
  currentId,
  locale,
}: {
  result: PageSignalsScore;
  copy: ObservationPageSignalsCopy;
  history?: PageSignalsHistoryPoint[];
  currentId?: string;
  locale: Locale;
}) {
  return (
    <section
      aria-labelledby="page-signals-heading"
      className="rounded-xl border border-dashed border-border bg-surface-elevated p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="page-signals-heading" className="font-display text-lg font-semibold text-ink">
          {copy.title}
        </h2>
        <p className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
          {copy.badge}
        </p>
        <p
          className="rounded-full border px-2.5 py-0.5 text-xs font-semibold"
          style={{ color: bandColor(result.band), borderColor: `${bandColor(result.band)}55` }}
        >
          {bandLabel(result.band, copy)}
        </p>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{copy.hint}</p>

      <div className="mt-4 flex flex-wrap items-center gap-6">
        <PageSignalsPie result={result} copy={copy} />
        <div>
          <p className="font-display text-3xl font-semibold tabular-nums text-ink">
            {result.score}
            <span className="ml-1 text-base font-medium text-ink-muted">{copy.outOf}</span>
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">{bandLabel(result.band, copy)}</p>
          <ul className="mt-3 space-y-1 text-xs text-ink">
            {pageSignalsPieSlices(result).map((slice) => (
              <li key={slice.key} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: sliceColor(slice.key, result.band) }}
                />
                <span>
                  {sliceLabel(slice.key, copy)} {slice.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.whyTitle}</h3>
        {result.reasons.length === 0 ? (
          <p className="mt-2 text-sm text-ink">{copy.noDeductions}</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {result.reasons.map((reason) => (
              <li
                key={reason.id}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink"
              >
                <span>{pageSignalReasonText(reason, copy)}</span>
                <span className="shrink-0 text-xs font-semibold text-ink-muted">
                  −{reason.points} · {pageSignalSeverityLabel(reason.severity, copy)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {history?.length ? (
        <PageSignalsHistory
          points={history}
          currentId={currentId}
          copy={copy}
          locale={locale}
        />
      ) : null}
    </section>
  );
}
