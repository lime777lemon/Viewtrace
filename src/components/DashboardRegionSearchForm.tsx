import { recordWebVerifiedObservationAction } from "@/app/actions/observations";
import {
  REGION_SEARCH_FIELD_CLASS,
  RegionSearchQueryField,
} from "@/components/RegionSearchQueryField";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import type { RegionSearchLabels } from "@/components/RegionSearchQueryField";
import type { Locale } from "@/lib/i18n";
import type { PlanId } from "@/lib/plans";
import { DEFAULT_OBSERVATION_REGION, getRegionLabelForLocale, getRegionOptions } from "@/lib/regions";

type DashboardRegionSearchFormProps = {
  locale: Locale;
  labels: RegionSearchLabels;
  planId: PlanId;
};

export function DashboardRegionSearchForm({
  locale,
  labels,
  planId,
}: DashboardRegionSearchFormProps) {
  const options = getRegionOptions(planId).map((option) => ({
    value: option.value,
    label: getRegionLabelForLocale(option, locale),
  }));
  const defaultRegion =
    options.some((option) => option.value === DEFAULT_OBSERVATION_REGION)
      ? DEFAULT_OBSERVATION_REGION
      : options[0]?.value;

  return (
    <form
      action={recordWebVerifiedObservationAction}
      data-tour="observe"
      className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
        {labels.planLabel}
      </p>
      <p className="mt-2 text-sm text-ink-muted">
        {planId === "pro"
          ? `${labels.planPro} · ${labels.planProHint}`
          : `${labels.planStarter} · ${labels.planStarterHint}`}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div>
          <label htmlFor="region-search-region" className="block text-sm font-medium text-ink">
            {labels.dashboardRegionLabel}
          </label>
          <select
            id="region-search-region"
            name="region"
            aria-label={labels.dashboardRegionAria}
            defaultValue={defaultRegion}
            className={REGION_SEARCH_FIELD_CLASS}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <RegionSearchQueryField
          id="region-search-query"
          name="url"
          label={labels.dashboardQueryLabel}
          placeholder={labels.queryPlaceholder}
          required
          enterKeyHint="go"
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <PendingSubmitButton
          label={labels.dashboardSubmit}
          pendingLabel={labels.dashboardSubmitPending}
          className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover hover:shadow-md active:translate-y-px disabled:hover:shadow-sm"
          pendingClassName="hover:bg-accent"
        />
      </div>
      <p className="mt-4 text-xs leading-relaxed text-ink-muted">{labels.dashboardHint}</p>
    </form>
  );
}
