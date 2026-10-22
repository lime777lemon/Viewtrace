import { formatJaDate } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import {
  buildMeasurementRecord,
  type MeasurementRecordV1,
  type PageSeoSignalId,
} from "@/lib/measurement-record";
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

const SIGNAL_LABELS: Record<Locale, Record<PageSeoSignalId, string>> = {
  ja: {
    title: "Title",
    description: "Description",
    canonical: "Canonical",
    noindex: "Noindex",
    lang: "Lang",
    viewport: "Viewport",
    http: "HTTP",
    structured_data: "Structured Data",
    social: "Social",
  },
  en: {
    title: "Title",
    description: "Description",
    canonical: "Canonical",
    noindex: "Noindex",
    lang: "Lang",
    viewport: "Viewport",
    http: "HTTP",
    structured_data: "Structured Data",
    social: "Social",
  },
};

function recordFor(signals: HtmlHeadSignalsV1 | null | undefined): MeasurementRecordV1 | null {
  if (!signals) return null;
  const record = buildMeasurementRecord({ signals });
  if (!record || record.seo.measured_signals === 0) return null;
  return record;
}

function canonicalNote(record: MeasurementRecordV1, locale: Locale): string | null {
  const row = record.seo.signals.find((signal) => signal.id === "canonical");
  if (!row || row.earned == null) return null;
  const comparison = record.canonical_comparison;
  if (!comparison.comparable) return locale === "ja" ? "最終 URL と比較できません" : "Not comparable with the final URL";
  if (comparison.normalized_match) return locale === "ja" ? "最終 URL と一致" : "Matches the final URL";
  if (comparison.host_match === false) return locale === "ja" ? "別ホスト" : "Different host";
  return locale === "ja" ? "正規化しても一致しません" : "Does not match after normalization";
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
  const record = recordFor(signals);
  if (!record || record.seo.score == null) return null;
  return (
    <PageSignalsBody
      record={record}
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
  locale = "ja",
}: {
  left: HtmlHeadSignalsV1 | null | undefined;
  right: HtmlHeadSignalsV1 | null | undefined;
  copy: ObservationPageSignalsCopy;
  locale?: Locale;
}) {
  const a = recordFor(left);
  const b = recordFor(right);
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
        <PageSignalsCompact record={a} copy={copy} locale={locale} />
        <PageSignalsCompact record={b} copy={copy} locale={locale} />
      </div>
    </section>
  );
}

function PageSignalsCompact({
  record,
  copy,
  locale,
}: {
  record: MeasurementRecordV1 | null;
  copy: ObservationPageSignalsCopy;
  locale: Locale;
}) {
  if (!record || record.seo.score == null) return <p className="text-sm text-ink-muted">—</p>;
  const note = canonicalNote(record, locale);
  return (
    <div>
      <p className="font-display text-3xl font-semibold tabular-nums text-ink">
        {record.seo.score}
        <span className="ml-1 text-base font-medium text-ink-muted">{copy.outOf}</span>
      </p>
      <p className="text-xs text-ink-muted">
        {record.seo.earned_points}/{record.seo.possible_points} · {record.seo.scoring_version}
      </p>
      {note ? <p className="mt-1 text-xs text-ink">{note}</p> : null}
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
      const record = recordFor(point.signals);
      if (!record || record.seo.score == null) return null;
      return { ...point, score: record.seo.score };
    })
    .filter((row): row is PageSignalsHistoryPoint & { score: number } => Boolean(row))
    .sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));
  if (scored.length < 2) return null;

  return (
    <div className="mt-5 border-t border-border pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.historyTitle}</h3>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">{copy.historyHint}</p>
      <div className="mt-3 flex items-end gap-2" role="img" aria-label={copy.historyTitle}>
        {scored.map((point) => {
          const current = point.id === currentId;
          const height = Math.max(8, Math.round((point.score / 100) * 72));
          return (
            <div key={point.id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <p className="text-[11px] font-semibold tabular-nums text-ink">{point.score}</p>
              <span
                className={`w-full max-w-8 rounded-t bg-accent ${current ? "ring-2 ring-accent ring-offset-2 ring-offset-surface-elevated" : ""}`}
                style={{ height: `${height}px` }}
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
  record,
  copy,
  history,
  currentId,
  locale,
}: {
  record: MeasurementRecordV1;
  copy: ObservationPageSignalsCopy;
  history?: PageSignalsHistoryPoint[];
  currentId?: string;
  locale: Locale;
}) {
  const note = canonicalNote(record, locale);
  const labels = SIGNAL_LABELS[locale];
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
        <p className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
          {record.seo.scoring_version}
        </p>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{copy.hint}</p>

      <p className="mt-4 font-display text-3xl font-semibold tabular-nums text-ink">
        {record.seo.score}
        <span className="ml-1 text-base font-medium text-ink-muted">{copy.outOf}</span>
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        {record.seo.earned_points}/{record.seo.possible_points} · {record.seo.measured_signals}
      </p>

      <ul className="mt-4 space-y-2">
        {record.seo.signals.map((signal) => {
          const excluded = signal.earned == null;
          return (
            <li key={signal.id} className="text-sm text-ink">
              <div className="flex items-baseline justify-between gap-3">
                <span>{labels[signal.id]}</span>
                <span className="shrink-0 tabular-nums text-ink-muted">
                  {excluded ? "—" : `${signal.earned}/${signal.weight}`}
                </span>
              </div>
              {signal.id === "canonical" && note ? (
                <p className="mt-0.5 text-xs text-ink-muted">
                  {note}
                  {record.canonical_comparison.normalized_match === false && record.fields.canonical.value ? (
                    <>
                      {" "}
                      · {record.fields.canonical.value} → {record.fields.final_url.value}
                    </>
                  ) : null}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {history?.length ? (
        <PageSignalsHistory points={history} currentId={currentId} copy={copy} locale={locale} />
      ) : null}
    </section>
  );
}
