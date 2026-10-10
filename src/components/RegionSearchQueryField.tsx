export type RegionSearchLabels = {
  title: string;
  subtitle: string;
  planLabel: string;
  planStarter: string;
  planPro: string;
  planStarterHint: string;
  planProHint: string;
  regionLabel: string;
  regionAria: string;
  queryLabel: string;
  queryPlaceholder: string;
  submit: string;
  hint: string;
  mockTitle: string;
  mockSnapshot: string;
  mockEmptyQuery: string;
  dashboardHint: string;
  dashboardCta: string;
  dashboardSubmit: string;
  dashboardSubmitPending: string;
  dashboardQueryLabel: string;
  dashboardRegionLabel: string;
  dashboardRegionAria: string;
  previewLiveNote: string;
  previewLiveNoteMarketing: string;
  previewDirectAccess: string;
  previewSampleNote: string;
  previewRegionCtaTitle: string;
  previewRegionCtaButton: string;
  regionMarketingHint: string;
  previewLoading: string;
  previewError: string;
  previewOpenLive: string;
  previewNotUrl: string;
  recordAsObservation: string;
  recordAsObservationHint: string;
  recordAsObservationLogin: string;
  recordAsObservationLoginSuffix: string;
};

export const REGION_SEARCH_FIELD_CLASS =
  "mt-2 w-full rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm text-ink outline-none ring-accent/25 placeholder:text-ink-muted/65 focus:border-accent/40 focus:ring-2";

type RegionSearchQueryFieldProps = {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  type?: "text" | "search";
  required?: boolean;
  enterKeyHint?: "go" | "search";
};

/** Native URL field. Keep this a Server Component so typing is not hydrated. */
export function RegionSearchQueryField({
  id,
  name,
  label,
  placeholder,
  type = "text",
  required = false,
  enterKeyHint = "go",
}: RegionSearchQueryFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        enterKeyHint={enterKeyHint}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        defaultValue=""
        placeholder={placeholder}
        className={REGION_SEARCH_FIELD_CLASS}
      />
    </div>
  );
}
