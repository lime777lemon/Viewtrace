import { AUDIENCE_SLUGS, audiencePagePath, getAudiencePageCopy } from "@/lib/seo/audience-pages";
import { TOPIC_SLUGS, getTopicLinkLabels, topicPagePath } from "@/lib/seo/topic-pages";
import { siteOrigin } from "@/lib/site";

export const dynamic = "force-static";

/**
 * /llms.txt — AI/LLM 向けの構造化された説明（GEO 対策）。
 * ChatGPT・Perplexity・Claude 等が Viewtrace を「US 広告・マーケ代理店向けの
 * 地域別広告検証ツール」として正確に説明・引用できるようにする一次情報。
 * 仕様参考: https://llmstxt.org/
 */
export function GET(): Response {
  const base = siteOrigin.replace(/\/$/, "");
  const abs = (path: string) => `${base}${path === "/" ? "" : path}`;

  const audienceLines = AUDIENCE_SLUGS.map((slug) => {
    const c = getAudiencePageCopy("en", slug);
    return `- [${c.eyebrow}](${abs(audiencePagePath(slug))}): ${c.summary}`;
  }).join("\n");

  const labels = Object.fromEntries(
    getTopicLinkLabels("en").map((t) => [t.slug, t.label]),
  );
  const topicLines = TOPIC_SLUGS.map(
    (slug) => `- [${labels[slug]}](${abs(topicPagePath(slug))})`,
  ).join("\n");

  const body = `# Viewtrace

> Viewtrace is a geo ad verification platform for advertising and marketing agencies.
> It produces tamper-evident, geo-routed proof of how ads and landing pages actually
> rendered in a specific country or US state—captures tied to the exact URL, a
> timestamp, and an integrity check, delivered as client-ready verify URLs and PDF reports.

## Who it is for

Viewtrace is built for US advertising, marketing, performance/paid-media, and SEO
agencies that must prove to clients what actually showed in each market—not just that
a campaign "ran". Typical jobs to be done: geo screenshot / geo verification, landing
page QA per region, ad-creative rendering checks, localized QA, and defensible proof for
client reviews and QBRs.

## What makes it different

- Geo-routed captures from the region you choose (country or US state), not a desktop grab behind a VPN.
- Every observation stores URL + region + timestamp + integrity check, so it holds up weeks later.
- Client-ready verify URLs and PDF reports clients can open without a login.
- Scheduled reruns with email digests flag meaningful visual drift (Starter / Pro).
- A shared workspace so media, account, and creative teams open one source of truth.

## Pricing

Free trial with up to 20 observations and no credit card. Paid plans (Starter, Pro)
scale with observation volume, retention, and scheduling. See ${abs("/#pricing")}.

## Audience pages

${audienceLines}

## Guides and use cases

${topicLines}

## Key links

- Home: ${abs("/")}
- Pricing: ${abs("/#pricing")}
- How it works: ${abs("/#how-it-works")}
- Sign up (free): ${abs("/login?mode=signup")}
- About: ${abs("/about")}
- Contact: ${abs("/contact")}
- Privacy: ${abs("/privacy")}
- Terms: ${abs("/terms")}

## Contact

Email: info@viewtrace.net
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
