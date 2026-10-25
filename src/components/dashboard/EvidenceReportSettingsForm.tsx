import { saveEvidenceReportSettingsAction } from "@/app/actions/evidence-report-settings";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import { EVIDENCE_REPORT_EMAIL_LIMIT } from "@/lib/scheduled-evidence-report";

const fieldClass = "mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm";

function SecretField({
  label,
  name,
  mask,
  placeholder,
  inputType,
  savedLabel,
  replacePlaceholder,
  clearLabel,
}: {
  label: string;
  name: string;
  mask: string | null;
  placeholder: string;
  inputType: "url" | "text";
  savedLabel: string;
  replacePlaceholder: string;
  clearLabel: string;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm text-ink">
        <span className="font-medium">{label}</span>
        {mask ? (
          <span className="mt-1 block font-mono text-xs text-ink-muted">
            {savedLabel} {mask}
          </span>
        ) : null}
        <input
          type={inputType}
          name={name}
          placeholder={mask ? replacePlaceholder : placeholder}
          autoComplete="off"
          spellCheck={false}
          className={fieldClass}
        />
      </label>
      {mask ? (
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          <input type="checkbox" name={`${name}_clear`} />
          <span>{clearLabel}</span>
        </label>
      ) : null}
    </div>
  );
}

export function EvidenceReportSettingsForm({
  locale,
  emailEnabled,
  accountEmail,
  recipientEmails,
  slackMask,
  teamsMask,
  otherMask,
}: {
  locale: Locale;
  emailEnabled: boolean;
  accountEmail: string;
  recipientEmails: string[];
  slackMask: string | null;
  teamsMask: string | null;
  otherMask: string | null;
}) {
  const t = copy[locale].dashboardSettings;
  return (
    <form action={saveEvidenceReportSettingsAction} className="mt-4 space-y-4">
      <p className="text-sm leading-relaxed text-ink-muted">{t.evidenceReportBody}</p>
      <div className="space-y-2" data-onboarding="email">
        <label className="flex items-start gap-2 text-sm text-ink">
          <input type="checkbox" name="email_enabled" defaultChecked={emailEnabled} className="mt-1" />
          <span>{t.evidenceReportEmail}</span>
        </label>
        {accountEmail ? (
          <p className="text-sm text-ink-muted">{t.evidenceReportEmailAccount.replace("{email}", accountEmail)}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <fieldset className="space-y-2" data-onboarding="destinations">
          <legend className="text-sm font-medium text-ink">{t.evidenceReportEmailRecipients}</legend>
          {Array.from({ length: EVIDENCE_REPORT_EMAIL_LIMIT }, (_, index) => (
            <label key={index} className="flex items-center gap-2 text-sm text-ink">
              <span className="w-5 shrink-0 text-right text-xs tabular-nums text-ink-muted">{index + 1}</span>
              <input
                type="email"
                name="email_recipient"
                defaultValue={recipientEmails[index] ?? ""}
                placeholder="name@company.com"
                autoComplete="off"
                spellCheck={false}
                inputMode="email"
                aria-label={`${t.evidenceReportEmailRecipients} ${index + 1}`}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
          ))}
        </fieldset>
        <p className="text-xs leading-relaxed text-ink-muted">{t.evidenceReportEmailRecipientsHint}</p>
      </div>
      <div data-onboarding="send">
        <PendingSubmitButton
          label={t.evidenceReportSave}
          pendingLabel={t.evidenceReportSending}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
        />
      </div>
      <details
        className="rounded-xl border border-border px-3 py-2"
        open={Boolean(slackMask || teamsMask || otherMask)}
        data-onboarding="advanced"
      >
        <summary className="cursor-pointer text-xs font-medium text-ink-muted">{t.evidenceReportAdvanced}</summary>
        <div className="mt-4 space-y-4">
          <p className="text-xs leading-relaxed text-ink-muted">{t.evidenceReportAdvancedBody}</p>
          <SecretField
            label={t.evidenceReportSlack}
            name="slack_webhook_url"
            mask={slackMask}
            placeholder="https://hooks.slack.com/services/…"
            inputType="url"
            savedLabel={t.evidenceReportSavedSecret}
            replacePlaceholder={t.evidenceReportReplace}
            clearLabel={t.evidenceReportClear}
          />
          <SecretField
            label={t.evidenceReportTeams}
            name="teams_webhook_url"
            mask={teamsMask}
            placeholder="https://outlook.office.com/webhook/…"
            inputType="url"
            savedLabel={t.evidenceReportSavedSecret}
            replacePlaceholder={t.evidenceReportReplace}
            clearLabel={t.evidenceReportClear}
          />
          <SecretField
            label={t.evidenceReportOther}
            name="other_webhook_url"
            mask={otherMask}
            placeholder="https://example.com/hooks/viewtrace"
            inputType="url"
            savedLabel={t.evidenceReportSavedSecret}
            replacePlaceholder={t.evidenceReportReplace}
            clearLabel={t.evidenceReportClear}
          />
          <p className="text-xs leading-relaxed text-ink-muted">{t.evidenceReportDestinationsHint}</p>
        </div>
      </details>
    </form>
  );
}
