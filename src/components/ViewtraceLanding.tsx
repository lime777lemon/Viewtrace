"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { RegionSearchSection } from "@/components/RegionSearchSection";
import { copy, type Locale } from "@/lib/i18n";
import { LOCALE_COOKIE } from "@/lib/i18n/locale-cookie";
import { getTopicSectionsForLanding, type TopicSlug } from "@/lib/seo/topic-pages";

/** 検索意図カードの背景に薄く敷くアイコン。slug 単位で追加していく */
const TOPIC_BACKDROP_ICON: Partial<Record<TopicSlug, string>> = {
  "geo-screenshot-tool": "/marketing/icons/geo-screenshot.png",
  "website-screenshot-from-another-country": "/marketing/icons/website-screenshot.png",
  "ad-verification-tool": "/marketing/icons/ad-verification.png",
  "localized-qa": "/marketing/icons/localized-qa.png",
  "geo-testing-tool": "/marketing/icons/geo-testing.png",
  "how-to-check-website-from-another-country": "/marketing/icons/how-to-check.png",
  "landing-page-qa": "/marketing/icons/landing-page-qa.png",
  "proof-for-ad-agencies": "/marketing/icons/proof-for-ad-agencies.png",
};

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
  const topicSections = useMemo(() => getTopicSectionsForLanding(locale), [locale]);
  const landingFaqs = useMemo(() => {
    const injected = {
      q: t.faqMonthlyOverage.q,
      a:
        overagePerObservationUsd != null
          ? t.faqMonthlyOverage.aWithOverage.replace(
              "{price}",
              formatOverageUsdLabel(overagePerObservationUsd),
            )
          : t.faqMonthlyOverage.aWithoutOverage,
    };
    return [...t.faqs.slice(0, 2), injected, ...t.faqs.slice(2)];
  }, [t, overagePerObservationUsd]);
  const trustBandItems: string[] = useMemo(() => {
    const items: string[] = [...t.trustBand.items];
    if (overagePerObservationUsd != null) {
      const line = t.trustBand.overageItem.replace(
        "{price}",
        formatOverageUsdLabel(overagePerObservationUsd),
      );
      items.splice(items.length - 1, 0, line);
    }
    return items;
  }, [t, overagePerObservationUsd]);
  const [roiPlan, setRoiPlan] = useState<"starter" | "pro">("starter");
  const [roiHourlyRate, setRoiHourlyRate] = useState<number>(120);
  const [roiMinutesPerCheck, setRoiMinutesPerCheck] = useState<number>(8);
  const [roiChecksPerMonth, setRoiChecksPerMonth] = useState<number>(120);
  const [roiSavingsRate, setRoiSavingsRate] = useState<number>(0.6);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.lang = locale === "ja" ? "ja" : "en";
  }, [locale]);

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

  const roiPlanCost = roiPlan === "pro" ? 99 : 49;
  const roiLaborCost = useMemo(() => {
    const hours = (Math.max(0, roiMinutesPerCheck) * Math.max(0, roiChecksPerMonth)) / 60;
    return Math.max(0, roiHourlyRate) * hours;
  }, [roiChecksPerMonth, roiHourlyRate, roiMinutesPerCheck]);

  const roiSavings = useMemo(() => {
    const rate = Math.min(0.95, Math.max(0, roiSavingsRate));
    return roiLaborCost * rate;
  }, [roiLaborCost, roiSavingsRate]);

  const roiNet = roiSavings - roiPlanCost;
  const roiRatio = roiPlanCost > 0 ? roiNet / roiPlanCost : 0;
  const roiBreakevenChecks = useMemo(() => {
    const minutes = Math.max(0, roiMinutesPerCheck);
    const rate = Math.min(0.95, Math.max(0, roiSavingsRate));
    const hourly = Math.max(0, roiHourlyRate);
    const savedPerCheckUsd = hourly * (minutes / 60) * rate;
    if (savedPerCheckUsd <= 0) return Infinity;
    return roiPlanCost / savedPerCheckUsd;
  }, [roiHourlyRate, roiMinutesPerCheck, roiPlanCost, roiSavingsRate]);

  const fmtUsd = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Math.round(n));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <a
              href="#top"
              className="font-display text-xl font-semibold tracking-tight text-[#276248] transition hover:opacity-90"
            >
              Viewtrace
            </a>
            <nav className="hidden items-center gap-6 text-sm font-medium text-ink-muted lg:flex xl:gap-8">
              <a href="#pricing" className="transition hover:text-ink">
                {t.nav.pricing}
              </a>
              <a href="#region-search" className="transition hover:text-ink">
                {t.nav.regionSearch}
              </a>
              <a href="#roi" className="transition hover:text-ink">
                {t.nav.roi}
              </a>
              <a href="#faq" className="transition hover:text-ink">
                {t.nav.faq}
              </a>
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
                    <a
                      href="#region-search"
                      role="menuitem"
                      className="block px-4 py-2.5 text-sm font-medium text-ink-muted transition hover:bg-border/30 hover:text-ink"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      {t.nav.regionSearch}
                    </a>
                    <a
                      href="#roi"
                      role="menuitem"
                      className="block px-4 py-2.5 text-sm font-medium text-ink-muted transition hover:bg-border/30 hover:text-ink"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      {t.nav.roi}
                    </a>
                    <a
                      href="#faq"
                      role="menuitem"
                      className="block px-4 py-2.5 text-sm font-medium text-ink-muted transition hover:bg-border/30 hover:text-ink"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      {t.nav.faq}
                    </a>
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
                        href="/login"
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
                href="/login"
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
          <div className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
            <h1 className="font-display max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
              {t.hero.title}
            </h1>
            <div className="mt-5 max-w-3xl space-y-3 border-l-2 border-[#276248]/45 pl-4 sm:mt-6 sm:pl-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#276248] sm:text-xs">
                {t.hero.catchKicker}
              </p>
              <p className="font-display text-lg font-semibold leading-snug tracking-tight text-ink sm:text-xl">
                {t.hero.catchLine}
              </p>
              <p className="font-mono text-[10px] font-medium uppercase leading-relaxed tracking-[0.12em] text-ink-muted sm:text-[11px]">
                {t.hero.catchLexicon}
              </p>
            </div>
            <p className="mt-6 max-w-2xl text-lg text-ink-muted">
              {t.hero.subtitle}
            </p>
            <p className="mt-5 max-w-3xl text-base font-semibold leading-snug text-ink sm:text-lg">
              {t.hero.punch}
            </p>
            <div
              className="mt-8 grid max-w-5xl gap-4 sm:grid-cols-3"
              aria-label={locale === "ja" ? "主な価値" : "Why teams use Viewtrace"}
            >
              {t.valuePillars.map((p) => (
                <div
                  key={p.title}
                  className="rounded-2xl border border-border bg-surface-elevated px-5 py-4 shadow-sm"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-accent">
                    {p.title}
                  </p>
                  <p className="mt-2 text-sm font-medium leading-snug text-ink">
                    {p.subtitle}
                  </p>
                </div>
              ))}
            </div>
            <ul
              className="mt-8 flex max-w-3xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-10 sm:gap-y-3"
              aria-label={locale === "ja" ? "信頼補強の要点" : "Trust highlights"}
            >
              {t.heroTrust.items.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-2.5 text-sm font-semibold text-ink"
                >
                  <span
                    className="mt-0.5 shrink-0 text-base leading-none text-accent"
                    aria-hidden
                  >
                    ✓
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-accent-hover"
              >
                {t.hero.trial}
              </Link>
              <a
                href="#sample"
                className="inline-flex items-center justify-center rounded-full border border-border bg-surface-elevated px-6 py-3 text-sm font-semibold text-ink transition hover:border-ink-muted/40"
              >
                {t.hero.sample}
              </a>
            </div>
            <p className="mt-6 max-w-2xl text-sm font-medium text-warn">
              {t.hero.disclaimer}
            </p>
          </div>
        </section>

        <RegionSearchSection locale={locale} labels={t.regionSearch} />

        <section className="border-b border-border bg-surface-elevated">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="font-display max-w-3xl text-2xl font-semibold leading-snug text-ink sm:text-3xl">
              {t.pitch.problemTitle}
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
                  {t.pitch.solutionTitle}
                </h2>
                <ul className="mt-6 space-y-2 text-sm font-medium text-ink">
                  {t.pitch.solutionBullets.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="text-accent" aria-hidden>
                        ✓
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-col gap-3">
                  {t.pitch.benefits.map((b) => (
                    <div
                      key={b.title}
                      className="rounded-xl border border-border bg-surface-elevated px-4 py-3"
                    >
                      <p className="text-xs font-bold uppercase tracking-wider text-accent">
                        {b.title}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                        {b.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div
                id="sample"
                className="relative aspect-4/3 overflow-hidden rounded-2xl border border-border bg-linear-to-br from-[#dfe9e6] to-[#c8d9d3] shadow-inner"
              >
                <div className="absolute inset-0 flex flex-col p-6">
                  <div className="flex items-center gap-2 text-xs font-medium text-ink-muted">
                    <span className="h-2 w-2 rounded-full bg-emerald-600" />
                    snapshot · US-CA · 2026-05-04 14:32 UTC
                  </div>
                  <div className="mt-4 flex-1 rounded-lg bg-white/90 shadow-sm ring-1 ring-black/5">
                    <div className="flex gap-2 border-b border-black/5 px-3 py-2">
                      <span className="h-2 w-2 rounded-full bg-red-400" />
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    </div>
                    <div className="space-y-3 p-4">
                      <div className="h-3 w-3/5 max-w-[180px] rounded bg-slate-200" />
                      <div className="h-3 w-4/5 max-w-[240px] rounded bg-slate-100" />
                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <div className="h-20 rounded-lg bg-slate-100" />
                        <div className="h-20 rounded-lg bg-slate-100" />
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-center text-[11px] text-ink-muted">
                    {locale === "ja" ? "イメージ図（デモ）" : "Illustrative mockup"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="audience-benefits" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <p className="text-xs font-bold uppercase tracking-wider text-accent">
              {t.audienceBenefits.kicker}
            </p>
            <h2 className="mt-3 font-display max-w-3xl text-2xl font-semibold leading-snug text-ink sm:text-3xl">
              {t.audienceBenefits.title}
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-muted">
              {t.audienceBenefits.subtitle}
            </p>
            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {t.audienceBenefits.personas.map((persona) => (
                <article
                  key={persona.title}
                  className="relative flex flex-col rounded-2xl border border-border bg-surface p-6 shadow-sm"
                >
                  {persona.badge ? (
                    <p className="mb-3 inline-flex w-fit rounded-full border border-accent/35 bg-accent-soft/40 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-accent">
                      {persona.badge}
                    </p>
                  ) : null}
                  <h3 className="font-display text-lg font-semibold text-ink">
                    {persona.title}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-muted">
                    {persona.lead}
                  </p>
                  <ul className="mt-5 space-y-2.5 border-t border-border pt-5">
                    {persona.bullets.map((line) => (
                      <li key={line} className="flex gap-2 text-sm text-ink">
                        <span className="mt-0.5 shrink-0 text-accent" aria-hidden>
                          ✓
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <p className="mt-10 max-w-4xl text-xs leading-relaxed text-ink-muted">
              {t.audienceBenefits.marketNote}
            </p>
          </div>
        </section>

        <section id="roi" className="border-b border-border bg-surface-elevated">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <p className="text-xs font-bold uppercase tracking-wider text-accent">
              {t.roiSection.kicker}
            </p>
            <h2 className="mt-3 font-display max-w-3xl text-2xl font-semibold text-ink sm:text-3xl">
              {t.roiSection.title}
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-muted">
              {t.roiSection.subtitle}
            </p>

            <figure className="mt-8 max-w-4xl rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <figcaption className="text-xs font-bold uppercase tracking-wider text-accent">
                {t.roiSection.flowTitle}
              </figcaption>
              <div className="mt-4 flex flex-col gap-3 sm:hidden">
                <div className="rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm text-ink">
                  <span className="font-semibold text-accent">1</span>
                  <p className="mt-1 leading-snug">{t.roiSection.flowStep1}</p>
                </div>
                <p className="text-center text-lg text-ink-muted" aria-hidden>
                  ↓
                </p>
                <div className="rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm text-ink">
                  <span className="font-semibold text-accent">2</span>
                  <p className="mt-1 leading-snug">{t.roiSection.flowStep2}</p>
                </div>
                <p className="text-center text-lg text-ink-muted" aria-hidden>
                  ↓
                </p>
                <div className="rounded-xl border border-accent/30 bg-accent-soft/40 px-4 py-3 text-sm text-ink">
                  <span className="font-semibold text-accent">3</span>
                  <p className="mt-1 leading-snug">{t.roiSection.flowStep3}</p>
                </div>
              </div>
              <div className="mt-4 hidden gap-4 sm:grid sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
                <div className="rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm text-ink">
                  <span className="font-semibold text-accent">1</span>
                  <p className="mt-1 leading-snug">{t.roiSection.flowStep1}</p>
                </div>
                <div
                  className="text-2xl font-light text-ink-muted"
                  aria-hidden
                >
                  →
                </div>
                <div className="rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm text-ink">
                  <span className="font-semibold text-accent">2</span>
                  <p className="mt-1 leading-snug">{t.roiSection.flowStep2}</p>
                </div>
                <div
                  className="text-2xl font-light text-ink-muted"
                  aria-hidden
                >
                  →
                </div>
                <div className="rounded-xl border border-accent/30 bg-accent-soft/40 px-4 py-3 text-sm text-ink">
                  <span className="font-semibold text-accent">3</span>
                  <p className="mt-1 leading-snug">{t.roiSection.flowStep3}</p>
                </div>
              </div>
            </figure>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
                <p className="text-sm font-semibold text-ink">{t.roiSection.inputsTitle}</p>

                <div className="mt-5 space-y-4 text-sm">
                  <label className="block">
                    <span className="text-ink-muted">{t.roiSection.planLabel}</span>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setRoiPlan("starter")}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          roiPlan === "starter"
                            ? "bg-ink text-white"
                            : "border border-border bg-surface-elevated text-ink hover:border-ink-muted/40"
                        }`}
                        aria-pressed={roiPlan === "starter"}
                      >
                        {t.roiSection.planStarter} · $49
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoiPlan("pro")}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          roiPlan === "pro"
                            ? "bg-ink text-white"
                            : "border border-border bg-surface-elevated text-ink hover:border-ink-muted/40"
                        }`}
                        aria-pressed={roiPlan === "pro"}
                      >
                        {t.roiSection.planPro} · $99
                      </button>
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-ink-muted">{t.roiSection.hourlyRateLabel}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={roiHourlyRate}
                      onChange={(e) => setRoiHourlyRate(Number(e.target.value))}
                      className="mt-2 w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-ink"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-ink-muted">{t.roiSection.minutesPerCheckLabel}</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={roiMinutesPerCheck}
                        onChange={(e) => setRoiMinutesPerCheck(Number(e.target.value))}
                        className="mt-2 w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-ink"
                      />
                    </label>
                    <label className="block">
                      <span className="text-ink-muted">{t.roiSection.checksPerMonthLabel}</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={roiChecksPerMonth}
                        onChange={(e) => setRoiChecksPerMonth(Number(e.target.value))}
                        className="mt-2 w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-ink"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-ink-muted">
                      {t.roiSection.savingsRateLabel} ({Math.round(roiSavingsRate * 100)}%)
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={0.9}
                      step={0.05}
                      value={roiSavingsRate}
                      onChange={(e) => setRoiSavingsRate(Number(e.target.value))}
                      className="mt-3 w-full"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
                <p className="text-sm font-semibold text-ink">{t.roiSection.resultsTitle}</p>

                <dl className="mt-5 space-y-4 text-sm">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-ink-muted">{t.roiSection.laborCostLabel}</dt>
                    <dd className="font-display text-lg font-semibold text-ink">
                      {fmtUsd(roiLaborCost)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-ink-muted">{t.roiSection.savingsLabel}</dt>
                    <dd className="font-display text-lg font-semibold text-ink">
                      {fmtUsd(roiSavings)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-ink-muted">{t.roiSection.netLabel}</dt>
                    <dd
                      className={`font-display text-xl font-semibold ${
                        roiNet >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
                      }`}
                    >
                      {roiNet >= 0 ? "+" : "−"}
                      {fmtUsd(Math.abs(roiNet))}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-ink-muted">{t.roiSection.roiLabel}</dt>
                    <dd className="font-display text-lg font-semibold text-ink">
                      {roiPlanCost > 0 ? `${Math.round(roiRatio * 10) / 10}×` : "—"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 rounded-xl border border-accent/25 bg-accent-soft/35 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-accent">
                    {t.roiSection.breakevenTitle}
                  </p>
                  <div className="mt-2 flex items-baseline justify-between gap-4">
                    <p className="text-sm text-ink-muted">{t.roiSection.breakevenLabel}</p>
                    <p className="font-display text-lg font-semibold text-ink">
                      {Number.isFinite(roiBreakevenChecks) ? Math.ceil(roiBreakevenChecks).toLocaleString() : "—"}
                    </p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-ink-muted">{t.roiSection.breakevenHint}</p>
                </div>

                <p className="mt-6 text-xs leading-relaxed text-ink-muted">{t.roiSection.note}</p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="border-b border-border bg-surface-elevated"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
              {t.howTitle}
            </h2>
            <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {t.steps.map((step, i) => (
                <li key={step.title} className="relative flex gap-4">
                  <span className="font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-display font-semibold text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-10 text-sm text-ink-muted">{t.stepNote}</p>
          </div>
        </section>

        <section id="use-cases" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
              {t.useCasesTitle}
            </h2>
            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {t.useCases.map((u) => (
                <article
                  key={u.title}
                  className="rounded-2xl border border-border bg-surface-elevated p-6"
                >
                  <h3 className="font-display text-lg font-semibold text-ink">
                    {u.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                    {u.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="search-topics" className="border-b border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <p className="text-xs font-bold uppercase tracking-wider text-accent">{t.seoTopics.kicker}</p>
            <h2 className="mt-3 font-display max-w-3xl text-2xl font-semibold leading-snug text-ink sm:text-3xl">
              {t.seoTopics.title}
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-muted sm:text-base">
              {t.seoTopics.intro}
            </p>
            <div className="mt-10 space-y-16 border-t border-border pt-10">
              {topicSections.map(({ slug, label, h1, paragraphs }) => {
                const backdrop = TOPIC_BACKDROP_ICON[slug];
                return (
                  <article
                    key={slug}
                    id={`topic-${slug}`}
                    className="relative scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-surface-elevated p-6 sm:p-8"
                  >
                    {backdrop ? (
                      <Image
                        src={backdrop}
                        alt=""
                        aria-hidden="true"
                        width={800}
                        height={800}
                        priority={false}
                        className="pointer-events-none absolute -right-12 -bottom-16 h-88 w-88 select-none object-contain opacity-[0.08] sm:-right-16 sm:-bottom-20 sm:h-112 sm:w-md"
                      />
                    ) : null}
                    <div className="relative">
                      <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">{label}</p>
                      <h3 className="mt-2 font-display text-xl font-semibold leading-snug text-ink sm:text-2xl">
                        {h1}
                      </h3>
                      <div className="mt-5 space-y-4 text-sm leading-relaxed text-ink-muted sm:text-base">
                        {paragraphs.map((p, i) => (
                          <p key={i}>{p}</p>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="mt-12 flex flex-wrap gap-3 border-t border-border pt-10">
              <Link
                href="/#top"
                className="inline-flex items-center justify-center rounded-full border border-border bg-surface px-6 py-3 text-sm font-semibold text-ink transition hover:border-ink-muted/40"
              >
                {t.seoTopics.backLabel}
              </Link>
              <Link
                href="/login?mode=signin"
                className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-accent-hover"
              >
                {t.seoTopics.ctaLogin}
              </Link>
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-ink text-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="font-display max-w-3xl text-2xl font-semibold sm:text-3xl">
              {t.midCta.title}
            </h2>
            <p className="mt-4 max-w-2xl text-surface/80">{t.midCta.subtitle}</p>
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-surface/70">
              {t.midCta.body}
            </p>
          </div>
        </section>

        <section className="border-b border-border bg-surface-elevated">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">
              {t.trustBand.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-muted">
              {t.trustBand.subtitle}
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {trustBandItems.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-ink-muted">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
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

        <section id="faq" className="border-b border-border bg-surface-elevated">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
              {t.faqTitle}
            </h2>
            <div className="mt-8 space-y-3">
              {landingFaqs.map((item, i) => (
                <details
                  key={item.q}
                  id={`faq-${i}`}
                  className="group scroll-mt-28 rounded-2xl border border-border bg-surface px-5 py-4 open:shadow-sm"
                >
                  <summary className="cursor-pointer list-none font-medium text-ink marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="flex items-start justify-between gap-3">
                      {item.q}
                      <span className="mt-0.5 text-ink-muted transition group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="signup" className="bg-accent-soft/50">
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
                  href="/login"
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-accent-hover sm:min-w-48"
                >
                  {t.accountSignup.ctaPrimary}
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
      </main>

      <footer className="border-t border-border bg-ink text-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
            <div>
              <p className="font-display text-2xl font-semibold tracking-tight text-[#276248]">Viewtrace</p>
              <p className="mt-2 max-w-sm text-sm text-surface/70">
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
                    <a href="#faq" className="text-surface/80 hover:text-white">
                      {t.footer.links.faq}
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
