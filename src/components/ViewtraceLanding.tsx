"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ViewtraceLogo } from "@/components/brand/ViewtraceLogo";
import { copy, type Locale } from "@/lib/i18n";
import { LOCALE_COOKIE } from "@/lib/i18n/locale-cookie";
import { audiencePagePath } from "@/lib/seo/audience-pages";

function formatOverageUsdLabel(usd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: usd % 1 === 0 ? 0 : 2,
  }).format(usd);
}

type Props = {
  initialLocale: Locale;
  overagePerObservationUsd: number | null;
};

export function ViewtraceLanding({ initialLocale, overagePerObservationUsd }: Props) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const t = useMemo(() => copy[locale], [locale]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.lang = locale === "ja" ? "ja" : "en";
  }, [locale]);

  // 静的配信のため初期ロケールは常に en。マウント直後に cookie を読み、
  // 日本語を選んだリピーターだけクライアント側で切り替える。
  useEffect(() => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`));
    const value = match ? decodeURIComponent(match[1]) : null;
    if (value === "ja" || value === "en") {
      setLocale((prev) => (prev === value ? prev : value));
    }
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    function handlePointerDown(event: PointerEvent) {
      const el = mobileNavRef.current;
      if (el && !el.contains(event.target as Node)) {
        setMobileNavOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileNavOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileNavOpen]);

  function persistLocale(next: Locale) {
    const maxAgeDays = 365;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${maxAgeDays * 24 * 60 * 60}`;
    setLocale(next);
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <a href="#top" className="inline-flex items-center transition hover:opacity-90">
              <ViewtraceLogo className="h-8 w-auto sm:h-9" />
            </a>
            <nav className="hidden items-center gap-6 text-sm font-medium text-ink-muted lg:flex xl:gap-8">
              <a href="#pricing" className="transition hover:text-ink">
                {t.nav.pricing}
              </a>
              <Link href="/features" className="transition hover:text-ink">
                {t.nav.features}
              </Link>
              <Link href="/contact" className="transition hover:text-ink">
                {t.nav.contact}
              </Link>
              <a href="/login?mode=signin" className="transition hover:text-ink">
                {t.nav.login}
              </a>
            </nav>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative lg:hidden" ref={mobileNavRef}>
                <button
                  type="button"
                  id="landing-mobile-nav-trigger"
                  aria-expanded={mobileNavOpen}
                  aria-controls="landing-mobile-nav-panel"
                  aria-haspopup="true"
                  onClick={() => setMobileNavOpen((open) => !open)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-sm font-medium text-ink transition hover:border-ink-muted/40 hover:bg-border/20"
                >
                  {t.nav.menu}
                  <svg
                    className={`h-4 w-4 shrink-0 text-ink-muted transition ${mobileNavOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                {mobileNavOpen ? (
                  <div
                    id="landing-mobile-nav-panel"
                    role="menu"
                    aria-labelledby="landing-mobile-nav-trigger"
                    className="absolute right-0 z-50 mt-2 min-w-48 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg"
                  >
                    <a
                      href="#pricing"
                      role="menuitem"
                      className="block px-4 py-2.5 text-sm font-medium text-ink-muted transition hover:bg-border/30 hover:text-ink"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      {t.nav.pricing}
                    </a>
                    <Link
                      href="/features"
                      role="menuitem"
                      className="block px-4 py-2.5 text-sm font-medium text-ink-muted transition hover:bg-border/30 hover:text-ink"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      {t.nav.features}
                    </Link>
                    <Link
                      href="/contact"
                      role="menuitem"
                      className="block px-4 py-2.5 text-sm font-medium text-ink-muted transition hover:bg-border/30 hover:text-ink"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      {t.nav.contact}
                    </Link>
                    <a
                      href="/login?mode=signin"
                      role="menuitem"
                      className="block px-4 py-2.5 text-sm font-medium text-ink-muted transition hover:bg-border/30 hover:text-ink"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      {t.nav.login}
                    </a>
                    <div className="border-t border-border p-2 sm:hidden">
                      <Link
                        href="/login?mode=signup"
                        role="menuitem"
                        className="flex w-full items-center justify-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover"
                        onClick={() => setMobileNavOpen(false)}
                      >
                        {t.nav.trial}
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="flex rounded-full border border-border bg-surface-elevated p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => persistLocale("en")}
                  className={`cursor-pointer rounded-full px-2.5 py-1 transition ${
                    locale === "en"
                      ? "bg-ink text-white shadow-sm hover:bg-ink/90 hover:shadow"
                      : "text-ink-muted hover:bg-border/45 hover:text-ink"
                  }`}
                  aria-pressed={locale === "en"}
                >
                  en
                </button>
                <button
                  type="button"
                  onClick={() => persistLocale("ja")}
                  className={`cursor-pointer rounded-full px-2.5 py-1 transition ${
                    locale === "ja"
                      ? "bg-ink text-white shadow-sm hover:bg-ink/90 hover:shadow"
                      : "text-ink-muted hover:bg-border/45 hover:text-ink"
                  }`}
                  aria-pressed={locale === "ja"}
                >
                  ja
                </button>
              </div>
              <Link
                href="/login?mode=signup"
                className="hidden rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover sm:inline-flex"
              >
                {t.nav.trial}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="relative overflow-hidden border-b border-border">
          <div
            className="pointer-events-none absolute inset-0 z-0 bg-[url('/marketing/auto-email-no-bg.png')] bg-size-[min(400px,58vw)] bg-position-[right_-4%_center] bg-no-repeat opacity-60 sm:bg-size-[min(440px,46vw)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-24 top-0 z-0 h-96 w-96 rounded-full bg-accent-soft opacity-60 blur-3xl"
            aria-hidden
          />
          <div className="relative z-10 mx-auto max-w-6xl px-4 pb-14 pt-14 sm:px-6 sm:pb-16 sm:pt-20">
            {t.hero.catchKicker ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#276248] sm:text-xs">
                {t.hero.catchKicker}
              </p>
            ) : null}
            <h1 className="font-display max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
              {t.hero.title}
            </h1>
            {t.hero.catchLine ? (
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink sm:text-xl">
                {t.hero.catchLine}
              </p>
            ) : null}
            {t.hero.subtitle ? (
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
                {t.hero.subtitle}
              </p>
            ) : null}
            <div className="mt-8">
              <Link
                href="/login?mode=signup"
                className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-accent-hover"
              >
                {t.hero.trial}
              </Link>
            </div>
            <p className="mt-5 max-w-2xl text-sm text-ink-muted">
              {t.hero.disclaimer}
            </p>
          </div>
        </section>

        <section className="border-b border-border bg-surface-elevated">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
            <h2 className="font-display max-w-3xl text-2xl font-semibold leading-snug text-ink sm:text-3xl">
              {t.pitch.problemTitle}
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {t.pitch.problemPoints.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
                >
                  <h3 className="font-display text-base font-semibold text-ink">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="compare" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
            <h2 className="font-display max-w-3xl text-2xl font-semibold text-ink sm:text-3xl">
              {t.compare.title}
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-muted sm:text-base">
              {t.compare.body}
            </p>
            <div className="mt-8 overflow-hidden rounded-xl border border-border bg-surface-elevated">
              <div className="overflow-x-auto">
                <table className="w-full min-w-160 text-left text-sm">
                  <thead className="border-b border-border bg-surface text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="px-4 py-3">{t.observationsTable.colCaptured}</th>
                      <th className="px-4 py-3">{t.observationsTable.colUrl}</th>
                      <th className="px-4 py-3">{t.observationsTable.colRegion}</th>
                      <th className="px-4 py-3">{t.observationsTable.colStatus}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {t.compare.rows.map((row) => (
                      <tr key={row.region}>
                        <td className="px-4 py-3 align-top text-ink-muted">
                          <span className="text-ink">{row.captured}</span>
                          <span className="mt-0.5 block text-[11px] text-ink-muted">
                            {row.utc}
                          </span>
                        </td>
                        <td className="max-w-55 truncate px-4 py-3 align-top font-mono text-xs text-ink">
                          {t.compare.url}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 align-top text-ink">
                          {row.region}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900">
                            {t.observationDetail.statusSuccess}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-muted">{t.compare.caption}</p>
          </div>
        </section>

        <section id="signup" className="border-b border-border bg-accent-soft/50">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="mx-auto max-w-xl rounded-2xl border border-border bg-surface-elevated p-8 shadow-sm">
              <h2 className="font-display text-xl font-semibold text-ink">
                {t.accountSignup.title}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-muted">
                {t.accountSignup.intro}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/login?mode=signup"
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-accent-hover sm:min-w-48"
                >
                  {t.hero.trial}
                </Link>
                <Link
                  href="/login?mode=signin"
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-border bg-surface px-6 py-3 text-sm font-semibold text-ink transition hover:border-ink-muted/40 sm:min-w-48"
                >
                  {t.accountSignup.ctaSecondary}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
              {t.pricingTitle}
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-muted">
              {t.pricingSubtitle}
            </p>
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {t.plans.map((plan) => (
                <article
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl border bg-surface-elevated p-8 shadow-sm ${
                    plan.badge
                      ? "border-accent ring-2 ring-accent/25"
                      : "border-border"
                  }`}
                >
                  {plan.badge ? (
                    <div className="absolute -top-3 right-6 flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                      <span aria-hidden>⭐</span>
                      {plan.badge}
                    </div>
                  ) : null}
                  <h3 className="font-display text-xl font-semibold text-ink">
                    {plan.name}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-ink">{plan.description}</p>
                  {"subdescription" in plan && plan.subdescription ? (
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                      {plan.subdescription}
                    </p>
                  ) : null}
                  <p className="mt-6 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-semibold text-ink">
                      {plan.price}
                    </span>
                    <span className="text-sm text-ink-muted">{plan.period}</span>
                  </p>
                  {"usageExample" in plan && plan.usageExample ? (
                    <p className="mt-4 rounded-xl border border-accent/25 bg-accent-soft/40 px-4 py-3 text-sm font-medium leading-relaxed text-ink">
                      {plan.usageExample}
                    </p>
                  ) : null}
                  <ul className="mt-8 flex-1 space-y-3 text-sm text-ink-muted">
                    {[
                      ...plan.features,
                      ...(overagePerObservationUsd != null
                        ? [
                            t.planFeatureOverage.replace(
                              "{price}",
                              formatOverageUsdLabel(overagePerObservationUsd),
                            ),
                          ]
                        : []),
                    ].map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/checkout?plan=${plan.name === "Pro" ? "pro" : "starter"}`}
                    className={`mt-8 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${
                      plan.badge
                        ? "bg-accent text-white hover:bg-accent-hover"
                        : "border border-border bg-surface text-ink hover:border-ink-muted/40"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </article>
              ))}
            </div>
            <div
              className={`mt-10 grid gap-4 ${overagePerObservationUsd != null ? "sm:grid-cols-2" : ""}`}
            >
              {overagePerObservationUsd != null ? (
                <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
                  <h3 className="font-display text-sm font-semibold text-ink">
                    {t.pricingOverageTitle}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {t.pricingOverageBody.replace(
                      "{price}",
                      formatOverageUsdLabel(overagePerObservationUsd),
                    )}
                  </p>
                </div>
              ) : null}
              <div className="rounded-2xl border border-accent/25 bg-accent-soft/35 p-5 sm:p-6">
                <h3 className="font-display text-sm font-semibold text-ink">
                  {t.pricingTrialTitle}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {t.pricingTrialBody}
                </p>
              </div>
            </div>
            <div className="mt-12 rounded-2xl border border-border bg-surface-elevated p-6 sm:p-8">
              <p className="text-sm font-medium text-ink">{t.observationNote}</p>
              <p className="mt-3 text-sm text-ink-muted leading-relaxed">
                {t.observationSub}
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-ink text-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
            <div>
              <ViewtraceLogo className="h-9 w-auto sm:h-10" onDark priority={false} />
              <p className="mt-3 max-w-sm text-sm text-surface/70">
                {t.footer.tagline}
              </p>
            </div>
            <div className="grid gap-10 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-surface/50">
                  {t.footer.product}
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li>
                    <a href="#pricing" className="text-surface/80 hover:text-white">
                      {t.footer.links.pricing}
                    </a>
                  </li>
                  <li>
                    <a href="/features" className="text-surface/80 hover:text-white">
                      {t.footer.links.features}
                    </a>
                  </li>
                  <li>
                    <a
                      href={audiencePagePath("agency")}
                      className="text-surface/80 hover:text-white"
                    >
                      {locale === "ja" ? "広告・マーケ代理店向け" : "For ad agencies"}
                    </a>
                  </li>
                  <li>
                    <a
                      href={audiencePagePath("performance-agency")}
                      className="text-surface/80 hover:text-white"
                    >
                      {locale === "ja" ? "運用型代理店向け" : "For performance agencies"}
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-surface/50">
                  {t.footer.legal}
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li>
                    <a href="/terms" className="text-surface/80 hover:text-white">
                      {t.footer.links.terms}
                    </a>
                  </li>
                  <li>
                    <a href="/privacy" className="text-surface/80 hover:text-white">
                      {t.footer.links.privacy}
                    </a>
                  </li>
                  <li>
                    <a
                      href="/acceptable-use"
                      className="text-surface/80 hover:text-white"
                    >
                      {t.footer.links.acceptable}
                    </a>
                  </li>
                  <li>
                    <a href="/tokushoho" className="text-surface/80 hover:text-white">
                      {t.footer.links.tokushoho}
                    </a>
                  </li>
                  <li>
                    <a href="/about" className="text-surface/80 hover:text-white">
                      {t.footer.links.about}
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-surface/50">
                  {t.footer.support}
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li>
                    <a href="/contact" className="text-surface/80 hover:text-white">
                      {t.footer.links.contact}
                    </a>
                  </li>
                  <li id="login">
                    <a href="/login?mode=signin" className="text-surface/80 hover:text-white">
                      {t.nav.login}
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <p className="mt-10 max-w-3xl text-xs leading-relaxed text-surface/55">
            {t.footer.disclaimer}
          </p>
          <p className="mt-6 text-xs text-surface/45">{t.footer.rights}</p>
        </div>
      </footer>
    </div>
  );
}
