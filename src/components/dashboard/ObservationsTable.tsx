"use client";

import { useRouter } from "next/navigation";
import { useTransition, type KeyboardEvent, type MouseEvent } from "react";
import type { Observation } from "@/lib/demo/observations";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";
import { copy, type Locale } from "@/lib/i18n";
import { ObservationRegionReadout } from "@/components/dashboard/ObservationRegionReadout";
import { observationGeoCopyFrom } from "@/lib/observation-geo-readout";
import { isObservationScreenshotExpired } from "@/lib/observation-screenshot-retention";
import { isObservationUuid } from "@/lib/observation-route-id";

function StatusBadge({
  status,
  locale,
}: {
  status: Observation["status"];
  locale: Locale;
}) {
  const labels = copy[locale].observationDetail;
  const map = {
    success: { label: labels.statusSuccess, className: "bg-emerald-100 text-emerald-900" },
    failure: { label: labels.statusFailure, className: "bg-red-100 text-red-900" },
    pending: { label: labels.statusPending, className: "bg-amber-100 text-amber-900" },
  } as const;
  const s = map[status];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.className}`}>
      {s.label}
    </span>
  );
}

function ObservationTableRow({
  row,
  locale,
  retentionDays,
  selected,
  onToggleSelect,
}: {
  row: Observation;
  locale: Locale;
  retentionDays?: number;
  selected?: boolean;
  onToggleSelect?: (id: string, selected: boolean) => void;
}) {
  const tb = copy[locale].observationsTable;
  const geoCopy = observationGeoCopyFrom(copy[locale].observationDetail);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const detailHref = `/dashboard/observations/${row.id}`;
  const capturedLabel = formatJaDateTime(row.capturedAt, locale);
  const detailAria = `${pending ? tb.actionOpening : tb.actionDetail}: ${capturedLabel}`;

  function openDetail(event: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; button?: number }) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button === 1) {
      window.open(detailHref, "_blank", "noopener,noreferrer");
      return;
    }
    if (pending) return;
    startTransition(() => {
      router.push(detailHref);
    });
  }

  function onRowClick(event: MouseEvent<HTMLTableRowElement>) {
    if ((event.target as HTMLElement).closest("input")) return;
    if (event.button === 1) event.preventDefault();
    openDetail(event);
  }

  function onRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    if ((event.target as HTMLElement).closest("input")) return;
    event.preventDefault();
    openDetail(event);
  }

  return (
    <tr
      data-tour="recordDetail"
      className={`cursor-pointer align-top hover:bg-accent-soft/50 ${pending ? "opacity-70" : ""}`}
      aria-busy={pending || undefined}
      aria-label={detailAria}
      tabIndex={0}
      onClick={onRowClick}
      onAuxClick={onRowClick}
      onKeyDown={onRowKeyDown}
    >
      {onToggleSelect ? (
        <td className="px-3 py-3 align-top">
          <input
            type="checkbox"
            checked={selected ?? false}
            disabled={!isObservationUuid(row.id)}
            title={isObservationUuid(row.id) ? undefined : copy[locale].observationsListPage.shareCollectionDemoSkip}
            onClick={(event) => event.stopPropagation()}
            onChange={(e) => onToggleSelect(row.id, e.target.checked)}
            className="mt-1 h-4 w-4 accent-accent"
            aria-label={copy[locale].observationsListPage.shareCollectionSelectRow}
          />
        </td>
      ) : null}
      <td className="px-4 py-3 align-top text-ink-muted">
        <span className="text-ink">{capturedLabel}</span>
        <span className="mt-0.5 block text-[11px] text-ink-muted">
          {formatUtcLabel(row.capturedAt)}
        </span>
      </td>
      <td className="max-w-55 px-4 py-3 align-top font-mono text-xs text-ink">
        <span className="block min-w-0 truncate">{row.url}</span>
      </td>
      <td className="px-4 py-3 align-top text-ink">
        <ObservationRegionReadout
          requestedLabel={row.regionLabel}
          regionValue={row.regionValue}
          captureConditions={row.captureConditions}
          copy={geoCopy}
          locale={locale}
          compact
        />
      </td>
      <td className="px-4 py-3 align-top">
        <StatusBadge status={row.status} locale={locale} />
        {pending ? <span className="mt-1 block text-[11px] font-semibold text-ink-muted">{tb.actionOpening}</span> : null}
        {retentionDays != null && isObservationScreenshotExpired(row, retentionDays) ? (
          <span className="mt-1 block text-[11px] text-ink-muted">{tb.screenshotExpired}</span>
        ) : null}
      </td>
      <td className="px-4 py-3 text-right align-top font-medium text-accent">
        {pending ? tb.actionOpening : tb.actionDetail}
      </td>
    </tr>
  );
}

export function ObservationsTable({
  rows,
  emptyMessage,
  locale,
  retentionDays,
  selectedIds,
  onToggleSelect,
}: {
  rows: Observation[];
  emptyMessage?: string;
  locale: Locale;
  retentionDays?: number;
  selectedIds?: ReadonlySet<string>;
  onToggleSelect?: (id: string, selected: boolean) => void;
}) {
  const tb = copy[locale].observationsTable;
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface-elevated px-4 py-8 text-center text-sm text-ink-muted">
        {emptyMessage ?? tb.emptyDefault}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-elevated">
      <div className="overflow-x-auto">
        <table className="w-full min-w-160 text-left text-sm">
          <thead className="border-b border-border bg-surface text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <tr>
              {onToggleSelect ? <th className="w-10 px-3 py-3">{tb.colSelect}</th> : null}
              <th className="px-4 py-3">{tb.colCaptured}</th>
              <th className="px-4 py-3">{tb.colUrl}</th>
              <th className="px-4 py-3">{tb.colRegion}</th>
              <th className="px-4 py-3">{tb.colStatus}</th>
              <th className="px-4 py-3 text-right">{tb.colActions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <ObservationTableRow
                key={row.id}
                row={row}
                locale={locale}
                retentionDays={retentionDays}
                selected={selectedIds?.has(row.id)}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
