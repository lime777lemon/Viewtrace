import Image from "next/image";
import Link from "next/link";
import { ViewtraceLogo } from "@/components/brand/ViewtraceLogo";
import { LegalLocaleToggle } from "@/components/legal/LegalLocaleToggle";
import { copy, type Locale } from "@/lib/i18n";
import { getTopicSectionsForLanding, topicPagePath, type TopicSlug } from "@/lib/seo/topic-pages";

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
  locale: Locale;
  overagePerObservationUsd: number | null;
};

export function ViewtraceFeatures({ locale, overagePerObservationUsd }: Props) {
  const t = copy[locale];
  const page = t.featuresPage;
  const topicSections = getTopicSectionsForLanding(locale);
  const trustItems: string[] = [...t.trustBand.items];
  if (overagePerObservationUsd != null) {
    trustItems.splice(
      trustItems.length - 1,
      0,
      t.trustBand.overageItem.replace("{price}", formatOverageUsdLabel(overagePerObservationUsd)),
    );
  }

  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="border-b border-border bg-surface-elevated">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="inline-flex items-center transition hover:opacity-90">
              <ViewtraceLogo className="h-8 w-auto sm:h-9" />
            </Link>
            <span className="truncate text-sm font-semibold text-ink">{t.nav.features}</span>
          </div>
          <div className="flex items-center gap-3">
            <LegalLocaleToggle locale={locale} />
            <Link
              href="/"
              className="text-sm font-medium text-ink-muted transition hover:text-ink"
            >
              {t.legalShell.backToHome}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <p className="text-xs font-bold uppercase tracking-wider text-accent">
              {page.eyebrow}
            </p>
            <h1 className="mt-3 font-display max-w-3xl text-3xl font-semibold leading-snug text-ink sm:text-4xl">
              {page.h1}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-muted sm:text-base">
              {page.intro}
            </p>
            <Link
              href="/#pricing"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-accent-hover"
            >
              {page.pricingCta}
            </Link>
          </div>
        </section>

        <section id="compare" className="border-b border-border bg-surface-elevated">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <p className="text-xs font-bold uppercase tracking-wider text-accent">
              {t.competitorCompare.kicker}
            </p>
            <h2 className="mt-3 font-display max-w-3xl text-2xl font-semibold leading-snug text-ink sm:text-3xl">
              {t.competitorCompare.title}
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-muted sm:text-base">
              {t.competitorCompare.intro}
            </p>
            <div className="mt-10 overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-elevated">
                    <th scope="col" className="px-4 py-3 font-semibold text-ink sm:px-6">
                      {t.competitorCompare.colFeature}
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold text-accent sm:px-6">
                      {t.competitorCompare.colViewtrace}
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold text-ink-muted sm:px-6">
                      {t.competitorCompare.colGeneric}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {t.competitorCompare.rows.map((row) => (
                    <tr key={row.feature} className="border-b border-border last:border-0">
                      <td className="px-4 py-3.5 text-ink sm:px-6">{row.feature}</td>
                      <td className="px-4 py-3.5 text-center font-semibold text-accent sm:px-6">
                        <span aria-label={row.viewtrace ? t.competitorCompare.yes : t.competitorCompare.no}>
                          {row.viewtrace ? t.competitorCompare.yes : t.competitorCompare.no}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-semibold text-ink-muted sm:px-6">
                        <span aria-label={row.generic ? t.competitorCompare.yes : t.competitorCompare.no}>
                          {row.generic ? t.competitorCompare.yes : t.competitorCompare.no}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-ink-muted">
              {t.competitorCompare.footnote}
            </p>

            <div className="mt-10 rounded-2xl border border-border bg-surface p-6 sm:p-8">
              <h3 className="font-display text-xl font-semibold text-ink sm:text-2xl">
                {t.competitorCompare.monitorVsEvidence.title}
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-muted">
                {t.competitorCompare.monitorVsEvidence.intro}
              </p>
              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <article className="rounded-xl border border-border bg-surface-elevated p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                    {t.competitorCompare.monitorVsEvidence.monitorTitle}
                  </p>
                  <p className="mt-1 text-sm font-medium text-ink">
                    {t.competitorCompare.monitorVsEvidence.monitorExamples}
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-ink-muted">
                    {t.competitorCompare.monitorVsEvidence.monitorBullets.map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="shrink-0 text-ink-muted" aria-hidden>
                          —
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </article>
                <article className="rounded-xl border border-accent/30 bg-accent-soft/35 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-accent">
                    {t.competitorCompare.monitorVsEvidence.evidenceTitle}
                  </p>
                  <p className="mt-1 text-sm font-medium text-ink">
                    {t.competitorCompare.monitorVsEvidence.evidenceExamples}
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-ink">
                    {t.competitorCompare.monitorVsEvidence.evidenceBullets.map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="shrink-0 text-accent" aria-hidden>
                          ✓
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </div>
              <p className="mt-6 max-w-3xl text-sm leading-relaxed text-ink-muted">
                {t.competitorCompare.monitorVsEvidence.together}
              </p>
            </div>

            <div className="mt-12 border-t border-border pt-10">
              <h3 className="font-display text-xl font-semibold text-ink sm:text-2xl">
                {t.competitorCompare.integrationsTitle}
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-muted">
                {t.competitorCompare.integrationsIntro}
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {t.competitorCompare.integrationsItems.map((item) => (
                  <article
                    key={item.title}
                    className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
                  >
                    <h4 className="font-display text-base font-semibold text-ink">{item.title}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.body}</p>
                  </article>
                ))}
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

        <section id="use-cases" className="border-b border-border bg-surface-elevated">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
              {t.useCasesTitle}
            </h2>
            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {t.useCases.map((u) => (
                <article
                  key={u.title}
                  className="rounded-2xl border border-border bg-surface p-6"
                >
                  <h3 className="font-display text-lg font-semibold text-ink">{u.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-muted">{u.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="search-topics" className="border-b border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <p className="text-xs font-bold uppercase tracking-wider text-accent">
              {t.seoTopics.kicker}
            </p>
            <h2 className="mt-3 font-display max-w-3xl text-2xl font-semibold leading-snug text-ink sm:text-3xl">
              {t.seoTopics.title}
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-muted sm:text-base">
              {t.seoTopics.intro}
            </p>
            <div className="mt-10 grid gap-5 border-t border-border pt-10 sm:grid-cols-2">
              {topicSections.map(({ slug, label, h1, paragraphs }) => {
                const backdrop = TOPIC_BACKDROP_ICON[slug];
                return (
                  <Link
                    key={slug}
                    id={`topic-${slug}`}
                    href={topicPagePath(slug)}
                    className="group relative flex scroll-mt-24 flex-col overflow-hidden rounded-2xl border border-border bg-surface-elevated p-6 transition hover:border-ink-muted/40 sm:p-7"
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
                    <div className="relative flex flex-1 flex-col">
                      <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">
                        {label}
                      </p>
                      <h3 className="mt-2 font-display text-lg font-semibold leading-snug text-ink sm:text-xl">
                        {h1}
                      </h3>
                      <p className="mt-4 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-muted">
                        {paragraphs[0]}
                      </p>
                      <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-accent transition group-hover:gap-2">
                        {t.seoTopics.readMore}
                        <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </Link>
                );
              })}
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
              {trustItems.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-ink-muted">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-accent-soft/50">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login?mode=signup"
                className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-accent-hover"
              >
                {t.hero.trial}
              </Link>
              <Link
                href="/#pricing"
                className="inline-flex items-center justify-center rounded-full border border-border bg-surface px-6 py-3 text-sm font-semibold text-ink transition hover:border-ink-muted/40"
              >
                {page.pricingCta}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
