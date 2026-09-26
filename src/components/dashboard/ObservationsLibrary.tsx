"use client";

import { useMemo, useState } from "react";
import type { Observation } from "@/lib/demo/observations";
import { copy, type Locale } from "@/lib/i18n";
import {
  UNTAGGED_FILTER,
  filterObservationsByLibrary,
  uniqueObservationTags,
} from "@/lib/observation-tags";
import { ObservationsTable } from "@/components/dashboard/ObservationsTable";

export function ObservationsLibrary({
  rows,
  locale,
}: {
  rows: Observation[];
  locale: Locale;
}) {
  const t = copy[locale].observationsListPage;
  const tb = copy[locale].observationsTable;
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const availableTags = useMemo(() => uniqueObservationTags(rows), [rows]);
  const filtered = useMemo(
    () => filterObservationsByLibrary(rows, query, tagFilter),
    [rows, query, tagFilter],
  );

  const hasActiveFilter = query.trim().length > 0 || tagFilter !== null;

  if (rows.length === 0) {
    return <ObservationsTable rows={rows} locale={locale} />;
  }

  return (
    <div className="space-y-4">
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
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTagFilter(null)}
            aria-pressed={tagFilter === null}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              tagFilter === null
                ? "bg-ink text-white"
                : "border border-border bg-surface text-ink-muted hover:text-ink"
            }`}
          >
            {t.allTags}
          </button>
          <button
            type="button"
            onClick={() => setTagFilter(UNTAGGED_FILTER)}
            aria-pressed={tagFilter === UNTAGGED_FILTER}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              tagFilter === UNTAGGED_FILTER
                ? "bg-ink text-white"
                : "border border-border bg-surface text-ink-muted hover:text-ink"
            }`}
          >
            {t.untagged}
          </button>
          {availableTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTagFilter(tag)}
              aria-pressed={tagFilter?.toLowerCase() === tag.toLowerCase()}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                tagFilter?.toLowerCase() === tag.toLowerCase()
                  ? "bg-accent text-white"
                  : "border border-border bg-surface text-ink-muted hover:text-ink"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          {t.resultCount.replace("{shown}", String(filtered.length)).replace("{total}", String(rows.length))}
          {" · "}
          {t.tagUrlHint}
        </p>
      </div>

      <ObservationsTable
        rows={filtered}
        locale={locale}
        emptyMessage={hasActiveFilter ? t.noSearchMatch : tb.emptyDefault}
        tagging
        onTagClick={setTagFilter}
      />
    </div>
  );
}
