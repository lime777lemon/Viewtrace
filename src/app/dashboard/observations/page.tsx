import type { Metadata } from "next";
import Link from "next/link";
import { ObservationsCsvExport } from "@/components/dashboard/ObservationsCsvExport";
import { ObservationsTable } from "@/components/dashboard/ObservationsTable";
import { getSession } from "@/lib/auth/session";
import { getMergedObservationsForPlan, readUserObservations } from "@/lib/demo/user-observations";
import { getPlan } from "@/lib/plans";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { shouldHideNewObservationForTrial } from "@/lib/trial-observation-access";

export const metadata: Metadata = {
  title: "オブザベーション | Viewtrace",
  robots: { index: false, follow: false },
};

export default async function ObservationsListPage() {
  const locale = await getRequestLocale();
  const session = await getSession();
  const plan = session ? getPlan(session.plan) : null;
  const showCsv = plan?.csvExport ?? false;

  const planId = session?.plan ?? "starter";
  const rows = await getMergedObservationsForPlan(planId);

  const userObsForTrial = session ? await readUserObservations() : [];
  const hideNewObservationButton = session
    ? shouldHideNewObservationForTrial(session, userObsForTrial)
    : false;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">オブザベーション</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            タイムスタンプ付きの記録一覧。Web
            確認から保存したオブザベーションは新しい順に表示されます（ログイン中のアカウントに紐づくデータとして保存）。
            {plan ? ` 現在のプラン：${plan.name}。` : ""}
          </p>
          {showCsv ? (
            <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
              Pro プランでは一覧を CSV でエクスポートできます。
            </p>
          ) : (
            <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
              CSV エクスポートは Pro プランの機能です。
              <Link href="/dashboard/settings" className="ml-1 font-medium text-[var(--color-accent)]">
                設定でプランを変更
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
              新規オブザベーション
            </Link>
          )}
        </div>
      </div>

      <ObservationsTable rows={rows} locale={locale} />
    </div>
  );
}
