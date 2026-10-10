import {
  PAGE_SIGNALS_MAX,
  type PageSignalBand,
  type PageSignalReason,
  type PageSignalReasonId,
  type PageSignalSeverity,
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
  };
}

function reasonText(reason: PageSignalReason, copy: ObservationPageSignalsCopy): string {
  const messages: Record<PageSignalReasonId, string> = {
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
  return (messages[reason.id] ?? reason.id).replace("{status}", String(reason.httpStatus ?? "—"));
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

function severityLabel(severity: PageSignalSeverity, copy: ObservationPageSignalsCopy): string {
  if (severity === "critical") return copy.severityCritical;
  if (severity === "important") return copy.severityImportant;
  return copy.severityMinor;
}

function PageSignalsDonut({ score, band }: { score: number; band: PageSignalBand }) {
  const deg = (score / PAGE_SIGNALS_MAX) * 360;
  const color = bandColor(band);
  return (
    <div
      className="relative h-28 w-28 shrink-0 rounded-full"
      style={{ background: `conic-gradient(${color} ${deg}deg, #e7e5e4 ${deg}deg)` }}
      aria-hidden
    >
      <div className="absolute inset-2 flex items-center justify-center rounded-full bg-surface-elevated">
        <span className="font-display text-2xl font-semibold tabular-nums text-ink">{score}</span>
      </div>
    </div>
  );
}

type PanelProps = {
  signals: HtmlHeadSignalsV1 | null | undefined;
  copy: ObservationPageSignalsCopy;
};

export function ObservationPageSignalsPanel({ signals, copy }: PanelProps) {
  const result = scorePageSignals(signals);
  if (!result) return null;
  return <PageSignalsBody result={result} copy={copy} />;
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
      <p className="font-display text-3xl font-semibold tabular-nums text-ink">{result.score}</p>
      <div>
        <p className="text-sm font-semibold text-ink">{bandLabel(result.band, copy)}</p>
        <p className="text-xs text-ink-muted">{copy.outOf}</p>
      </div>
    </div>
  );
}

function PageSignalsBody({
  result,
  copy,
}: {
  result: PageSignalsScore;
  copy: ObservationPageSignalsCopy;
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
        <PageSignalsDonut score={result.score} band={result.band} />
        <div>
          <p className="font-display text-3xl font-semibold tabular-nums text-ink">
            {result.score}
            <span className="ml-1 text-base font-medium text-ink-muted">{copy.outOf}</span>
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">{bandLabel(result.band, copy)}</p>
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
                <span>{reasonText(reason, copy)}</span>
                <span className="shrink-0 text-xs font-semibold text-ink-muted">
                  −{reason.points} · {severityLabel(reason.severity, copy)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
