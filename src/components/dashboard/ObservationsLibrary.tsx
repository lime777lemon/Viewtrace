"use client";

import { useMemo, useState } from "react";
import type { Observation } from "@/lib/demo/observations";
import { copy, type Locale } from "@/lib/i18n";
import { filterObservationsByLibrary } from "@/lib/observation-tags";
import { ObservationsTable } from "@/components/dashboard/ObservationsTable";
import { ShareCollectionPanel } from "@/components/dashboard/ShareCollectionPanel";
import type { OwnerShareCollectionSummary } from "@/lib/observation-share-collection-shared";

export function ObservationsLibrary({
  rows,
  locale,
  retentionDays,
  shareCollections = [],
}: {
  rows: Observation[];
  locale: Locale;
  retentionDays?: number;
  shareCollections?: OwnerShareCollectionSummary[];
}) {
  const t = copy[locale].observationsListPage;
  const tb = copy[locale].observationsTable;
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(
    () => filterObservationsByLibrary(rows, query, null),
    [rows, query],
  );

  const hasActiveFilter = query.trim().length > 0;

  function toggleSelect(id: string, selected: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  if (rows.length === 0) {
    return (
      <div className="space-y-4" data-tour="recordsScreen">
        {shareCollections.length > 0 ? (
          <ShareCollectionPanel selectedIds={[]} locale={locale} existing={shareCollections} />
        ) : null}
        <ObservationsTable rows={rows} locale={locale} retentionDays={retentionDays} />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-tour="recordsScreen">
      <div className="rounded-xl border border-border bg-surface-elevated p-4 sm:p-5">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {t.searchLabel}
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink"
          />
        </label>
        <p className="mt-3 text-xs text-ink-muted">
          {t.resultCount.replace("{shown}", String(filtered.length)).replace("{total}", String(rows.length))}
        </p>
      </div>

      <ShareCollectionPanel
        selectedIds={[...selectedIds]}
        locale={locale}
        existing={shareCollections}
      />

      <ObservationsTable
        rows={filtered}
        locale={locale}
        emptyMessage={hasActiveFilter ? t.noSearchMatch : tb.emptyDefault}
        retentionDays={retentionDays}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
      />
    </div>
  );
}
