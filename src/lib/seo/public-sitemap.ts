import type { MetadataRoute } from "next";
import type { Locale } from "@/lib/i18n";
import { AUDIENCE_SLUGS, audiencePagePath, getAudiencePageCopy } from "@/lib/seo/audience-pages";
import { TOPIC_SLUGS, getTopicLinkLabels, topicPagePath } from "@/lib/seo/topic-pages";

export type PublicSitemapEntry = {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
};

/** インデックス対象の公開ページ（ログイン後エリアは robots で除外） */
export const PUBLIC_SITEMAP_ENTRIES: readonly PublicSitemapEntry[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  ...AUDIENCE_SLUGS.map((slug) => ({
    path: audiencePagePath(slug),
    changeFrequency: "monthly" as const,
    priority: 0.9,
  })),
  ...TOPIC_SLUGS.map((slug) => ({
    path: topicPagePath(slug),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  })),
  { path: "/features", changeFrequency: "monthly", priority: 0.6 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.6 },
  { path: "/acceptable-use", changeFrequency: "monthly", priority: 0.5 },
  { path: "/tokushoho", changeFrequency: "monthly", priority: 0.5 },
  { path: "/about", changeFrequency: "yearly", priority: 0.4 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.4 },
  { path: "/site-map", changeFrequency: "monthly", priority: 0.3 },
];

export type PublicSitemapLink = {
  path: string;
  label: string;
};

export type PublicSitemapSection = {
  title: string;
  links: PublicSitemapLink[];
};

export function publicSitemapSections(locale: Locale): PublicSitemapSection[] {
  const ja = locale === "ja";
  const topicLabels = Object.fromEntries(
    getTopicLinkLabels(locale).map((t) => [t.slug, t.label]),
  );

  return [
    {
      title: ja ? "製品" : "Product",
      links: [
        { path: "/", label: ja ? "ホーム" : "Home" },
        { path: "/features", label: ja ? "機能・比較" : "Features" },
        { path: "/about", label: ja ? "私たちについて" : "About" },
        { path: "/contact", label: ja ? "お問い合わせ" : "Contact" },
      ],
    },
    {
      title: ja ? "対象" : "Audience",
      links: AUDIENCE_SLUGS.map((slug) => ({
        path: audiencePagePath(slug),
        label: getAudiencePageCopy(locale, slug).eyebrow,
      })),
    },
    {
      title: ja ? "ガイド" : "Guides",
      links: TOPIC_SLUGS.map((slug) => ({
        path: topicPagePath(slug),
        label: topicLabels[slug] ?? slug,
      })),
    },
    {
      title: ja ? "法務" : "Legal",
      links: [
        { path: "/terms", label: ja ? "利用規約" : "Terms" },
        { path: "/privacy", label: ja ? "プライバシー" : "Privacy" },
        { path: "/acceptable-use", label: ja ? "許容される利用方針" : "Acceptable use" },
        { path: "/tokushoho", label: ja ? "特定商取引法に基づく表記" : "Commercial disclosure" },
      ],
    },
  ];
}
