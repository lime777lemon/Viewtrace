"use client";

import { useState, useTransition } from "react";
import {
  runObservationFieldCwvAction,
  runObservationLabCwvAction,
  runObservationSubpageScoresAction,
  runObservationSyntheticInteractionAction,
} from "@/app/actions/observation-optional-metrics";
import {
  labCwvBarPercents,
  labCwvRatings,
  type LabCwvRating,
  type LabCwvV1,
} from "@/lib/observation-lab-cwv";
import {
  fieldCwvRatings,
  type FieldCwvV1,
} from "@/lib/observation-field-cwv";
import {
  syntheticLatencyRating,
  type SyntheticInteractionKind,
  type SyntheticInteractionV1,
} from "@/lib/observation-synthetic-interaction";
import type { ObservationOptionalMetricsCopy } from "@/lib/observation-optional-metrics-copy";
import type { SubpageScoreRowV1, SubpageScoresV1 } from "@/lib/observation-subpages";
import {
  PAGE_SIGNALS_MAX,
  formatPageSignalReason,
  formatPageSignalSeverity,
  pageSignalReasonFromId,
  type PageSignalBand,
} from "@/lib/observation-page-signals";
import { ObservationFactCountBar } from "@/components/dashboard/ObservationFactCountBar";

export type { ObservationOptionalMetricsCopy };

function ratingLabel(rating: LabCwvRating | null, copy: ObservationOptionalMetricsCopy): string {
  if (rating === "good") return copy.ratingGood;
  if (rating === "needs_improvement") return copy.ratingNeeds;
  if (rating === "poor") return copy.ratingPoor;
  return "—";
}

function ratingColor(rating: LabCwvRating | null): string {
  if (rating === "good") return "#276248";
  if (rating === "needs_improvement") return "#b45309";
  if (rating === "poor") return "#be123c";
  return "#78716c";
}

function bandColor(band: PageSignalBand | null): string {
  if (band === "good") return "#276248";
  if (band === "review") return "#b45309";
  if (band === "attention") return "#be123c";
  return "#78716c";
}

function formatMs(value: number | null): string {
  if (value == null) return "—";
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 1 : 2)} s`;
  return `${Math.round(value)} ms`;
}

function formatCls(value: number | null): string {
  if (value == null) return "—";
  return value.toFixed(3);
}

function CwvThresholdBar({
  value,
  goodMax,
  needsMax,
  rating,
}: {
  value: number;
  goodMax: number;
  needsMax: number;
  rating: LabCwvRating | null;
}) {
  const { goodEnd, needsEnd, valueEnd } = labCwvBarPercents(value, goodMax, needsMax);
  return (
    <div className="relative mt-2 h-3">
      <div className="absolute inset-y-0 left-0 right-0 overflow-hidden rounded-full bg-border">
        <span
          className="absolute inset-y-0 left-0"
          style={{ width: `${goodEnd}%`, backgroundColor: "#27624833" }}
        />
        <span
          className="absolute inset-y-0"
          style={{
            left: `${goodEnd}%`,
            width: `${Math.max(0, needsEnd - goodEnd)}%`,
            backgroundColor: "#b4530933",
          }}
        />
        <span
          className="absolute inset-y-0"
          style={{
            left: `${needsEnd}%`,
            width: `${Math.max(0, 100 - needsEnd)}%`,
            backgroundColor: "#be123c33",
          }}
        />
      </div>
      <span
        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
        style={{ left: `${valueEnd}%`, backgroundColor: ratingColor(rating) }}
      />
    </div>
  );
}

function CwvMetricRow({
  label,
  display,
  rating,
  copy,
  value,
  goodMax,
  needsMax,
  thresholdHint,
}: {
  label: string;
  display: string;
  rating: LabCwvRating | null;
  copy: ObservationOptionalMetricsCopy;
  value: number | null;
  goodMax: number;
  needsMax: number;
  thresholdHint: string;
}) {
  return (
    <li className="rounded-lg border border-border bg-surface px-3 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
        <p className="text-xs font-semibold" style={{ color: ratingColor(rating) }}>
          {ratingLabel(rating, copy)}
        </p>
      </div>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">{display}</p>
      {value != null ? (
        <CwvThresholdBar value={value} goodMax={goodMax} needsMax={needsMax} rating={rating} />
      ) : null}
      <p className="mt-2 text-xs leading-relaxed text-ink-muted">{thresholdHint}</p>
    </li>
  );
}

function LabCwvBody({ row, copy }: { row: LabCwvV1; copy: ObservationOptionalMetricsCopy }) {
  const ratings = labCwvRatings(row);
  const mix = { good: 0, needs_improvement: 0, poor: 0 };
  for (const rating of [ratings.lcp, ratings.cls, ratings.tbt, ratings.fcp]) {
    if (rating) mix[rating] += 1;
  }
  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.cwvLab}</p>
      <p className="text-xs leading-relaxed text-ink-muted">{copy.cwvChartHint}</p>
      <ObservationFactCountBar
        ariaLabel={copy.cwvLab}
        segments={[
          { key: "good", count: mix.good, label: copy.ratingGood, color: "#276248" },
          { key: "needs", count: mix.needs_improvement, label: copy.ratingNeeds, color: "#b45309" },
          { key: "poor", count: mix.poor, label: copy.ratingPoor, color: "#be123c" },
        ]}
      />
      <ul className="grid gap-2 sm:grid-cols-2">
        <CwvMetricRow
          label={copy.cwvLcp}
          display={formatMs(row.lcp_ms)}
          rating={ratings.lcp}
          copy={copy}
          value={row.lcp_ms}
          goodMax={2500}
          needsMax={4000}
          thresholdHint={copy.cwvLcpThreshold}
        />
        <CwvMetricRow
          label={copy.cwvCls}
          display={formatCls(row.cls)}
          rating={ratings.cls}
          copy={copy}
          value={row.cls}
          goodMax={0.1}
          needsMax={0.25}
          thresholdHint={copy.cwvClsThreshold}
        />
        <CwvMetricRow
          label={copy.cwvTbt}
          display={formatMs(row.tbt_ms)}
          rating={ratings.tbt}
          copy={copy}
          value={row.tbt_ms}
          goodMax={200}
          needsMax={600}
          thresholdHint={copy.cwvTbtThreshold}
        />
        <CwvMetricRow
          label={copy.cwvFcp}
          display={formatMs(row.fcp_ms)}
          rating={ratings.fcp}
          copy={copy}
          value={row.fcp_ms}
          goodMax={1800}
          needsMax={3000}
          thresholdHint={copy.cwvFcpThreshold}
        />
      </ul>
      <p className="text-xs leading-relaxed text-ink-muted">{copy.cwvInpDetail}</p>
    </div>
  );
}

function syntheticKindLabel(
  kind: SyntheticInteractionKind,
  copy: ObservationOptionalMetricsCopy,
): string {
  if (kind === "nav") return copy.syntheticKindNav;
  if (kind === "link") return copy.syntheticKindLink;
  return copy.syntheticKindButton;
}

function SyntheticBody({
  row,
  copy,
}: {
  row: SyntheticInteractionV1;
  copy: ObservationOptionalMetricsCopy;
}) {
  const mix = { good: 0, needs_improvement: 0, poor: 0 };
  for (const item of row.interactions) {
    const rating = syntheticLatencyRating(item.latency_ms);
    if (rating) mix[rating] += 1;
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
          {copy.syntheticBadge}
        </p>
      </div>
      <p className="text-xs leading-relaxed text-ink-muted">{copy.syntheticNotInp}</p>
      {row.interactions.length === 0 || row.error === "no_safe_target" ? (
        <p className="text-sm text-ink">{copy.syntheticNoTarget}</p>
      ) : (
        <>
          <ObservationFactCountBar
            ariaLabel={copy.syntheticTitle}
            segments={[
              { key: "good", count: mix.good, label: copy.ratingGood, color: "#276248" },
              { key: "needs", count: mix.needs_improvement, label: copy.ratingNeeds, color: "#b45309" },
              { key: "poor", count: mix.poor, label: copy.ratingPoor, color: "#be123c" },
            ]}
          />
          <ul className="grid gap-2 sm:grid-cols-2">
            {row.interactions.map((item, index) => {
              const rating = syntheticLatencyRating(item.latency_ms);
              return (
                <li
                  key={`${item.kind}:${item.label}:${index}`}
                  className="rounded-lg border border-border bg-surface px-3 py-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    {copy.syntheticTested}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {syntheticKindLabel(item.kind, copy)}
                    {item.label ? ` · ${item.label}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      {copy.syntheticResponse}
                    </p>
                    <p className="text-xs font-semibold" style={{ color: ratingColor(rating) }}>
                      {item.latency_ms != null ? ratingLabel(rating, copy) : "—"}
                    </p>
                  </div>
                  <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">
                    {formatMs(item.latency_ms)}
                  </p>
                  {item.latency_ms != null ? (
                    <CwvThresholdBar
                      value={item.latency_ms}
                      goodMax={200}
                      needsMax={500}
                      rating={rating}
                    />
                  ) : null}
                  {item.navigated ? (
                    <p className="mt-2 text-xs text-ink-muted">{copy.syntheticNavigated}</p>
                  ) : null}
                  {item.error ? <p className="mt-2 text-xs text-ink-muted">{item.error}</p> : null}
                </li>
              );
            })}
          </ul>
          <p className="text-xs leading-relaxed text-ink-muted">{copy.syntheticThreshold}</p>
        </>
      )}
    </div>
  );
}

function FieldCwvBody({ row, copy }: { row: FieldCwvV1; copy: ObservationOptionalMetricsCopy }) {
  const ratings = fieldCwvRatings(row);
  const hasAny = row.inp_ms != null || row.lcp_ms != null || row.cls != null;
  const mix = { good: 0, needs_improvement: 0, poor: 0 };
  for (const rating of [ratings.inp, ratings.lcp, ratings.cls]) {
    if (rating) mix[rating] += 1;
  }
  const period =
    row.collection_first && row.collection_last
      ? copy.fieldPeriod.replace("{start}", row.collection_first).replace("{end}", row.collection_last)
      : null;
  const scopeHint =
    row.scope === "origin"
      ? copy.fieldScopeHintOrigin.replace("{origin}", row.origin)
      : row.scope === "url"
        ? copy.fieldScopeHintUrl
        : null;

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.fieldChromeUsers}</p>
        <p className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
          {copy.fieldP75}
        </p>
        {row.scope === "url" ? (
          <p className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
            {copy.fieldScopeUrl}
          </p>
        ) : null}
        {row.scope === "origin" ? (
          <p className="rounded-full border border-accent/30 bg-surface px-2 py-0.5 text-[10px] font-semibold text-accent">
            {copy.fieldScopeOrigin}
          </p>
        ) : null}
      </div>
      {period ? <p className="text-xs text-ink-muted">{period}</p> : null}
      {scopeHint ? <p className="text-xs leading-relaxed text-ink-muted">{scopeHint}</p> : null}
      {!hasAny || row.error === "no_data" ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-ink">{copy.fieldNoData}</p>
          <p className="text-sm leading-relaxed text-ink">{copy.fieldNoDataDetail}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {copy.fieldChecked}
          </p>
        </div>
      ) : (
        <>
          <ObservationFactCountBar
            ariaLabel={copy.fieldTitle}
            segments={[
              { key: "good", count: mix.good, label: copy.ratingGood, color: "#276248" },
              { key: "needs", count: mix.needs_improvement, label: copy.ratingNeeds, color: "#b45309" },
              { key: "poor", count: mix.poor, label: copy.ratingPoor, color: "#be123c" },
            ]}
          />
          <ul className="grid gap-2 sm:grid-cols-3">
            <CwvMetricRow
              label={copy.cwvInp}
              display={formatMs(row.inp_ms)}
              rating={ratings.inp}
              copy={copy}
              value={row.inp_ms}
              goodMax={200}
              needsMax={500}
              thresholdHint={copy.cwvInpThreshold}
            />
            <CwvMetricRow
              label={copy.cwvLcp}
              display={formatMs(row.lcp_ms)}
              rating={ratings.lcp}
              copy={copy}
              value={row.lcp_ms}
              goodMax={2500}
              needsMax={4000}
              thresholdHint={copy.cwvLcpThreshold}
            />
            <CwvMetricRow
              label={copy.cwvCls}
              display={formatCls(row.cls)}
              rating={ratings.cls}
              copy={copy}
              value={row.cls}
              goodMax={0.1}
              needsMax={0.25}
              thresholdHint={copy.cwvClsThreshold}
            />
          </ul>
        </>
      )}
    </div>
  );
}

function SubpageRow({
  row,
  copy,
}: {
  row: SubpageScoreRowV1;
  copy: ObservationOptionalMetricsCopy;
}) {
  const width = row.score != null ? Math.max(4, Math.round((row.score / PAGE_SIGNALS_MAX) * 100)) : 0;
  const reasons = row.reason_ids.map((id) => pageSignalReasonFromId(id, row.http_status));
  let why: "reasons" | "none" | "missing" | "error" = "none";
  if (row.error && reasons.length === 0) why = "error";
  else if (reasons.length > 0) why = "reasons";
  else if (row.score != null && row.score < PAGE_SIGNALS_MAX) why = "missing";

  return (
    <li className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="min-w-0">
          <span className="font-medium">{row.path}</span>
          {row.title ? (
            <span className="mt-0.5 block truncate text-xs text-ink-muted">{row.title}</span>
          ) : null}
          <span className="mt-0.5 block truncate text-[11px] text-ink-muted">{row.url}</span>
        </span>
        <span className="shrink-0 text-xs font-semibold tabular-nums" style={{ color: bandColor(row.band) }}>
          {row.score != null ? `${row.score} / 100` : row.error ?? "—"}
          {row.http_status != null ? ` · HTTP ${row.http_status}` : ""}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-border" aria-hidden>
        <span
          className="block h-full rounded-full"
          style={{ width: `${width}%`, backgroundColor: bandColor(row.band) }}
        />
      </div>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.subWhyTitle}</p>
      {why === "error" ? (
        <p className="mt-1 text-xs text-ink-muted">{row.error}</p>
      ) : why === "missing" ? (
        <p className="mt-1 text-xs text-ink-muted">{copy.subReasonsMissing}</p>
      ) : why === "none" ? (
        <p className="mt-1 text-xs text-ink-muted">{copy.subNoDeductions}</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {reasons.map((reason) => (
            <li key={reason.id} className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
              <span className="min-w-0 text-ink">{formatPageSignalReason(reason, copy.reasons)}</span>
              <span className="shrink-0 font-semibold text-ink-muted">
                −{reason.points} ·{" "}
                {formatPageSignalSeverity(reason.severity, {
                  critical: copy.severityCritical,
                  important: copy.severityImportant,
                  minor: copy.severityMinor,
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

type Props = {
  copy: ObservationOptionalMetricsCopy;
  observationId?: string;
  initialLabCwv?: LabCwvV1 | null;
  initialFieldCwv?: FieldCwvV1 | null;
  initialSynthetic?: SyntheticInteractionV1 | null;
  initialSubpages?: SubpageScoresV1 | null;
  labCwvUsed: number;
  labCwvLimit: number;
  fieldCwvUsed: number;
  fieldCwvLimit: number;
  syntheticUsed: number;
  syntheticLimit: number;
  subpageMaxLinks: number;
  browserlessConfigured: boolean;
  cruxConfigured: boolean;
  hideSyntheticRunner?: boolean;
};

export function ObservationOptionalMetricsPanel({
  copy,
  observationId,
  initialLabCwv = null,
  initialFieldCwv = null,
  initialSynthetic = null,
  initialSubpages = null,
  labCwvUsed,
  labCwvLimit,
  fieldCwvUsed,
  fieldCwvLimit,
  syntheticUsed,
  syntheticLimit,
  subpageMaxLinks,
  browserlessConfigured,
  cruxConfigured,
  hideSyntheticRunner = false,
}: Props) {
  const [labCwv, setLabCwv] = useState<LabCwvV1 | null>(initialLabCwv);
  const [fieldCwv, setFieldCwv] = useState<FieldCwvV1 | null>(initialFieldCwv);
  const [synthetic, setSynthetic] = useState<SyntheticInteractionV1 | null>(initialSynthetic);
  const [subpages, setSubpages] = useState<SubpageScoresV1 | null>(initialSubpages);
  const [used, setUsed] = useState(labCwvUsed);
  const [fieldUsed, setFieldUsed] = useState(fieldCwvUsed);
  const [syntheticUsedCount, setSyntheticUsedCount] = useState(syntheticUsed);
  const [cwvError, setCwvError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [syntheticError, setSyntheticError] = useState<string | null>(null);
  const [subError, setSubError] = useState<string | null>(null);
  const [cwvPending, startCwv] = useTransition();
  const [fieldPending, startField] = useTransition();
  const [syntheticPending, startSynthetic] = useTransition();
  const [subPending, startSub] = useTransition();
  const canRun = Boolean(observationId);

  const quotaText = copy.cwvQuota.replace("{used}", String(used)).replace("{limit}", String(labCwvLimit));
  const fieldQuotaText = copy.fieldQuota
    .replace("{used}", String(fieldUsed))
    .replace("{limit}", String(fieldCwvLimit));
  const syntheticQuotaText = copy.syntheticQuota
    .replace("{used}", String(syntheticUsedCount))
    .replace("{limit}", String(syntheticLimit));
  const subHint = copy.subHint.replace("{n}", String(subpageMaxLinks));

  const runCwv = () => {
    if (!observationId) return;
    setCwvError(null);
    startCwv(async () => {
      const result = await runObservationLabCwvAction(observationId);
      if (!result.ok) {
        if (result.error === "quota") setCwvError(copy.quota);
        else if (result.error === "browserless_not_configured") setCwvError(copy.browserlessOff);
        else setCwvError(copy.failed);
        if (result.used != null) setUsed(result.used);
        return;
      }
      setLabCwv(result.labCwv);
      setUsed(result.used);
      if (result.fieldCwv) setFieldCwv(result.fieldCwv);
      if (result.fieldUsed != null) setFieldUsed(result.fieldUsed);
    });
  };

  const runSynthetic = () => {
    if (!observationId) return;
    setSyntheticError(null);
    startSynthetic(async () => {
      const result = await runObservationSyntheticInteractionAction(observationId);
      if (!result.ok) {
        if (result.error === "quota") setSyntheticError(copy.quota);
        else if (result.error === "browserless_not_configured") setSyntheticError(copy.browserlessOff);
        else setSyntheticError(copy.failed);
        if (result.used != null) setSyntheticUsedCount(result.used);
        return;
      }
      setSynthetic(result.synthetic);
      setSyntheticUsedCount(result.used);
    });
  };

  const runField = () => {
    if (!observationId) return;
    setFieldError(null);
    startField(async () => {
      const result = await runObservationFieldCwvAction(observationId);
      if (!result.ok) {
        if (result.error === "quota") setFieldError(copy.fieldQuotaHit);
        else if (result.error === "crux_not_configured") setFieldError(copy.fieldNotConfigured);
        else setFieldError(copy.failed);
        if (result.used != null) setFieldUsed(result.used);
        return;
      }
      setFieldCwv(result.fieldCwv);
      setFieldUsed(result.used);
    });
  };

  const runSub = () => {
    if (!observationId) return;
    setSubError(null);
    startSub(async () => {
      const result = await runObservationSubpageScoresAction(observationId);
      if (!result.ok) {
        setSubError(result.error === "no_links" ? copy.noLinks : copy.failed);
        return;
      }
      setSubpages(result.subpages);
    });
  };

  return (
    <section
      aria-labelledby="optional-metrics-heading"
      className="rounded-xl border border-dashed border-border bg-surface-elevated p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="optional-metrics-heading" className="font-display text-lg font-semibold text-ink">
          {copy.title}
        </h2>
        <p className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
          {copy.badge}
        </p>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{copy.hint}</p>

      <div className="mt-5 space-y-6">
        <div>
          <h3 className="font-display text-base font-semibold text-ink">{copy.cwvTitle}</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">{copy.cwvHint}</p>
          <p className="mt-1 text-xs text-ink-muted">{quotaText}</p>
          {labCwv ? <LabCwvBody row={labCwv} copy={copy} /> : null}
          {cwvError ? (
            <p role="alert" className="mt-2 text-sm text-rose-800">
              {cwvError}
            </p>
          ) : null}
          {canRun ? (
            <button
              type="button"
              onClick={runCwv}
              disabled={cwvPending || !browserlessConfigured || used >= labCwvLimit}
              className="mt-3 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {cwvPending ? copy.cwvMeasuring : labCwv ? copy.cwvAgain : copy.cwvMeasure}
            </button>
          ) : null}
          {!browserlessConfigured ? (
            <p className="mt-2 text-xs text-ink-muted">{copy.browserlessOff}</p>
          ) : null}
        </div>

        <div>
          <h3 className="font-display text-base font-semibold text-ink">{copy.syntheticTitle}</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">{copy.syntheticHint}</p>
          <p className="mt-1 text-xs text-ink-muted">{syntheticQuotaText}</p>
          {synthetic ? <SyntheticBody row={synthetic} copy={copy} /> : null}
          {syntheticError ? (
            <p role="alert" className="mt-2 text-sm text-rose-800">
              {syntheticError}
            </p>
          ) : null}
          {hideSyntheticRunner ? (
            <p className="mt-2 text-xs text-ink-muted">{copy.syntheticRunViaJourney}</p>
          ) : canRun ? (
            <button
              type="button"
              onClick={runSynthetic}
              disabled={syntheticPending || !browserlessConfigured || syntheticUsedCount >= syntheticLimit}
              className="mt-3 inline-flex rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface-elevated disabled:opacity-60"
            >
              {syntheticPending
                ? copy.syntheticMeasuring
                : synthetic
                  ? copy.syntheticAgain
                  : copy.syntheticMeasure}
            </button>
          ) : null}
        </div>

        <div>
          <h3 className="font-display text-base font-semibold text-ink">{copy.fieldTitle}</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">{copy.fieldHint}</p>
          <p className="mt-1 text-xs text-ink-muted">{fieldQuotaText}</p>
          {fieldCwv ? <FieldCwvBody row={fieldCwv} copy={copy} /> : null}
          {fieldError ? (
            <p role="alert" className="mt-2 text-sm text-rose-800">
              {fieldError}
            </p>
          ) : null}
          {canRun && !fieldCwv ? (
            <button
              type="button"
              onClick={runField}
              disabled={fieldPending || !cruxConfigured || fieldUsed >= fieldCwvLimit}
              className="mt-3 inline-flex rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface-elevated disabled:opacity-60"
            >
              {fieldPending ? copy.fieldMeasuring : copy.fieldMeasure}
            </button>
          ) : null}
          {canRun && fieldCwv ? (
            <div className="mt-3 space-y-1">
              <p className="text-xs leading-relaxed text-ink-muted">{copy.fieldAgainHint}</p>
              <button
                type="button"
                onClick={runField}
                disabled={fieldPending || !cruxConfigured || fieldUsed >= fieldCwvLimit}
                className="text-xs font-medium text-ink-muted underline decoration-border underline-offset-4 hover:text-ink disabled:opacity-60"
              >
                {fieldPending ? copy.fieldMeasuring : copy.fieldAgain}
              </button>
            </div>
          ) : null}
          {!cruxConfigured ? (
            <p className="mt-2 text-xs text-ink-muted">{copy.fieldNotConfigured}</p>
          ) : null}
        </div>

        <div>
          <h3 className="font-display text-base font-semibold text-ink">{copy.subTitle}</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">{subHint}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {copy.subNoScreenshot}
          </p>
          {subpages?.pages.length ? (
            <div className="mt-3 space-y-3">
              <p className="text-xs leading-relaxed text-ink-muted">{copy.subChartHint}</p>
              <ObservationFactCountBar
                ariaLabel={copy.subMixLabel}
                segments={[
                  {
                    key: "good",
                    count: subpages.pages.filter((row) => row.band === "good").length,
                    label: copy.bandGood,
                    color: "#276248",
                  },
                  {
                    key: "review",
                    count: subpages.pages.filter((row) => row.band === "review").length,
                    label: copy.bandReview,
                    color: "#b45309",
                  },
                  {
                    key: "attention",
                    count: subpages.pages.filter((row) => row.band === "attention").length,
                    label: copy.bandAttention,
                    color: "#be123c",
                  },
                ]}
              />
              <ul className="space-y-2">
                {subpages.pages.map((row) => (
                  <SubpageRow key={row.url} row={row} copy={copy} />
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-2 text-sm text-ink">{copy.subNone}</p>
          )}
          {subError ? (
            <p role="alert" className="mt-2 text-sm text-rose-800">
              {subError}
            </p>
          ) : null}
          {canRun ? (
            <button
              type="button"
              onClick={runSub}
              disabled={subPending}
              className="mt-3 inline-flex rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface-elevated disabled:opacity-60"
            >
              {subPending ? copy.subMeasuring : subpages ? copy.subAgain : copy.subMeasure}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
