import Link from "next/link";
import type { Observation } from "@/lib/demo/observations";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";
import { copy, type Locale } from "@/lib/i18n";
import { localizeObservationNote } from "@/lib/i18n/observation-persisted-copy";

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

export function ObservationsTable({
  rows,
  emptyMessage,
  locale,
}: {
  rows: Observation[];
  emptyMessage?: string;
  locale: Locale;
}) {
  const tb = copy[locale].observationsTable;
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-8 text-center text-sm text-[var(--color-ink-muted)]">
        {emptyMessage ?? tb.emptyDefault}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            <tr>
              <th className="px-4 py-3">{tb.colCaptured}</th>
              <th className="px-4 py-3">{tb.colUrl}</th>
              <th className="px-4 py-3">{tb.colRegion}</th>
              <th className="px-4 py-3">{tb.colStatus}</th>
              <th className="px-4 py-3 text-right">{tb.colActions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-[var(--color-surface)]/80">
                <td className="px-4 py-3 align-top text-[var(--color-ink-muted)]">
                  <span className="text-[var(--color-ink)]">{formatJaDateTime(row.capturedAt)}</span>
                  <span className="mt-0.5 block text-[11px] text-[var(--color-ink-muted)]">
                    {formatUtcLabel(row.capturedAt)}
                  </span>
                </td>
                <td className="max-w-[220px] truncate px-4 py-3 align-top font-mono text-xs text-[var(--color-ink)]">
                  {row.url}
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-top text-[var(--color-ink)]">
                  {row.regionLabel}
                </td>
                <td className="px-4 py-3 align-top">
                  <StatusBadge status={row.status} locale={locale} />
                  {row.note ? (
                    <span className="mt-1 block text-[11px] text-[var(--color-ink-muted)]">
                      {localizeObservationNote(row.note, locale)}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-right align-top">
                  <Link
                    href={`/dashboard/observations/${row.id}`}
                    className="font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
                  >
                    {tb.actionDetail}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
