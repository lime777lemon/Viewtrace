"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { runObservationSyntheticInteractionAction } from "@/app/actions/observation-optional-metrics";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import {
  buildJourneyCompareRows,
  buildJourneyRun,
  formatJourneyDurationSec,
  type JourneyRegionColumn,
  type JourneyStepStatus,
} from "@/lib/observation-journey";
import type { Observation } from "@/lib/demo/observations";
import type { SyntheticInteractionV1 } from "@/lib/observation-synthetic-interaction";

export type JourneyRegionPeer = {
  observationId: string;
  regionLabel: string;
  synthetic: SyntheticInteractionV1 | null;
  status: Observation["status"];
};

type Props = {
  observationId: string;
  regionLabel: string;
  observationStatus: Observation["status"];
  initialSynthetic: SyntheticInteractionV1 | null;
  regionPeers: JourneyRegionPeer[];
  locale: Locale;
  canRun: boolean;
  used: number;
  limit: number;
};

function statusText(status: JourneyStepStatus, t: (typeof copy)[Locale]["observationDetail"]): string {
  if (status === "pass") return t.journeyPass;
  if (status === "fail") return t.journeyFail;
  return t.journeyNotRun;
}

function statusClass(status: JourneyStepStatus): string {
  if (status === "pass") return "font-semibold text-emerald-800 dark:text-emerald-200";
  if (status === "fail") return "font-semibold text-red-800 dark:text-red-200";
  return "text-ink-muted";
}

export function ObservationJourneyPanel({
  observationId,
  regionLabel,
  observationStatus,
  initialSynthetic,
  regionPeers,
  locale,
  canRun,
  used,
  limit,
}: Props) {
  const t = copy[locale].observationDetail;
  const router = useRouter();
  const [synthetic, setSynthetic] = useState(initialSynthetic);
  const [usedCount, setUsedCount] = useState(used);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = buildJourneyRun({ observationStatus, synthetic });
  const columns: JourneyRegionColumn[] = [
    { observationId, regionLabel, run },
    ...regionPeers
      .filter((peer) => peer.observationId !== observationId)
      .slice(0, 4)
      .map((peer) => ({
        observationId: peer.observationId,
        regionLabel: peer.regionLabel,
        run: buildJourneyRun({ observationStatus: peer.status, synthetic: peer.synthetic }),
      })),
  ];
  const compareRows = columns.length > 1 ? buildJourneyCompareRows(columns) : [];
  const duration = formatJourneyDurationSec(run.durationMs);
  const overall =
    run.overall === "pass" ? t.journeyPass : run.overall === "fail" ? t.journeyFail : t.journeyNotRun;

  function runJourney() {
    setError(null);
    start(async () => {
      const result = await runObservationSyntheticInteractionAction(observationId);
      if (!result.ok) {
        const map: Record<string, string> = {
          unauthorized: t.journeyErrAuth,
          invalid_id: t.journeyErrNotFound,
          not_found: t.journeyErrNotFound,
          quota: t.journeyErrQuota,
          failed: t.journeyErrFailed,
          browserless_not_configured: t.journeyErrCapture,
        };
        setError(map[result.error] ?? t.journeyErrFailed);
        if (result.used != null) setUsedCount(result.used);
        return;
      }
      setSynthetic(result.synthetic);
      setUsedCount(result.used);
      router.refresh();
    });
  }

  return (
    <section
      id="observation-journey"
      className="scroll-mt-28 rounded-xl border border-border bg-surface-elevated p-4 sm:p-5"
      aria-labelledby="observation-journey-heading"
    >
      <h3 id="observation-journey-heading" className="text-sm font-semibold text-ink">
        {t.journeyTitle}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t.journeyHint}</p>
      <p className="mt-2 text-xs text-ink-muted">
        {t.journeyQuota.replace("{used}", String(usedCount)).replace("{limit}", String(limit))}
      </p>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-ink">
          {regionLabel}
          {" · "}
          <span className={statusClass(run.overall === "not_run" ? "not_run" : run.overall)}>
            {overall}
          </span>
          {duration ? ` · ${duration}` : ""}
        </p>
        {canRun ? (
          <button
            type="button"
            disabled={pending || usedCount >= limit}
            onClick={runJourney}
            className="inline-flex rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink hover:border-accent/40 disabled:opacity-60"
          >
            {pending ? t.journeyRunning : synthetic ? t.journeyRunAgain : t.journeyRun}
          </button>
        ) : (
          <p className="text-xs text-ink-muted">{t.journeyCaptureOff}</p>
        )}
      </div>
      {error ? (
        <p className="mt-2 text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <ol className="mt-4 space-y-2">
        {run.steps.map((step, index) => (
          <li
            key={step.key}
            className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
          >
            <p className="text-sm text-ink">
              {index + 1}. {step.key === "open" ? t.journeyOpenPage : step.label}
            </p>
            <p className={`text-xs ${statusClass(step.status)}`}>
              {statusText(step.status, t)}
              {step.latencyMs != null ? ` · ${step.latencyMs} ms` : ""}
            </p>
          </li>
        ))}
      </ol>

      {compareRows.length > 0 ? (
        <div className="mt-5 overflow-x-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {t.journeyRegionCompare}
          </p>
          <table className="mt-2 w-full min-w-md text-left text-xs">
            <thead>
              <tr className="border-b border-border text-ink-muted">
                <th className="py-2 pr-3 font-semibold">{t.journeyStep}</th>
                {columns.map((col) => (
                  <th key={col.observationId} className="py-2 pr-3 font-semibold">
                    {col.regionLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compareRows.map((row) => (
                <tr key={row.key} className="border-b border-border/70">
                  <td className="py-2 pr-3 text-ink">
                    {row.key === "open" ? t.journeyOpenPage : row.label}
                  </td>
                  {row.cells.map((cell, i) => (
                    <td key={`${row.key}-${columns[i]?.observationId ?? i}`} className={`py-2 pr-3 ${statusClass(cell.status)}`}>
                      {statusText(cell.status, t)}
                      {cell.latencyMs != null ? ` · ${cell.latencyMs} ms` : ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
