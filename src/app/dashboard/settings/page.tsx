import type { Metadata } from "next";
import Link from "next/link";
import { OptionalProfileForm } from "@/components/dashboard/OptionalProfileForm";
import { PlanSwitchForms } from "@/components/dashboard/PlanSwitchForms";
import { BillingActions } from "@/components/dashboard/BillingActions";
import { getSession } from "@/lib/auth/session";
import { OVERAGE_PER_OBSERVATION_USD, TRIAL_CONFIG, getPlan } from "@/lib/plans";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { getPlanLabels, getTrialPlanUi } from "@/lib/plans/labels";
import { copy } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "設定 | Viewtrace",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const locale = await getRequestLocale();
  const t = copy[locale].dashboardSettings;
  const session = await getSession();
  const plan = session ? getPlan(session.plan) : null;
  const labels = session ? getPlanLabels(session.plan, locale) : null;
  const trialUi = getTrialPlanUi(locale);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{t.subtitle}</p>
      </div>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">{t.sectionAccount}</h2>
        <p className="mt-3 text-sm text-[var(--color-ink-muted)]">{t.emailLabel}</p>
        <p className="mt-1 font-medium text-[var(--color-ink)]">{session?.email ?? "—"}</p>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">{t.sectionProfile}</h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          {t.profileIntroPrefix}
          <span className="font-mono text-xs">company_name</span>・
          <span className="font-mono text-xs">use_case</span>
          {t.profileIntroSuffix}
        </p>
        {session ? (
          <OptionalProfileForm
            locale={locale}
            initialCompanyName={session.companyName}
            initialUseCase={session.useCase}
          />
        ) : null}
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">{t.sectionPlan}</h2>
        {plan ? (
          <>
            <p className="mt-3 font-display text-xl font-semibold text-[var(--color-ink)]">
              {session?.trialEligible ? trialUi.name : plan.name}
            </p>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              {session?.trialEligible ? trialUi.priceLabel : labels?.priceLabel ?? plan.priceLabel}
            </p>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              {session?.trialEligible ? t.trialAudience : labels?.audienceLabel ?? plan.audienceLabel}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[var(--color-ink-muted)]">
              {session?.trialEligible ? (
                <>
                  <li>
                    {t.trialObservations.replace("{limit}", String(TRIAL_CONFIG.freeObservations))}
                  </li>
                  <li>
                    {t.trialDays.replace("{days}", String(TRIAL_CONFIG.trialDays))}
                  </li>
                  <li>{labels?.coverageLabel ?? plan.coverageLabel}</li>
                  <li>{t.csvNotAvailable}</li>
                  <li>{t.snapshotsAvailable}</li>
                </>
              ) : (
                <>
                  <li>{t.planMonthlyLimit.replace("{limit}", String(plan.monthlyObservations))}</li>
                  <li>{t.planRetentionDays.replace("{days}", String(plan.retentionDays))}</li>
                  <li>{labels?.coverageLabel ?? plan.coverageLabel}</li>
                  <li>{plan.csvExport ? t.csvAvailable : t.csvProOnly}</li>
                  <li>
                    {plan.snapshotFullPage
                      ? t.snapshotFullPage
                      : t.snapshotViewport}
                  </li>
                  <li>
                    {t.overageNote.replace("{price}", String(OVERAGE_PER_OBSERVATION_USD))}
                  </li>
                </>
              )}
            </ul>
            {session && !session.trialEligible ? (
              <PlanSwitchForms currentPlan={session.plan} locale={locale} />
            ) : null}

            {session ? (
              <BillingActions
                locale={locale}
                hasCustomer={Boolean(session.stripeCustomerId)}
                hasSubscription={Boolean(session.stripeSubscriptionId)}
              />
            ) : null}
          </>
        ) : (
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">セッションを確認できません。</p>
        )}
        <p className="mt-6 text-xs text-[var(--color-ink-muted)]">
          {t.footerNote}
        </p>
      </section>
    </div>
  );
}
