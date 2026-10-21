import type { Metadata } from "next";
import Link from "next/link";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { redirect } from "next/navigation";
import { DashboardOnboardingRegionHint } from "@/components/dashboard/DashboardOnboardingRegionHint";
import { CaptureEntryForm } from "@/components/dashboard/CaptureEntryForm";
import { getSession } from "@/lib/auth/session";
import { readUserObservations } from "@/lib/demo/user-observations";
import { copy } from "@/lib/i18n";
import { countMeteredChecksThisUtcMonth, listRecentMonitoringRuns } from "@/lib/monitoring-run-store";
import { remainingObservations } from "@/lib/observation-quota";
import { getPlan } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const supabase = await createSupabaseServerClient();
  const used = await countMeteredChecksThisUtcMonth(supabase, session.userId);
  const remaining = used == null ? null : remainingObservations(used, getPlan(session.plan).monthlyObservations);
  const recent = await listRecentMonitoringRuns(supabase, session.userId);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          {labels.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{labels.dashboardIntro}</p>
        {ownCount === 0 ? <DashboardOnboardingRegionHint /> : null}
      </div>
      <CaptureEntryForm locale={locale} labels={labels} planId={session.plan} remaining={remaining} />
      {recent.length ? (
        <section>
          <h2 className="text-sm font-semibold text-ink">{locale === "ja" ? "確認" : "Checks"}</h2>
          <ul className="mt-3 space-y-2">
            {recent.map((run) => (
              <li key={run.id}>
                <Link href={`/dashboard/monitoring-runs/${run.id}`} className="text-sm text-ink underline">
                  {run.targetUrl}
                  {" · "}
                  {run.execution === "not_executed"
                    ? (locale === "ja" ? "未実行" : "Not executed")
                    : (locale === "ja" ? "実行" : "Executed")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
