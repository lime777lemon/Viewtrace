import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { redirect } from "next/navigation";
import { DashboardOnboardingRegionHint } from "@/components/dashboard/DashboardOnboardingRegionHint";
import { DashboardRegionSearchForm } from "@/components/DashboardRegionSearchForm";
import { getSession } from "@/lib/auth/session";
import { readUserObservations } from "@/lib/demo/user-observations";
import { copy } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "地域・URLで条件を組み立てる",
  robots: { index: false, follow: false },
};

export default async function DashboardRegionSearchPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const locale = await getRequestLocale();
  const labels = copy[locale].regionSearch;
  const ownCount = (await readUserObservations()).length;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          {labels.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{labels.dashboardIntro}</p>
        {ownCount === 0 ? <DashboardOnboardingRegionHint /> : null}
      </div>
      <DashboardRegionSearchForm locale={locale} labels={labels} planId={session.plan} />
    </div>
  );
}
