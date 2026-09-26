"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateObservationAnnotationsAction } from "@/app/actions/update-observation-annotations";
import type { Observation } from "@/lib/demo/observations";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";
import { copy, type Locale } from "@/lib/i18n";
import { localizeObservationNote } from "@/lib/i18n/observation-persisted-copy";
import { normalizeObservationTags } from "@/lib/observation-tags";

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

function RowTagEditor({
  observationId,
  currentTags,
  locale,
}: {
  observationId: string;
  currentTags: string[];
  locale: Locale;
}) {
  const t = copy[locale].observationsListPage;
  const router = useRouter();
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function addTag() {
    const next = normalizeObservationTags([...currentTags, value]);
    if (next.length === currentTags.length) return;
    setPending(true);
    setError(false);
    const r = await updateObservationAnnotationsAction(observationId, {
      tags: next,
      tagsMode: "union",
    });
    setPending(false);
    if (!r.ok) {
      setError(true);
      return;
    }
    setValue("");
    router.refresh();
  }

  return (
    <form
      className="mt-2 flex flex-wrap items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        void addTag();
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={32}
        placeholder={t.addTagPlaceholder}
        disabled={pending}
        className="w-28 rounded-lg border border-border bg-surface px-2 py-1 text-[11px] text-ink"
      />
      <button
        type="submit"
        disabled={pending || !value.trim()}
        className="rounded-lg px-2 py-1 text-[11px] font-semibold text-accent hover:text-accent-hover disabled:opacity-50"
      >
        {pending ? t.addingTag : t.addTag}
      </button>
      {error ? <span className="text-[11px] text-red-800">{t.addTagFailed}</span> : null}
    </form>
  );
}

export function ObservationsTable({
  rows,
  emptyMessage,
  locale,
  tagging = false,
  onTagClick,
}: {
  rows: Observation[];
  emptyMessage?: string;
  locale: Locale;
  tagging?: boolean;
  onTagClick?: (tag: string) => void;
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
              <th className="px-4 py-3">{tb.colCaptured}</th>
              <th className="px-4 py-3">{tb.colUrl}</th>
              <th className="px-4 py-3">{tb.colRegion}</th>
              <th className="px-4 py-3">{tb.colStatus}</th>
              <th className="px-4 py-3">{tb.colTags}</th>
              <th className="px-4 py-3 text-right">{tb.colActions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-surface/80">
                <td className="px-4 py-3 align-top text-ink-muted">
                  <span className="text-ink">{formatJaDateTime(row.capturedAt, locale)}</span>
                  <span className="mt-0.5 block text-[11px] text-ink-muted">
                    {formatUtcLabel(row.capturedAt)}
                  </span>
                </td>
                <td className="max-w-55 truncate px-4 py-3 align-top font-mono text-xs text-ink">
                  {row.url}
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-top text-ink">
                  {row.regionLabel}
                </td>
                <td className="px-4 py-3 align-top">
                  <StatusBadge status={row.status} locale={locale} />
                  {row.note ? (
                    <span className="mt-1 block text-[11px] text-ink-muted">
                      {localizeObservationNote(row.note, locale)}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-wrap gap-1">
                    {(row.tags ?? []).map((tag) =>
                      onTagClick ? (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => onTagClick(tag)}
                          className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-ink"
                        >
                          {tag}
                        </button>
                      ) : (
                        <span
                          key={tag}
                          className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-ink"
                        >
                          {tag}
                        </span>
                      ),
                    )}
                  </div>
                  {tagging ? (
                    <RowTagEditor
                      observationId={row.id}
                      currentTags={row.tags ?? []}
                      locale={locale}
                    />
                  ) : null}
                </td>
                <td className="px-4 py-3 text-right align-top">
                  <Link
                    href={`/dashboard/observations/${row.id}`}
                    className="font-medium text-accent hover:text-accent-hover"
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
