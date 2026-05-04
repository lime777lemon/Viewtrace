import type { Metadata } from "next";
import Link from "next/link";
import { getPlan, parsePlanId } from "@/lib/plans";

export const metadata: Metadata = {
  title: "ご注文ありがとうございます | Viewtrace",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ plan?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { plan: raw } = await searchParams;
  const planId = parsePlanId(raw);
  const plan = getPlan(planId);

  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-ink)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="font-display text-lg font-semibold">
            Viewtrace
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <p className="text-sm font-medium text-[var(--color-accent)]">Demo checkout</p>
        <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight">
          デモ決済が完了しました
        </h1>
        <p className="mt-4 text-[var(--color-ink-muted)]">
          プラン <strong className="text-[var(--color-ink)]">{plan.name}</strong>（{plan.priceLabel}
          ）のお申し込みフローをシミュレートしました。実際の課金や Stripe 連携はありません。
        </p>
        <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
          本番ではこの後サブスクリプションが有効化され、ダッシュボードへリダイレクトします。
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex justify-center rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
          >
            ログインへ
          </Link>
          <Link
            href="/"
            className="inline-flex justify-center rounded-full border border-[var(--color-border)] px-6 py-3 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-ink-muted)]/40"
          >
            サイトトップへ
          </Link>
        </div>
        <p className="mt-10 text-xs text-[var(--color-ink-muted)]">
          <Link href="/tokushoho" className="text-[var(--color-accent)] underline underline-offset-2">
            特定商取引法に基づく表記
          </Link>
        </p>
      </main>
    </div>
  );
}
