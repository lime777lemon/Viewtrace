import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NewObservationForm } from "@/components/dashboard/NewObservationForm";
import { getSession } from "@/lib/auth/session";
import { getPlan } from "@/lib/plans";
import { getRegionOptions } from "@/lib/regions";

export const metadata: Metadata = {
  title: "新規オブザベーション | Viewtrace",
  robots: { index: false, follow: false },
};

export default async function NewObservationPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; region?: string; error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/observations/new");

  const plan = getPlan(session.plan);
  const regions = getRegionOptions(session.plan);
  const sp = await searchParams;
  const defaultUrl = sp.url ? decodeURIComponent(sp.url) : "";
  const defaultRegion = sp.region && regions.some((r) => r.value === sp.region) ? sp.region : undefined;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">新規オブザベーション</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Web で表示を確認した URL と地域を指定し、観測を実行して記録します。Pro
          ではプレビュー時にフルページのビジュアルスナップショット取得を試みます（Microlink）。
        </p>
        {sp.error ? (
          <p className="mt-2 text-sm font-medium text-red-700" role="alert">
            入力を確認してください（URL または地域が無効です）。
          </p>
        ) : null}
        <p className="mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-ink-muted)]">
          <span className="font-semibold text-[var(--color-ink)]">{plan.name}</span>
          {" · "}
          {plan.coverageLabel}
          {plan.allUsStates ? "（米国は全州から選択可能）" : "（米国は代表州のみ）"}
        </p>
        <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
          保持期間の目安: {plan.retentionDays} 日（{plan.name}）。
        </p>
      </div>

      <NewObservationForm regions={regions} defaultUrl={defaultUrl} defaultRegion={defaultRegion} />
    </div>
  );
}
