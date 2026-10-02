import Link from "next/link";
import { LandingPlanDetails } from "@/components/plans/LandingPlanDetails";
import { copy, type Locale } from "@/lib/i18n";
import { type PlanId } from "@/lib/plans";
import { getLandingPlanCopy } from "@/lib/plans/landing-copy";

export function PlanSwitchForms({
  currentPlan,
  locale,
  trialEligible = false,
}: {
  currentPlan: PlanId;
  locale: Locale;
  /** 無料トライアル枠のユーザー（有料プランへの導線を必ず出す） */
  trialEligible?: boolean;
}) {
  const t = copy[locale].dashboardSettings;
  const onFreePlan = currentPlan === "freeplan";
  return (
    <div className="mt-3 space-y-4">
      {trialEligible ? (
        <p className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs text-ink-muted">
          {t.planUpgradeDuringTrial}
        </p>
      ) : onFreePlan ? (
        <p className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs text-ink-muted">
          {locale === "ja"
            ? "現在はフリープランです。下から有料プランにアップグレードできます。"
            : "You are on the free plan. Upgrade to a paid plan below."}
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {(["starter", "pro"] as const).map((id) => {
          const landingPlan = getLandingPlanCopy(locale, id);
          const active = currentPlan === id;
          const href = `/checkout?plan=${id}`;
          const className = `block w-full rounded-2xl border px-5 py-5 text-left transition ${
            active
              ? "cursor-default border-accent bg-accent-soft/40 ring-2 ring-accent/25"
              : "border-border bg-surface hover:border-accent/40"
          }`;

          const body = landingPlan ? (
            <>
              {active ? (
                <p className="mb-3 text-xs font-medium text-accent">{t.currentPlanBadge}</p>
              ) : (
                <p className="mb-3 text-xs text-ink-muted">{t.switchToPlan}</p>
              )}
              <LandingPlanDetails plan={landingPlan} />
            </>
          ) : (
            <span className="font-display font-semibold text-ink">{id}</span>
          );

          return active ? (
            <div key={id} className={className} aria-disabled="true">
              {body}
            </div>
          ) : (
            <Link key={id} href={href} className={className}>
              {body}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
