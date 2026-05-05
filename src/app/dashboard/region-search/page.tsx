import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { redirect } from "next/navigation";
import { RegionSearchPanel } from "@/components/RegionSearchPanel";
import { getSession } from "@/lib/auth/session";
import { copy } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "地域・URLで条件を組み立てる | Viewtrace",
  robots: { index: false, follow: false },
};

export default async function DashboardRegionSearchPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const locale = await getRequestLocale();
  const labels = copy[locale].regionSearch;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          {labels.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">{labels.dashboardIntro}</p>
      </div>
      <RegionSearchPanel
        locale={locale}
        labels={labels}
        mode="dashboard"
        defaultPlanId={session.plan}
        lockedPlanId={session.plan}
      />
    </div>
  );
}
