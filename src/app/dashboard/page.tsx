import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ObservationsTable } from "@/components/dashboard/ObservationsTable";
import { getSession } from "@/lib/auth/session";
import { getMergedObservationsForPlan } from "@/lib/demo/user-observations";
import { getDemoUsageThisMonth } from "@/lib/demo/usage";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { getPlanLabels } from "@/lib/plans/labels";
import { getPlan, OVERAGE_PER_OBSERVATION_USD } from "@/lib/plans";

export const metadata: Metadata = {
  title: "ダッシュボード | Viewtrace",
  robots: { index: false, follow: false },
};

export default async function DashboardHomePage() {
  const locale = await getRequestLocale();
  const t = copy[locale].dashboardHome;

  const session = await getSession();
  if (!session) redirect("/login");

  const plan = getPlan(session.plan);
  const planLabels = getPlanLabels(session.plan, locale);
  const usage = await getDemoUsageThisMonth(session.plan);

  const all = await getMergedObservationsForPlan(session.plan);
  const recent = all.slice(0, 5);

  const pct = Math.min(100, (usage.used / usage.limit) * 100);

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          {t.subtitle.replace("{plan}", plan.name)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            {t.cardPlanLabel}
          </p>
          <p className="mt-2 font-display text-lg font-semibold">{plan.name}</p>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{planLabels.priceLabel}</p>
          <p className="mt-2 text-xs text-[var(--color-ink-muted)]">{planLabels.audienceLabel}</p>
          <p className="mt-3 text-xs leading-relaxed text-[var(--color-ink-muted)]">
            {planLabels.coverageLabel}
            {plan.csvExport ? " · CSV" : ""}
          </p>
          <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
            {t.cardPlanMeta
              .replace("{days}", String(plan.retentionDays))
              .replace("{limit}", String(plan.monthlyObservations))}
          </p>
          <Link
            href="/dashboard/settings"
            className="mt-4 inline-block text-xs font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
          >
            {t.cardPlanChange}
          </Link>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 sm:col-span-2 lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                {t.cardMonthlyLabel}
              </p>
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
                {usage.used}
                <span className="text-lg font-medium text-[var(--color-ink-muted)]">
                  {" "}
                  / {usage.limit}
                </span>
              </p>
            </div>
            <Link
              href="/dashboard/observations"
              className="text-sm font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
            >
              {t.cardMonthlyAll}
            </Link>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
            <div
              className="h-full rounded-full bg-[var(--color-accent)] transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
            {t.cardMonthlyOverage.replace("{price}", String(OVERAGE_PER_OBSERVATION_USD))}
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">{t.recentTitle}</h2>
          <Link
            href="/dashboard/observations/new"
            className="inline-flex rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
          >
            {t.newObservation}
          </Link>
        </div>
        <ObservationsTable rows={recent} />
      </section>

      <div className="rounded-xl border border-[var(--color-warn)]/30 bg-[var(--color-warn)]/10 p-4 text-sm text-[var(--color-ink)]">
        <p className="font-medium">{t.noticeTitle}</p>
        <p className="mt-1 text-[var(--color-ink-muted)]">
          {t.noticeBody}
        </p>
      </div>
    </div>
  );
}
