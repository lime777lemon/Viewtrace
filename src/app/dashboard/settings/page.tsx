import type { Metadata } from "next";
import Link from "next/link";
import { OptionalProfileForm } from "@/components/dashboard/OptionalProfileForm";
import { PlanSwitchForms } from "@/components/dashboard/PlanSwitchForms";
import { getSession } from "@/lib/auth/session";
import { OVERAGE_PER_OBSERVATION_USD, getPlan } from "@/lib/plans";

export const metadata: Metadata = {
  title: "設定 | Viewtrace",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const session = await getSession();
  const plan = session ? getPlan(session.plan) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">設定</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">アカウントとプラン。</p>
      </div>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">アカウント</h2>
        <p className="mt-3 text-sm text-[var(--color-ink-muted)]">メールアドレス</p>
        <p className="mt-1 font-medium text-[var(--color-ink)]">{session?.email ?? "—"}</p>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">プロフィール（任意）</h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          サインアップ後に入力。Supabase のユーザーメタデータ（<span className="font-mono text-xs">company_name</span>・
          <span className="font-mono text-xs">use_case</span>）に保存されます。
        </p>
        {session ? (
          <OptionalProfileForm
            initialCompanyName={session.companyName}
            initialUseCase={session.useCase}
          />
        ) : null}
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">現在のプラン</h2>
        {plan ? (
          <>
            <p className="mt-3 font-display text-xl font-semibold text-[var(--color-ink)]">{plan.name}</p>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{plan.priceLabel}</p>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{plan.audienceLabel}</p>
            <ul className="mt-4 space-y-2 text-sm text-[var(--color-ink-muted)]">
              <li>月 {plan.monthlyObservations} オブザベーションまで</li>
              <li>保存 {plan.retentionDays} 日間</li>
              <li>{plan.coverageLabel}</li>
              <li>{plan.csvExport ? "CSVエクスポート：利用可" : "CSVエクスポート：Pro で利用可"}</li>
              <li>
                {plan.snapshotFullPage
                  ? "ビジュアルスナップショット：フルページ取得（プレビュー API）"
                  : "ビジュアルスナップショット：ビューポート相当（Pro でフルページ）"}
              </li>
              <li>
                枠超過：${OVERAGE_PER_OBSERVATION_USD} / 回（本番では次回インボイスに加算・取得継続の想定。デモでは上限後も記録可）
              </li>
            </ul>
            {session ? <PlanSwitchForms currentPlan={session.plan} /> : null}
            <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <p className="text-sm font-medium text-[var(--color-ink)]">新規のお申し込み・決済（デモ）</p>
              <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                チェックアウト画面でプランを選び、テストカードで流れを確認できます。
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/checkout?plan=starter"
                  className="inline-flex rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent)]/40"
                >
                  Starter で申し込む
                </Link>
                <Link
                  href="/checkout?plan=pro"
                  className="inline-flex rounded-full bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--color-accent-hover)]"
                >
                  Pro で申し込む
                </Link>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">セッションを確認できません。</p>
        )}
        <p className="mt-6 text-xs text-[var(--color-ink-muted)]">
          本番では決済・請求ポータルと連携し、ここからアップグレード／ダウングレードを行います。
        </p>
      </section>
    </div>
  );
}
