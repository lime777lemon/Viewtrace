"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RegionSearchSection } from "@/components/RegionSearchSection";
import { copy, type Locale } from "@/lib/i18n";
import { LOCALE_COOKIE } from "@/lib/i18n/locale-cookie";

type Props = {
  initialLocale: Locale;
};

export function ViewtraceLanding({ initialLocale }: Props) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const t = useMemo(() => copy[locale], [locale]);
  const [roiPlan, setRoiPlan] = useState<"starter" | "pro">("starter");
  const [roiHourlyRate, setRoiHourlyRate] = useState<number>(120);
  const [roiMinutesPerCheck, setRoiMinutesPerCheck] = useState<number>(8);
  const [roiChecksPerMonth, setRoiChecksPerMonth] = useState<number>(120);
  const [roiSavingsRate, setRoiSavingsRate] = useState<number>(0.6);

  useEffect(() => {
    document.documentElement.lang = locale === "ja" ? "ja" : "en";
  }, [locale]);

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
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-md">
        <div className="mx-auto max-w-6xl space-y-3 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <a
              href="#top"
              className="font-display text-lg font-semibold tracking-tight text-[var(--color-ink)]"
            >
              Viewtrace
            </a>
            <nav className="hidden items-center gap-6 text-sm font-medium text-[var(--color-ink-muted)] lg:flex xl:gap-8">
              <a href="#pricing" className="transition hover:text-[var(--color-ink)]">
                {t.nav.pricing}
              </a>
              <a href="#region-search" className="transition hover:text-[var(--color-ink)]">
                {t.nav.regionSearch}
              </a>
              <a href="#roi" className="transition hover:text-[var(--color-ink)]">
                {t.nav.roi}
              </a>
              <a href="#faq" className="transition hover:text-[var(--color-ink)]">
                {t.nav.faq}
              </a>
              <a href="/login" className="transition hover:text-[var(--color-ink)]">
                {t.nav.login}
              </a>
            </nav>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => persistLocale("en")}
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
                  onClick={() => persistLocale("ja")}
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
              <Link
                href="/login"
                className="hidden rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-hover)] sm:inline-flex"
              >
                {t.nav.trial}
              </Link>
            </div>
          </div>
          <nav className="flex flex-wrap gap-4 text-xs font-medium text-[var(--color-ink-muted)] lg:hidden">
            <a href="#pricing" className="hover:text-[var(--color-ink)]">
              {t.nav.pricing}
            </a>
            <a href="#region-search" className="hover:text-[var(--color-ink)]">
              {t.nav.regionSearch}
            </a>
            <a href="#roi" className="hover:text-[var(--color-ink)]">
              {t.nav.roi}
            </a>
            <a href="#faq" className="hover:text-[var(--color-ink)]">
              {t.nav.faq}
            </a>
            <a href="/login" className="hover:text-[var(--color-ink)]">
              {t.nav.login}
            </a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="relative overflow-hidden border-b border-[var(--color-border)]">
          <div
            className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-[var(--color-accent-soft)] opacity-60 blur-3xl"
            aria-hidden
          />
          <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1 text-xs font-medium text-[var(--color-ink-muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
              Viewtrace
            </p>
            <h1 className="font-display max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-[var(--color-ink)] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
              {t.hero.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-[var(--color-ink-muted)]">
              {t.hero.subtitle}
            </p>
            <p className="mt-5 max-w-3xl text-base font-semibold leading-snug text-[var(--color-ink)] sm:text-lg">
              {t.hero.punch}
            </p>
            <div
              className="mt-8 grid max-w-5xl gap-4 sm:grid-cols-3"
              aria-label={locale === "ja" ? "主な価値" : "Why teams use Viewtrace"}
            >
              {t.valuePillars.map((p) => (
                <div
                  key={p.title}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 py-4 shadow-sm"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">
                    {p.title}
                  </p>
                  <p className="mt-2 text-sm font-medium leading-snug text-[var(--color-ink)]">
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
                  className="flex items-start gap-2.5 text-sm font-semibold text-[var(--color-ink)]"
                >
                  <span
                    className="mt-0.5 shrink-0 text-base leading-none text-[var(--color-accent)]"
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
                className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--color-accent-hover)]"
              >
                {t.hero.trial}
              </Link>
              <a
                href="#sample"
                className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-6 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-ink-muted)]/40"
              >
                {t.hero.sample}
              </a>
            </div>
            <p className="mt-6 max-w-2xl text-sm font-medium text-[var(--color-warn)]">
              {t.hero.disclaimer}
            </p>
          </div>
        </section>

        <RegionSearchSection locale={locale} labels={t.regionSearch} />

        <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="font-display max-w-3xl text-2xl font-semibold leading-snug text-[var(--color-ink)] sm:text-3xl">
              {t.pitch.problemTitle}
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {t.pitch.problemPoints.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"
                >
                  <h3 className="font-display text-base font-semibold text-[var(--color-ink)]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--color-border)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
                  {t.pitch.solutionTitle}
                </h2>
                <ul className="mt-6 space-y-2 text-sm font-medium text-[var(--color-ink)]">
                  {t.pitch.solutionBullets.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="text-[var(--color-accent)]" aria-hidden>
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
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3"
                    >
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">
                        {b.title}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                        {b.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div
                id="sample"
                className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-gradient-to-br from-[#dfe9e6] to-[#c8d9d3] shadow-inner"
              >
                <div className="absolute inset-0 flex flex-col p-6">
                  <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-ink-muted)]">
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
                  <p className="mt-3 text-center text-[11px] text-[var(--color-ink-muted)]">
                    {locale === "ja" ? "イメージ図（デモ）" : "Illustrative mockup"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="roi" className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">
              {t.roiSection.kicker}
            </p>
            <h2 className="mt-3 font-display max-w-3xl text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
              {t.roiSection.title}
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[var(--color-ink-muted)]">
              {t.roiSection.subtitle}
            </p>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
                <p className="text-sm font-semibold text-[var(--color-ink)]">{t.roiSection.inputsTitle}</p>

                <div className="mt-5 space-y-4 text-sm">
                  <label className="block">
                    <span className="text-[var(--color-ink-muted)]">{t.roiSection.planLabel}</span>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setRoiPlan("starter")}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          roiPlan === "starter"
                            ? "bg-[var(--color-ink)] text-white"
                            : "border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-ink)] hover:border-[var(--color-ink-muted)]/40"
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
                            ? "bg-[var(--color-ink)] text-white"
                            : "border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-ink)] hover:border-[var(--color-ink-muted)]/40"
                        }`}
                        aria-pressed={roiPlan === "pro"}
                      >
                        {t.roiSection.planPro} · $99
                      </button>
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-[var(--color-ink-muted)]">{t.roiSection.hourlyRateLabel}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={roiHourlyRate}
                      onChange={(e) => setRoiHourlyRate(Number(e.target.value))}
                      className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-[var(--color-ink)]"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[var(--color-ink-muted)]">{t.roiSection.minutesPerCheckLabel}</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={roiMinutesPerCheck}
                        onChange={(e) => setRoiMinutesPerCheck(Number(e.target.value))}
                        className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-[var(--color-ink)]"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[var(--color-ink-muted)]">{t.roiSection.checksPerMonthLabel}</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={roiChecksPerMonth}
                        onChange={(e) => setRoiChecksPerMonth(Number(e.target.value))}
                        className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-[var(--color-ink)]"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-[var(--color-ink-muted)]">
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

              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
                <p className="text-sm font-semibold text-[var(--color-ink)]">{t.roiSection.resultsTitle}</p>

                <dl className="mt-5 space-y-4 text-sm">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[var(--color-ink-muted)]">{t.roiSection.laborCostLabel}</dt>
                    <dd className="font-display text-lg font-semibold text-[var(--color-ink)]">
                      {fmtUsd(roiLaborCost)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[var(--color-ink-muted)]">{t.roiSection.savingsLabel}</dt>
                    <dd className="font-display text-lg font-semibold text-[var(--color-ink)]">
                      {fmtUsd(roiSavings)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[var(--color-ink-muted)]">{t.roiSection.netLabel}</dt>
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
                    <dt className="text-[var(--color-ink-muted)]">{t.roiSection.roiLabel}</dt>
                    <dd className="font-display text-lg font-semibold text-[var(--color-ink)]">
                      {roiPlanCost > 0 ? `${Math.round(roiRatio * 10) / 10}×` : "—"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 rounded-xl border border-[var(--color-accent)]/25 bg-[var(--color-accent-soft)]/35 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">
                    {t.roiSection.breakevenTitle}
                  </p>
                  <div className="mt-2 flex items-baseline justify-between gap-4">
                    <p className="text-sm text-[var(--color-ink-muted)]">{t.roiSection.breakevenLabel}</p>
                    <p className="font-display text-lg font-semibold text-[var(--color-ink)]">
                      {Number.isFinite(roiBreakevenChecks) ? Math.ceil(roiBreakevenChecks).toLocaleString() : "—"}
                    </p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--color-ink-muted)]">{t.roiSection.breakevenHint}</p>
                </div>

                <p className="mt-6 text-xs leading-relaxed text-[var(--color-ink-muted)]">{t.roiSection.note}</p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
              {t.howTitle}
            </h2>
            <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {t.steps.map((step, i) => (
                <li key={step.title} className="relative flex gap-4">
                  <span className="font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-display font-semibold text-[var(--color-ink)]">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-10 text-sm text-[var(--color-ink-muted)]">{t.stepNote}</p>
          </div>
        </section>

        <section id="use-cases" className="border-b border-[var(--color-border)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
              {t.useCasesTitle}
            </h2>
            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {t.useCases.map((u) => (
                <article
                  key={u.title}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6"
                >
                  <h3 className="font-display text-lg font-semibold text-[var(--color-ink)]">
                    {u.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                    {u.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--color-border)] bg-[var(--color-ink)] text-[var(--color-surface)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="font-display max-w-3xl text-2xl font-semibold sm:text-3xl">
              {t.midCta.title}
            </h2>
            <p className="mt-4 max-w-2xl text-[var(--color-surface)]/80">{t.midCta.subtitle}</p>
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[var(--color-surface)]/70">
              {t.midCta.body}
            </p>
          </div>
        </section>

        <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <h2 className="font-display text-xl font-semibold text-[var(--color-ink)] sm:text-2xl">
              {t.trustBand.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--color-ink-muted)]">
              {t.trustBand.subtitle}
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {t.trustBand.items.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-[var(--color-ink-muted)]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="pricing" className="border-b border-[var(--color-border)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
              {t.pricingTitle}
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[var(--color-ink-muted)]">
              {t.pricingSubtitle}
            </p>
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {t.plans.map((plan) => (
                <article
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl border bg-[var(--color-surface-elevated)] p-8 shadow-sm ${
                    plan.badge
                      ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/25"
                      : "border-[var(--color-border)]"
                  }`}
                >
                  {plan.badge ? (
                    <div className="absolute -top-3 right-6 flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                      <span aria-hidden>⭐</span>
                      {plan.badge}
                    </div>
                  ) : null}
                  <h3 className="font-display text-xl font-semibold text-[var(--color-ink)]">
                    {plan.name}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-[var(--color-ink)]">{plan.description}</p>
                  {"subdescription" in plan && plan.subdescription ? (
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                      {plan.subdescription}
                    </p>
                  ) : null}
                  <p className="mt-6 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-semibold text-[var(--color-ink)]">
                      {plan.price}
                    </span>
                    <span className="text-sm text-[var(--color-ink-muted)]">{plan.period}</span>
                  </p>
                  <ul className="mt-8 flex-1 space-y-3 text-sm text-[var(--color-ink-muted)]">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/checkout?plan=${plan.name === "Pro" ? "pro" : "starter"}`}
                    className={`mt-8 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${
                      plan.badge
                        ? "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]"
                        : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-ink-muted)]/40"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </article>
              ))}
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
                <h3 className="font-display text-sm font-semibold text-[var(--color-ink)]">
                  {t.pricingOverageTitle}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                  {t.pricingOverageBody}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--color-accent)]/25 bg-[var(--color-accent-soft)]/35 p-5 sm:p-6">
                <h3 className="font-display text-sm font-semibold text-[var(--color-ink)]">
                  {t.pricingTrialTitle}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                  {t.pricingTrialBody}
                </p>
              </div>
            </div>
            <div className="mt-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 sm:p-8">
              <p className="text-sm font-medium text-[var(--color-ink)]">{t.observationNote}</p>
              <p className="mt-3 text-sm text-[var(--color-ink-muted)] leading-relaxed">
                {t.observationSub}
              </p>
            </div>
          </div>
        </section>

        <section id="faq" className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
              {t.faqTitle}
            </h2>
            <div className="mt-8 space-y-3">
              {t.faqs.map((item, i) => (
                <details
                  key={item.q}
                  id={`faq-${i}`}
                  className="group scroll-mt-28 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 open:shadow-sm"
                >
                  <summary className="cursor-pointer list-none font-medium text-[var(--color-ink)] marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="flex items-start justify-between gap-3">
                      {item.q}
                      <span className="mt-0.5 text-[var(--color-ink-muted)] transition group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="signup" className="bg-[var(--color-accent-soft)]/50">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="mx-auto max-w-xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-8 shadow-sm">
              <h2 className="font-display text-xl font-semibold text-[var(--color-ink)]">
                {t.accountSignup.title}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                {t.accountSignup.intro}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/login"
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--color-accent-hover)] sm:min-w-[12rem]"
                >
                  {t.accountSignup.ctaPrimary}
                </Link>
                <Link
                  href="/login?mode=signin"
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-ink-muted)]/40 sm:min-w-[12rem]"
                >
                  {t.accountSignup.ctaSecondary}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-border)] bg-[var(--color-ink)] text-[var(--color-surface)]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
            <div>
              <p className="font-display text-lg font-semibold">Viewtrace</p>
              <p className="mt-2 max-w-sm text-sm text-[var(--color-surface)]/70">
                {t.footer.tagline}
              </p>
            </div>
            <div className="grid gap-10 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-surface)]/50">
                  {t.footer.product}
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li>
                    <a href="#pricing" className="text-[var(--color-surface)]/80 hover:text-white">
                      {t.footer.links.pricing}
                    </a>
                  </li>
                  <li>
                    <a href="#faq" className="text-[var(--color-surface)]/80 hover:text-white">
                      {t.footer.links.faq}
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-surface)]/50">
                  {t.footer.legal}
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li>
                    <a href="/terms" className="text-[var(--color-surface)]/80 hover:text-white">
                      {t.footer.links.terms}
                    </a>
                  </li>
                  <li>
                    <a href="/privacy" className="text-[var(--color-surface)]/80 hover:text-white">
                      {t.footer.links.privacy}
                    </a>
                  </li>
                  <li>
                    <a
                      href="/acceptable-use"
                      className="text-[var(--color-surface)]/80 hover:text-white"
                    >
                      {t.footer.links.acceptable}
                    </a>
                  </li>
                  <li>
                    <a href="/tokushoho" className="text-[var(--color-surface)]/80 hover:text-white">
                      {t.footer.links.tokushoho}
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-surface)]/50">
                  {t.footer.support}
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li>
                    <a href="/contact" className="text-[var(--color-surface)]/80 hover:text-white">
                      {t.footer.links.contact}
                    </a>
                  </li>
                  <li id="login">
                    <a href="/login" className="text-[var(--color-surface)]/80 hover:text-white">
                      {t.nav.login}
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <p className="mt-10 max-w-3xl text-xs leading-relaxed text-[var(--color-surface)]/55">
            {t.footer.disclaimer}
          </p>
          <p className="mt-6 text-xs text-[var(--color-surface)]/45">{t.footer.rights}</p>
        </div>
      </footer>
    </div>
  );
}
