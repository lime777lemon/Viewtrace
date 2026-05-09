import Link from "next/link";
import { copy, type Locale } from "@/lib/i18n";
import { PLANS, type PlanId } from "@/lib/plans";

export function PlanSwitchForms({
  currentPlan,
  locale,
}: {
  currentPlan: PlanId;
  locale: Locale;
}) {
  const t = copy[locale].dashboardSettings;
  const onFreePlan = currentPlan === "freeplan";
  return (
    <div className="mt-6 space-y-4">
      {onFreePlan ? (
        <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-ink-muted)]">
          {locale === "ja"
            ? "現在はフリープランです。下から有料プランにアップグレードできます。"
            : "You are on the free plan. Upgrade to a paid plan below."}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {(["starter", "pro"] as const).map((id) => {
          const p = PLANS[id];
          const active = currentPlan === id;
          const href = `/checkout?plan=${id}`;
          const className = `block w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
            active
              ? "cursor-default border-[var(--color-accent)] bg-[var(--color-accent-soft)]/50 ring-2 ring-[var(--color-accent)]/25"
              : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]/40"
          }`;

          const body = (
            <>
              <span className="font-display font-semibold text-[var(--color-ink)]">{p.name}</span>
              {active ? (
                <span className="mt-1 block text-xs font-medium text-[var(--color-accent)]">
                  {t.currentPlanBadge}
                </span>
              ) : (
                <span className="mt-1 block text-xs text-[var(--color-ink-muted)]">
                  {t.switchToPlan}
                </span>
              )}
              <span className="mt-1 block text-xs text-[var(--color-ink-muted)]">
                {t.planCardMeta
                  .replace("{price}", p.priceLabel)
                  .replace("{limit}", String(p.monthlyObservations))
                  .replace("{days}", String(p.retentionDays))
                  .replace("{csv}", p.csvExport ? t.csvYes : t.csvNo)}
              </span>
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
