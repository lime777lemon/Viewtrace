"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import type { PlanId } from "@/lib/plans";

const nav = [
  { href: "/dashboard", label: "概要" },
  { href: "/dashboard/region-search", label: "地域で試す" },
  { href: "/dashboard/observations", label: "オブザベーション" },
  { href: "/dashboard/settings", label: "設定" },
] as const;

function isNavActive(href: string, path: string): boolean {
  if (href === "/dashboard") return path === "/dashboard";
  return path === href || path.startsWith(`${href}/`);
}

type DashboardShellProps = {
  email: string;
  planId: PlanId;
  planName: string;
  planPriceLabel: string;
  /** 無料トライアル20回を使い切ったときの課金・プラン選択への誘導 */
  trialLimitReached?: boolean;
  trialObservationsUsed?: number;
  trialObservationsLimit?: number;
  children: React.ReactNode;
};

export function DashboardShell({
  email,
  planId,
  planName,
  planPriceLabel,
  trialLimitReached = false,
  trialObservationsUsed = 0,
  trialObservationsLimit = 20,
  children,
}: DashboardShellProps) {
  const currentPath = usePathname() ?? "";

  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-ink)]">
      <div className="flex min-h-screen">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-elevated)] md:flex">
          <div className="border-b border-[var(--color-border)] px-4 py-4">
            <Link href="/dashboard" className="font-display text-lg font-semibold tracking-tight">
              Viewtrace
            </Link>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-ink-muted)]">
              プロダクト
            </p>
            <p className="mt-2 text-xs font-semibold text-[var(--color-ink)]">
              {planName}
              <span className="block font-normal text-[var(--color-ink-muted)]">{planPriceLabel}</span>
            </p>
            {planId === "pro" ? (
              <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                Pro
              </span>
            ) : null}
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 p-3">
            {nav.map((item) => {
              const active = isNavActive(item.href, currentPath);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
                      : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-[var(--color-border)] p-3">
            <Link
              href="/"
              className="block rounded-lg px-3 py-2 text-sm text-[var(--color-ink-muted)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
            >
              マーケサイトへ
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <div className="flex min-w-0 items-center gap-3 md:hidden">
                <Link href="/dashboard" className="font-display font-semibold">
                  Viewtrace
                </Link>
              </div>
              <div className="hidden min-w-0 flex-1 md:block" aria-hidden />
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3 md:shrink-0">
                <span className="rounded-full bg-[var(--color-surface-elevated)] px-2.5 py-1 text-xs font-semibold text-[var(--color-ink)] ring-1 ring-[var(--color-border)]">
                  {planName}
                </span>
                <span className="hidden max-w-[200px] truncate text-sm text-[var(--color-ink-muted)] sm:inline" title={email}>
                  {email}
                </span>
                <LogoutButton />
              </div>
            </div>
            <nav className="flex gap-1 overflow-x-auto border-t border-[var(--color-border)] px-2 py-2 md:hidden">
              {nav.map((item) => {
                const active = isNavActive(item.href, currentPath);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                      active
                        ? "bg-[var(--color-ink)] text-white"
                        : "bg-[var(--color-surface-elevated)] text-[var(--color-ink-muted)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>
          {trialLimitReached ? (
            <div
              className="border-b border-amber-300/80 bg-amber-50 px-4 py-3 sm:px-6"
              role="status"
              aria-live="polite"
            >
              <p className="text-sm font-semibold text-amber-950">
                無料トライアルのオブザベーション {trialObservationsLimit} 回をご利用済みです
              </p>
              <p className="mt-1 text-sm leading-relaxed text-amber-900/90">
                このままでは追加の無料枠はありません。継続してオブザベーションを行うには、Starter または Pro
                へのお申し込み（課金）が必要です。クレジットカード登録はチェックアウト画面で行います。
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/dashboard/settings"
                  className="inline-flex rounded-full bg-amber-900 px-4 py-2 text-xs font-semibold text-amber-50 hover:bg-amber-950"
                >
                  プランを選んで申し込む
                </Link>
                <Link
                  href="/checkout?plan=starter"
                  className="inline-flex rounded-full border border-amber-800/40 bg-white px-4 py-2 text-xs font-semibold text-amber-950 hover:border-amber-800"
                >
                  Starter（デモ決済）
                </Link>
                <Link
                  href="/checkout?plan=pro"
                  className="inline-flex rounded-full border border-amber-800/40 bg-white px-4 py-2 text-xs font-semibold text-amber-950 hover:border-amber-800"
                >
                  Pro（デモ決済）
                </Link>
              </div>
              <p className="mt-2 text-xs text-amber-900/75">
                実行済み回数（このブラウザの記録）: {trialObservationsUsed} / {trialObservationsLimit}
              </p>
            </div>
          ) : null}
          <div className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
