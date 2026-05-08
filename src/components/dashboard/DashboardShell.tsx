"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import type { PlanId } from "@/lib/plans";
import { LOCALE_COOKIE } from "@/lib/i18n/locale-cookie";

function isNavActive(href: string, path: string): boolean {
  if (href === "/dashboard") return path === "/dashboard";
  return path === href || path.startsWith(`${href}/`);
}

type DashboardShellProps = {
  email: string;
  planId: PlanId;
  planName: string;
  planPriceLabel: string;
  locale?: Locale;
  /** トライアル期間（14日など）が終了している */
  trialExpired?: boolean;
  /** トライアル終了予定（ISO文字列） */
  trialEndsAt?: string | null;
  /** 無料トライアル20回を使い切ったときの課金・プラン選択への誘導 */
  trialLimitReached?: boolean;
  trialObservationsUsed?: number;
  trialObservationsLimit?: number;
  children: React.ReactNode;
};

export function DashboardShell({
  email,
  planName,
  locale = "ja",
  trialExpired = false,
  trialEndsAt = null,
  trialLimitReached = false,
  trialObservationsUsed = 0,
  trialObservationsLimit = 20,
  children,
}: DashboardShellProps) {
  const currentPath = usePathname() ?? "";
  const t = copy[locale].dashboard;
  const nav = [
    { href: "/dashboard", label: t.nav.overview },
    { href: "/dashboard/region-search", label: t.nav.regionSearch },
    { href: "/dashboard/observations", label: t.nav.observations },
    { href: "/dashboard/audit", label: t.nav.auditLog },
    { href: "/dashboard/purchases", label: t.nav.purchases },
    { href: "/dashboard/settings", label: t.nav.settings },
  ] as const;

  function setLocale(next: Locale) {
    const maxAgeDays = 365;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${maxAgeDays * 24 * 60 * 60}`;
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-ink)]">
      <div className="flex min-h-screen">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-elevated)] md:flex">
          <div className="border-b border-[var(--color-border)] px-4 py-4">
            <Link href="/dashboard" className="font-display text-lg font-semibold tracking-tight">
              Viewtrace
            </Link>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-ink-muted)]">
              {t.productLabel}
            </p>
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
              {t.backToMarketing}
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
                <div className="flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-0.5 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setLocale("en")}
                    className={`rounded-full px-2.5 py-1 transition ${
                      locale === "en"
                        ? "bg-[var(--color-ink)] text-white shadow-sm"
                        : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                    }`}
                    aria-pressed={locale === "en"}
                  >
                    en
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocale("ja")}
                    className={`rounded-full px-2.5 py-1 transition ${
                      locale === "ja"
                        ? "bg-[var(--color-ink)] text-white shadow-sm"
                        : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                    }`}
                    aria-pressed={locale === "ja"}
                  >
                    ja
                  </button>
                </div>
                <span className="rounded-full bg-[var(--color-surface-elevated)] px-2.5 py-1 text-xs font-semibold text-[var(--color-ink)] ring-1 ring-[var(--color-border)]">
                  {planName}
                </span>
                <span className="hidden max-w-[200px] truncate text-sm text-[var(--color-ink-muted)] sm:inline" title={email}>
                  {email}
                </span>
                <LogoutButton label={t.logout} />
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
          {trialExpired ? (
            <div
              className="border-b border-rose-300/80 bg-rose-50 px-4 py-3 sm:px-6"
              role="status"
              aria-live="polite"
            >
              <p className="text-sm font-semibold text-rose-950">{t.trialExpiredTitle}</p>
              <p className="mt-1 text-sm leading-relaxed text-rose-900/90">
                {t.trialExpiredBody}
                {trialEndsAt ? (
                  <>
                    {" "}
                    <span className="text-rose-900/80">
                      （{t.trialExpiredEndsAtPrefix}:{" "}
                      {new Date(trialEndsAt).toLocaleString(locale === "ja" ? "ja-JP" : "en-US")})
                    </span>
                  </>
                ) : null}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/dashboard/settings"
                  className="inline-flex rounded-full bg-rose-900 px-4 py-2 text-xs font-semibold text-rose-50 hover:bg-rose-950"
                >
                  {t.trialUpsellPrimary}
                </Link>
                <Link
                  href="/checkout?plan=starter"
                  className="inline-flex rounded-full border border-rose-800/40 bg-white px-4 py-2 text-xs font-semibold text-rose-950 hover:border-rose-800"
                >
                  {t.trialUpsellStarter}
                </Link>
                <Link
                  href="/checkout?plan=pro"
                  className="inline-flex rounded-full border border-rose-800/40 bg-white px-4 py-2 text-xs font-semibold text-rose-950 hover:border-rose-800"
                >
                  {t.trialUpsellPro}
                </Link>
              </div>
            </div>
          ) : null}
          {trialLimitReached ? (
            <div
              className="border-b border-amber-300/80 bg-amber-50 px-4 py-3 sm:px-6"
              role="status"
              aria-live="polite"
            >
              <p className="text-sm font-semibold text-amber-950">
                {t.trialLimitReachedTitle.replace("{limit}", String(trialObservationsLimit))}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-amber-900/90">{t.trialLimitReachedBody}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/dashboard/settings"
                  className="inline-flex rounded-full bg-amber-900 px-4 py-2 text-xs font-semibold text-amber-50 hover:bg-amber-950"
                >
                  {t.trialUpsellPrimary}
                </Link>
                <Link
                  href="/checkout?plan=starter"
                  className="inline-flex rounded-full border border-amber-800/40 bg-white px-4 py-2 text-xs font-semibold text-amber-950 hover:border-amber-800"
                >
                  {t.trialUpsellStarter}
                </Link>
                <Link
                  href="/checkout?plan=pro"
                  className="inline-flex rounded-full border border-amber-800/40 bg-white px-4 py-2 text-xs font-semibold text-amber-950 hover:border-amber-800"
                >
                  {t.trialUpsellPro}
                </Link>
              </div>
              <p className="mt-2 text-xs text-amber-900/75">
                {t.trialUsageNote
                  .replace("{used}", String(trialObservationsUsed))
                  .replace("{limit}", String(trialObservationsLimit))}
              </p>
            </div>
          ) : null}
          <div className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
