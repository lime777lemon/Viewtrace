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
  const csvLabels = copy[locale].observationsCsvExport;
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
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t.title}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-muted">
            {t.subtitle}
            {plan ? t.planSuffix.replace("{plan}", plan.name) : ""}
          </p>
          {!showCsv ? (
            <p className="mt-2 text-xs text-ink-muted">
              {t.csvUpgradeHint}{" "}
              <Link href="/dashboard/settings" className="font-medium text-accent">
                {t.csvUpgradeLink}
              </Link>
            </p>
          ) : null}
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-stretch sm:justify-end">
          {showCsv ? (
            <ObservationsCsvExport
              exportButton={csvLabels.exportButton}
              downloadAction={csvLabels.downloadAction}
              pendingLabel={csvLabels.pending}
              auditCheckbox={csvLabels.auditCheckbox}
              auditHint={csvLabels.auditHint}
              modeStandard={csvLabels.modeStandard}
              modeAudit={csvLabels.modeAudit}
            />
          ) : null}
          {hideNewObservationButton ? null : (
            <Link
              href="/dashboard/observations/new"
              className="inline-flex h-11 shrink-0 items-center justify-center self-stretch rounded-full bg-accent px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover sm:self-center"
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
