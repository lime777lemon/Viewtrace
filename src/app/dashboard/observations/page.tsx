import type { Metadata } from "next";
import Link from "next/link";
import { ObservationsCsvExport } from "@/components/dashboard/ObservationsCsvExport";
import { ObservationsTable } from "@/components/dashboard/ObservationsTable";
import { getSession } from "@/lib/auth/session";
import { getMergedObservationsForPlan, readUserObservations } from "@/lib/demo/user-observations";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { getPlan } from "@/lib/plans";
import { shouldHideNewObservationForTrial } from "@/lib/trial-observation-access";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: copy[locale].observationsListPage.metaTitle,
    robots: { index: false, follow: false },
  };
}

export default async function ObservationsListPage() {
  const locale = await getRequestLocale();
  const t = copy[locale].observationsListPage;
  const session = await getSession();
  const plan = session ? getPlan(session.plan) : null;
  const showCsv = plan?.csvExport ?? false;

  const planId = session?.plan ?? "freeplan";
  const rows = await getMergedObservationsForPlan(planId);

  const userObsForTrial = session ? await readUserObservations() : [];
  const hideNewObservationButton = session
    ? shouldHideNewObservationForTrial(session, userObsForTrial)
    : false;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t.title}</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            {t.subtitle}
            {plan ? t.planSuffix.replace("{plan}", plan.name) : ""}
          </p>
          {showCsv ? (
            <p className="mt-2 text-xs text-[var(--color-ink-muted)]">{t.csvProHint}</p>
          ) : (
            <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
              {t.csvUpgradeHint}{" "}
              <Link href="/dashboard/settings" className="font-medium text-[var(--color-accent)]">
                {t.csvUpgradeLink}
              </Link>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showCsv ? <ObservationsCsvExport /> : null}
          {hideNewObservationButton ? null : (
            <Link
              href="/dashboard/observations/new"
              className="inline-flex shrink-0 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
            >
              {t.newObservation}
            </Link>
          )}
        </div>
      </div>

      <ObservationsTable rows={rows} locale={locale} />
    </div>
  );
}
