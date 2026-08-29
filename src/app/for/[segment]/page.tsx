import { access } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewtraceLogo } from "@/components/brand/ViewtraceLogo";
import { LegalLocaleToggle } from "@/components/legal/LegalLocaleToggle";
import { copy, type Locale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import {
  AUDIENCE_PAGE_UI,
  AUDIENCE_SLUGS,
  audiencePagePath,
  getAudienceLinkLabels,
  getAudiencePageCopy,
  isAudienceSlug,
  type AudienceSlug,
} from "@/lib/seo/audience-pages";
import { getHowItWorks } from "@/lib/seo/topic-pages";
import { siteOrigin } from "@/lib/site";

/** ダッシュボードのスクリーンショット（ロケール別）。en 用が無ければ ja 版へフォールバック */
type Screenshot = { src: string; width: number; height: number };
const SCREENSHOT_JA: Screenshot = {
  src: "/marketing/screenshots/dashboard-overview.png",
  width: 1024,
  height: 549,
};
const SCREENSHOT_EN: Screenshot = {
  src: "/marketing/screenshots/dashboard-overview-en.png",
  width: 1024,
  height: 562,
};

async function resolveDashboardScreenshot(locale: Locale): Promise<Screenshot> {
  if (locale !== "en") return SCREENSHOT_JA;
  try {
    await access(join(process.cwd(), "public", SCREENSHOT_EN.src));
    return SCREENSHOT_EN;
  } catch {
    return SCREENSHOT_JA;
  }
}

export const dynamicParams = false;

export function generateStaticParams(): { segment: AudienceSlug }[] {
  return AUDIENCE_SLUGS.map((segment) => ({ segment }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ segment: string }>;
}): Promise<Metadata> {
  const { segment } = await params;
  if (!isAudienceSlug(segment)) return {};

  const locale = await getRequestLocale();
  const c = getAudiencePageCopy(locale, segment);
  const canonical = audiencePagePath(segment);

  return {
    // metaTitle は既に "… | Viewtrace" を含むため、ルートの title テンプレートを回避
    title: { absolute: c.metaTitle },
    description: c.metaDescription,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      url: canonical,
      title: c.metaTitle,
      description: c.metaDescription,
    },
    twitter: {
      card: "summary_large_image",
      title: c.metaTitle,
      description: c.metaDescription,
    },
  };
}

export default async function AudiencePage({
  params,
}: {
  params: Promise<{ segment: string }>;
}) {
  const { segment } = await params;
  if (!isAudienceSlug(segment)) notFound();

  const locale = await getRequestLocale();
  const c = getAudiencePageCopy(locale, segment);
  const ui = AUDIENCE_PAGE_UI[locale];
  const shell = copy[locale].legalShell;
  const howItWorks = getHowItWorks(locale);
  const related = getAudienceLinkLabels(locale).filter((a) => a.slug !== segment);
  const dashboardScreenshot = await resolveDashboardScreenshot(locale);

  const base = siteOrigin.replace(/\/$/, "");
  const canonicalUrl = `${base}${audiencePagePath(segment)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "Viewtrace",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: `${base}/`,
        description: c.summary,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      {
        "@type": "Service",
        name: c.metaTitle.replace(/\s*\|\s*Viewtrace\s*$/, ""),
        serviceType: "Geo ad verification",
        provider: { "@type": "Organization", name: "Viewtrace", url: `${base}/` },
        areaServed: "US",
        description: c.summary,
        url: canonicalUrl,
      },
      {
        "@type": "FAQPage",
        mainEntity: c.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: ui.breadcrumbHome, item: `${base}/` },
          { "@type": "ListItem", position: 2, name: c.h1, item: canonicalUrl },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-surface text-ink">
      <script
        type="application/ld+json"
        // 構造化データ（SoftwareApplication / Service / FAQPage / BreadcrumbList）
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="border-b border-border bg-surface-elevated">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="inline-flex items-center transition hover:opacity-90">
            <ViewtraceLogo className="h-8 w-auto sm:h-9" />
          </Link>
          <div className="flex items-center gap-3">
            <LegalLocaleToggle locale={locale} />
            <Link
              href="/"
              className="text-sm font-medium text-ink-muted transition hover:text-ink"
            >
              {shell.backToHome}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 md:py-16">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-ink-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="transition hover:text-ink">
                {ui.breadcrumbHome}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-ink">{c.eyebrow}</li>
          </ol>
        </nav>

        {/* Hero */}
        <section className="rounded-3xl border border-border bg-surface-elevated p-6 sm:p-8 md:p-10">
          <p className="text-xs font-bold uppercase tracking-wider text-accent">{c.eyebrow}</p>
          <h1 className="mt-3 font-display text-2xl font-semibold leading-snug tracking-tight text-ink sm:text-3xl md:text-4xl">
            {c.h1}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
            {c.subhead}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/login?mode=signup"
              className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-accent-hover"
            >
              {ui.ctaPrimary}
            </Link>
            <Link
              href="/#pricing"
              className="inline-flex items-center justify-center rounded-full border border-border bg-surface px-6 py-3 text-sm font-semibold text-ink transition hover:border-ink-muted/40"
            >
              {ui.ctaSecondary}
            </Link>
          </div>
          <p className="mt-4 text-xs font-medium text-ink-muted">{ui.trustNote}</p>
          <div className="mt-6 space-y-4 border-t border-border pt-6 text-sm leading-relaxed text-ink-muted sm:text-base">
            {c.intro.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>

        {/* Pain points */}
        <section className="mt-12 border-t border-border pt-10">
          <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">{c.painTitle}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {c.pains.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-border bg-surface-elevated p-5"
              >
                <h3 className="font-display text-base font-semibold text-ink">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Value props */}
        <section className="mt-12 border-t border-border pt-10">
          <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">{c.valueTitle}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {c.values.map((v) => (
              <div
                key={v.title}
                className="flex gap-4 rounded-2xl border border-border bg-surface-elevated p-5"
              >
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                <div>
                  <h3 className="font-display text-base font-semibold text-ink">{v.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{v.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Screenshot */}
        <section className="mt-12 border-t border-border pt-10">
          <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">
            {ui.screenshotTitle}
          </h2>
          <figure className="mt-6">
            <Image
              src={dashboardScreenshot.src}
              alt={`${ui.screenshotTitle} — Viewtrace`}
              width={dashboardScreenshot.width}
              height={dashboardScreenshot.height}
              sizes="(min-width: 896px) 896px, 100vw"
              className="h-auto w-full rounded-2xl border border-border shadow-sm"
            />
            <figcaption className="mt-3 text-xs leading-relaxed text-ink-muted">
              {ui.screenshotCaption}
            </figcaption>
          </figure>
        </section>

        {/* How it works */}
        <section className="mt-12 border-t border-border pt-10">
          <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">
            {howItWorks.title}
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2">
            {howItWorks.steps.map((step, i) => (
              <li
                key={step.title}
                className="flex gap-4 rounded-2xl border border-border bg-surface-elevated p-5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-sm font-bold text-accent">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-display text-base font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section className="mt-12 border-t border-border pt-10">
          <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">{c.faqTitle}</h2>
          <dl className="mt-6 space-y-4">
            {c.faqs.map((f) => (
              <div
                key={f.q}
                className="rounded-2xl border border-border bg-surface-elevated p-5 sm:p-6"
              >
                <dt className="font-display text-base font-semibold text-ink">{f.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-ink-muted">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Final CTA */}
        <section className="mt-12 overflow-hidden rounded-3xl border border-accent/30 bg-accent-soft p-8 sm:p-10">
          <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">{c.ctaTitle}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
            {c.ctaBody}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/login?mode=signup"
              className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-accent-hover"
            >
              {ui.ctaPrimary}
            </Link>
            <Link
              href="/#pricing"
              className="inline-flex items-center justify-center rounded-full border border-border bg-surface px-6 py-3 text-sm font-semibold text-ink transition hover:border-ink-muted/40"
            >
              {ui.ctaSecondary}
            </Link>
          </div>
        </section>

        {/* Related audience pages */}
        {related.length > 0 ? (
          <section className="mt-12 border-t border-border pt-10">
            <ul className="grid gap-3 sm:grid-cols-2">
              {related.map((a) => (
                <li key={a.slug}>
                  <Link
                    href={audiencePagePath(a.slug)}
                    className="flex items-start gap-2 rounded-xl border border-border bg-surface-elevated p-4 text-sm font-medium text-ink transition hover:border-ink-muted/40"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{a.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}
