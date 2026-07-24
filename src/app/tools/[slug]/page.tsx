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
  TOPIC_PAGE_UI,
  TOPIC_SLUGS,
  getHowItWorks,
  getTopicFaqs,
  getTopicLinkLabels,
  getTopicPageCopy,
  isTopicSlug,
  topicPagePath,
  type TopicSlug,
} from "@/lib/seo/topic-pages";
import { siteOrigin } from "@/lib/site";

/** 各検索意図カードの背景に薄く敷くアイコン（ランディングと共通の素材） */
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

/** ダッシュボードのスクリーンショット（ロケール別）。en 用が無ければ ja 版へフォールバック */
const SCREENSHOT_JA = "/marketing/screenshots/dashboard-overview.png";
const SCREENSHOT_EN = "/marketing/screenshots/dashboard-overview-en.png";

async function resolveDashboardScreenshot(locale: Locale): Promise<string> {
  if (locale !== "en") return SCREENSHOT_JA;
  try {
    await access(join(process.cwd(), "public", SCREENSHOT_EN));
    return SCREENSHOT_EN;
  } catch {
    return SCREENSHOT_JA;
  }
}

export const dynamicParams = false;

export function generateStaticParams(): { slug: TopicSlug }[] {
  return TOPIC_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isTopicSlug(slug)) return {};

  const locale = await getRequestLocale();
  const c = getTopicPageCopy(locale, slug);
  const canonical = topicPagePath(slug);

  return {
    // metaTitle は既に "… | Viewtrace" を含むため、ルートの title テンプレートを回避
    title: { absolute: c.metaTitle },
    description: c.metaDescription,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: "article",
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

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isTopicSlug(slug)) notFound();

  const locale = await getRequestLocale();
  const c = getTopicPageCopy(locale, slug);
  const ui = TOPIC_PAGE_UI[locale];
  const shell = copy[locale].legalShell;
  const backdrop = TOPIC_BACKDROP_ICON[slug];
  const related = getTopicLinkLabels(locale).filter((t) => t.slug !== slug);
  const howItWorks = getHowItWorks(locale);
  const faqs = getTopicFaqs(locale, slug);
  const dashboardScreenshot = await resolveDashboardScreenshot(locale);

  const base = siteOrigin.replace(/\/$/, "");
  const canonicalUrl = `${base}${topicPagePath(slug)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
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
        // 構造化データ（FAQPage / BreadcrumbList）: リッチリザルト対象
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="border-b border-border bg-surface-elevated">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
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

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 md:py-16">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-ink-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="transition hover:text-ink">
                {ui.breadcrumbHome}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-ink">{c.h1}</li>
          </ol>
        </nav>

        <article className="relative overflow-hidden rounded-2xl border border-border bg-surface-elevated p-6 sm:p-8 md:p-10">
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
            <p className="text-xs font-bold uppercase tracking-wider text-accent">{ui.eyebrow}</p>
            <h1 className="mt-3 font-display text-2xl font-semibold leading-snug tracking-tight text-ink sm:text-3xl">
              {c.h1}
            </h1>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-ink-muted sm:text-base">
              {c.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login?mode=signin"
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
          </div>
        </article>

        <section className="mt-12 border-t border-border pt-10">
          <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">
            {ui.screenshotTitle}
          </h2>
          <figure className="mt-6">
            <Image
              src={dashboardScreenshot}
              alt={`${ui.screenshotTitle} — ${c.h1}`}
              width={1024}
              height={549}
              sizes="(min-width: 768px) 768px, 100vw"
              className="h-auto w-full rounded-2xl border border-border shadow-sm"
            />
            <figcaption className="mt-3 text-xs leading-relaxed text-ink-muted">
              {ui.screenshotCaption}
            </figcaption>
          </figure>
        </section>

        <section className="mt-12 border-t border-border pt-10">
          <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">
            {howItWorks.title}
          </h2>
          {/* eslint-disable-next-line @next/next/no-img-element -- 動的生成 PNG（ImageResponse） */}
          <img
            src={`${topicPagePath(slug)}/steps-image`}
            alt={`${howItWorks.title} — ${c.h1}`}
            width={1200}
            height={630}
            loading="lazy"
            className="mt-6 h-auto w-full rounded-2xl border border-border"
          />
          <ol className="mt-6 space-y-4">
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

        <section className="mt-12 border-t border-border pt-10">
          <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">{ui.faqTitle}</h2>
          <dl className="mt-6 space-y-4">
            {faqs.map((f) => (
              <div key={f.q} className="rounded-2xl border border-border bg-surface-elevated p-5 sm:p-6">
                <dt className="font-display text-base font-semibold text-ink">{f.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-ink-muted">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-12 border-t border-border pt-10">
          <h2 className="font-display text-lg font-semibold text-ink sm:text-xl">
            {ui.relatedTitle}
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {related.map((t) => (
              <li key={t.slug}>
                <Link
                  href={topicPagePath(t.slug)}
                  className="flex items-start gap-2 rounded-xl border border-border bg-surface-elevated p-4 text-sm font-medium text-ink transition hover:border-ink-muted/40"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{t.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Link
              href="/#search-topics"
              className="text-sm font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              {ui.allTopics}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
