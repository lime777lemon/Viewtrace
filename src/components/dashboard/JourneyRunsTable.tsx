"use client";

import { Fragment, useState } from "react";
import { JourneyRunSummary } from "@/components/dashboard/JourneyRunSummary";
import { copy, type Locale } from "@/lib/i18n";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";
import {
  journeyRunGeoReadout,
  journeyStatusLabel,
  journeyStepReport,
  type JourneyStepDefinition,
} from "@/lib/journey-definition";
import type { JourneyRunPublic } from "@/lib/journey-store";

function statusClass(status: string): string {
  if (status === "passed" || status === "pass") return "bg-emerald-100 text-emerald-900";
  if (status === "failed" || status === "fail") return "bg-red-100 text-red-900";
  if (status === "blocked" || status === "incomplete" || status === "blocked_for_safety") return "bg-amber-100 text-amber-900";
  return "bg-surface text-ink";
}

export function JourneyStatusBadge({ status, locale }: { status: string; locale: Locale }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(status)}`}>
      {journeyStatusLabel(status, locale)}
    </span>
  );
}

export function JourneyRunsTable({
  runs,
  steps,
  regions,
  startUrl,
  locale,
}: {
  runs: JourneyRunPublic[];
  steps: JourneyStepDefinition[];
  regions: Array<{ value: string; label: string }>;
  startUrl: string;
  locale: Locale;
}) {
  const tb = copy[locale].observationsTable;
  const geoTemplate = copy[locale].observationDetail.geoRequestedObserved;
  const [openId, setOpenId] = useState<string | null>(null);
  const ja = locale === "ja";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-elevated">
      <div className="overflow-x-auto">
        <table className="w-full min-w-160 text-left text-sm">
          <thead className="border-b border-border bg-surface text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3">{tb.colCaptured}</th>
              <th className="px-4 py-3">{tb.colUrl}</th>
              <th className="px-4 py-3">{tb.colRegion}</th>
              <th className="px-4 py-3">{tb.colStatus}</th>
              <th className="px-4 py-3 text-right">{tb.colActions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {runs.map((run) => {
              const geo = run.environment && typeof run.environment.geo === "object" && run.environment.geo
                ? run.environment.geo as { stage?: string; requested_region?: string }
                : null;
              const viewport = run.environment && typeof run.environment.viewport === "object"
                ? run.environment.viewport as { width?: number; height?: number }
                : null;
              const regionLabel = regions.find((item) => item.value === run.region)?.label ?? run.region;
              const readout = journeyRunGeoReadout({
                region: geo?.requested_region || run.region,
                stage: geo?.stage,
                requestedLabel: regionLabel,
                locale,
                requestedObserved: geoTemplate,
              });
              const deviceLabel = run.device_class === "mobile" ? (ja ? "モバイル" : "Mobile") : (ja ? "デスクトップ" : "Desktop");
              const size = viewport?.width && viewport?.height ? `${viewport.width}×${viewport.height}` : "";
              const open = openId === run.id;
              const landed = [...run.steps].reverse().find((step) => step.url_after && /^https?:\/\//i.test(step.url_after))?.url_after ?? "";
              const url = startUrl || landed;
              const toggle = () => setOpenId(open ? null : run.id);
              return (
                <Fragment key={run.id}>
                  <tr
                    className="cursor-pointer align-top hover:bg-accent-soft/50"
                    onClick={toggle}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      toggle();
                    }}
                    tabIndex={0}
                    role="button"
                    aria-expanded={open}
                  >
                    <td className="px-4 py-3 text-ink-muted">
                      <span className="text-ink">{formatJaDateTime(run.created_at, locale)}</span>
                      <span className="mt-0.5 block text-[11px] text-ink-muted">{formatUtcLabel(run.created_at)}</span>
                    </td>
                    <td className="max-w-55 px-4 py-3 font-mono text-xs text-ink">
                      <span className="block truncate">{url}</span>
                      {landed && landed !== url ? <span className="mt-0.5 block truncate text-[11px] text-ink-muted">{landed}</span> : null}
                    </td>
                    <td className="px-4 py-3 text-ink">
                      <span>{readout.headline}</span>
                      <span className="mt-0.5 block text-[11px] font-normal text-ink-muted">
                        {deviceLabel}{size ? ` · ${size}` : ""}
                      </span>
                      {readout.detailLine ? <span className="mt-0.5 block text-[11px] font-normal text-ink-muted">{readout.detailLine}</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      <JourneyStatusBadge status={run.status} locale={locale} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-accent">
                      {tb.actionDetail}
                    </td>
                  </tr>
                  {open ? (
                    <tr className="bg-surface">
                      <td colSpan={5} className="px-4 py-3">
                        {run.alert ? <p className="text-xs font-medium text-red-700">Journey regression · {run.alert}</p> : null}
                        {run.duration_ms != null ? (
                          <p className="text-[11px] text-ink-muted">{(run.duration_ms / 1000).toFixed(1)}s</p>
                        ) : null}
                        <JourneyRunSummary
                          region={run.region}
                          environment={run.environment}
                          device={run.device_class}
                          steps={run.steps}
                          defined={steps}
                          locale={locale}
                        />
                        <ol className="mt-3 space-y-3">
                          {run.steps.map((step, index) => {
                            const defined = steps.find((item) => item.id === step.id) ?? steps[index] ?? null;
                            const report = journeyStepReport(step, defined, index, locale);
                            return (
                              <li key={`${run.id}-${step.id}`} className="text-xs text-ink">
                                <p className="font-semibold">{report.title}</p>
                                <dl className="mt-1 space-y-0.5 text-ink-muted">
                                  {report.lines.map((line, lineIndex) => (
                                    <div key={`${line.label}-${lineIndex}`} className="flex gap-2">
                                      <dt className="shrink-0">{line.label}</dt>
                                      <dd className="min-w-0 break-all">{line.value}</dd>
                                    </div>
                                  ))}
                                </dl>
                              </li>
                            );
                          })}
                        </ol>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
