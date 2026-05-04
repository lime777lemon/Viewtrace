"use client";

import type { Locale } from "@/lib/i18n";
import { RegionSearchPanel, type RegionSearchLabels } from "@/components/RegionSearchPanel";

export type { RegionSearchLabels };

export function RegionSearchSection({ locale, labels }: { locale: Locale; labels: RegionSearchLabels }) {
  return (
    <section
      id="region-search"
      className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
      aria-labelledby="region-search-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <h2
          id="region-search-heading"
          className="font-display max-w-3xl text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl"
        >
          {labels.title}
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[var(--color-ink-muted)] sm:text-base">
          {labels.subtitle}
        </p>

        <div className="mt-10">
          <RegionSearchPanel locale={locale} labels={labels} mode="marketing" />
        </div>
      </div>
    </section>
  );
}
