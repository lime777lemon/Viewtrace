import Link from "next/link";
import { copy, type Locale } from "@/lib/i18n";
import { PLANS, type PlanId } from "@/lib/plans";
import { getSnapshotCapabilityCopy } from "@/lib/plans/snapshot-ui";

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
      <div className="grid gap-3 sm:grid-cols-2">
        {(["starter", "pro"] as const).map((id) => {
          const p = PLANS[id];
          const snap = getSnapshotCapabilityCopy(locale, id);
          const active = currentPlan === id;
          const href = `/checkout?plan=${id}`;
          const className = `block w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
            active
              ? "cursor-default border-accent bg-accent-soft/50 ring-2 ring-accent/25"
              : "border-border bg-surface hover:border-accent/40"
          }`;

          const body = (
            <>
              <span className="font-display font-semibold text-ink">{p.name}</span>
              {active ? (
                <span className="mt-1 block text-xs font-medium text-accent">
                  {t.currentPlanBadge}
                </span>
              ) : (
                <span className="mt-1 block text-xs text-ink-muted">
                  {t.switchToPlan}
                </span>
              )}
              <span className="mt-1 block text-xs text-ink-muted">
                {t.planCardMeta
                  .replace("{price}", p.priceLabel)
                  .replace("{limit}", String(p.monthlyObservations))
                  .replace("{days}", String(p.retentionDays))
                  .replace("{csv}", p.csvExport ? t.csvYes : t.csvNo)}
              </span>
              <span className="mt-2 block text-xs font-medium text-ink">{snap.marketing}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-ink-muted">{snap.technical}</span>
            </>
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
