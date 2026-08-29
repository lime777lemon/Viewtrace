import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site";
import { AUDIENCE_SLUGS, audiencePagePath } from "@/lib/seo/audience-pages";
import { TOPIC_SLUGS, topicPagePath } from "@/lib/seo/topic-pages";

/** インデックス対象の公開ページ（ログイン後エリアは robots で除外） */
const PUBLIC_PATHS: MetadataRoute.Sitemap = [
  { url: "/", changeFrequency: "weekly", priority: 1 },
  // 相手別（代理店セグメント別）ランディング（/for/[segment]）。有料広告の着地兼SEO
  ...AUDIENCE_SLUGS.map((slug) => ({
    url: audiencePagePath(slug),
    changeFrequency: "monthly" as const,
    priority: 0.9,
  })),
  // 検索意図別のトピックページ（/tools/[slug]）。集客用の主要ランディング群
  ...TOPIC_SLUGS.map((slug) => ({
    url: topicPagePath(slug),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  })),
  { url: "/terms", changeFrequency: "monthly", priority: 0.6 },
  { url: "/privacy", changeFrequency: "monthly", priority: 0.6 },
  { url: "/acceptable-use", changeFrequency: "monthly", priority: 0.5 },
  { url: "/tokushoho", changeFrequency: "monthly", priority: 0.5 },
  { url: "/about", changeFrequency: "yearly", priority: 0.4 },
  { url: "/contact", changeFrequency: "yearly", priority: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteOrigin.replace(/\/$/, "");
  return PUBLIC_PATHS.map((entry) => ({
    ...entry,
    url: `${base}${entry.url === "/" ? "" : entry.url}`,
    lastModified: new Date(),
  }));
}
