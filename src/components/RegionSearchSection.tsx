import { RegionSearchPanel, type RegionSearchLabels } from "@/components/RegionSearchPanel";
import { RegionSearchQueryField } from "@/components/RegionSearchQueryField";
import type { Locale } from "@/lib/i18n";

export type { RegionSearchLabels };

export function RegionSearchSection({ locale, labels }: { locale: Locale; labels: RegionSearchLabels }) {
  return (
    <section
      id="region-search"
      className="border-b border-border bg-surface-elevated"
      aria-labelledby="region-search-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <h2
          id="region-search-heading"
          className="font-display max-w-3xl text-2xl font-semibold text-ink sm:text-3xl"
        >
          {labels.title}
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-muted sm:text-base">
          {labels.subtitle}
        </p>

        <div className="mt-10">
          <RegionSearchPanel
            locale={locale}
            labels={labels}
            mode="marketing"
            queryField={
              <RegionSearchQueryField
                id="region-search-query"
                name="query"
                type="search"
                label={labels.queryLabel}
                placeholder={labels.queryPlaceholder}
                enterKeyHint="search"
              />
            }
          />
        </div>
      </div>
    </section>
  );
}
