import type { CaptureConditionsV1 } from "@/lib/capture-conditions";
import {
  buildMeasurementRecord,
  type MeasurementRecordV1,
  type MeasurementStatus,
} from "@/lib/measurement-record";
import type { RegionalInteractionCheckV1 } from "@/lib/observation-regional-interaction";
import { extractHtmlHeadSignals, type HtmlHeadSignalsV1 } from "@/lib/url-preview";

export type RenderedRobotsTxtStatus = "observed" | "observed_absent" | "not_verifiable" | "not_measured";

/** What Chromium had in the DOM after render. Missing tags were inspected. */
export type RenderedPageMeasurementV1 = {
  source: "rendered_dom";
  title: string | null;
  description: string | null;
  canonical: string | null;
  robots: string | null;
  viewport: string | null;
  lang: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  twitter_card: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  twitter_image: string | null;
  h1: string[];
  json_ld_types: string[];
  robots_txt: RenderedRobotsTxtStatus;
  http_status: number | null;
  final_url: string | null;
  content_type: string | null;
  robots_header: string | null;
  redirect_count: number;
};

function clip(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function parseRenderedPage(raw: unknown, navigation: unknown): RenderedPageMeasurementV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const nav = navigation && typeof navigation === "object" ? (navigation as Record<string, unknown>) : null;
  const robots = row.robots_txt && typeof row.robots_txt === "object" ? (row.robots_txt as Record<string, unknown>) : null;
  const robotsStatus = robots?.status;
  const http = nav && typeof nav.status === "number" && nav.status > 0 ? nav.status : null;
  const h1 = Array.isArray(row.h1) ? row.h1.flatMap((item) => { const text = clip(item, 180); return text ? [text] : []; }).slice(0, 8) : [];
  const jsonLd = Array.isArray(row.json_ld_types)
    ? row.json_ld_types.flatMap((item) => { const text = clip(item, 80); return text ? [text] : []; }).slice(0, 8)
    : [];
  const redirects = nav && Array.isArray(nav.redirect_chain) ? nav.redirect_chain.filter((item) => typeof item === "string") : [];
  return {
    source: "rendered_dom",
    title: clip(row.title, 300),
    description: clip(row.description, 400),
    canonical: clip(row.canonical, 2000),
    robots: clip(row.robots, 200),
    viewport: clip(row.viewport, 200),
    lang: clip(row.lang, 32),
    og_title: clip(row.og_title, 300),
    og_description: clip(row.og_description, 400),
    og_image: clip(row.og_image, 2000),
    twitter_card: clip(row.twitter_card, 64),
    twitter_title: clip(row.twitter_title, 300),
    twitter_description: clip(row.twitter_description, 400),
    twitter_image: clip(row.twitter_image, 2000),
    h1,
    json_ld_types: jsonLd,
    robots_txt:
      robotsStatus === "observed" || robotsStatus === "observed_absent" || robotsStatus === "not_verifiable"
        ? robotsStatus
        : "not_measured",
    http_status: http,
    final_url: clip(nav?.final_url, 2000),
    content_type: clip(nav?.content_type, 120),
    robots_header: clip(nav?.robots_header, 500),
    redirect_count: redirects.length,
  };
}

function meta(name: string, content: string | null, property = false): string {
  if (!content) return "";
  const key = property ? "property" : "name";
  return `<meta ${key}="${escapeHtml(name)}" content="${escapeHtml(content)}">`;
}

/** Rebuild head signals from the rendered DOM so absent and not-measured stay distinct. */
export function htmlSignalsFromRendered(page: RenderedPageMeasurementV1): HtmlHeadSignalsV1 {
  const finalUrl = page.final_url || "https://measured.invalid/";
  const h1 = page.h1.map((text) => `<h1>${escapeHtml(text)}</h1>`).join("");
  const jsonLd = page.json_ld_types
    .map((type) => `<script type="application/ld+json">${JSON.stringify({ "@type": type })}</script>`)
    .join("");
  const html = `<!doctype html><html lang="${escapeHtml(page.lang ?? "")}"><head><title>${escapeHtml(page.title ?? "")}</title>${meta("description", page.description)}${page.canonical ? `<link rel="canonical" href="${escapeHtml(page.canonical)}">` : ""}${meta("robots", page.robots)}${meta("viewport", page.viewport)}${meta("og:title", page.og_title, true)}${meta("og:description", page.og_description, true)}${meta("og:image", page.og_image, true)}${meta("twitter:card", page.twitter_card)}${meta("twitter:title", page.twitter_title)}${meta("twitter:description", page.twitter_description)}${meta("twitter:image", page.twitter_image)}${jsonLd}</head><body>${h1}</body></html>`;
  return extractHtmlHeadSignals(html, finalUrl, page.robots_header, page.http_status, { html, complete: true });
}

export function renderedRobotsStatus(page: RenderedPageMeasurementV1 | null | undefined): MeasurementStatus | null {
  if (!page) return null;
  return page.robots_txt;
}

export function applyRenderedPageMeasurement(
  conditions: CaptureConditionsV1,
  check: RegionalInteractionCheckV1,
): CaptureConditionsV1 {
  const page = check.discovery?.rendered_page ?? null;
  if (!page) return conditions;
  const signals = htmlSignalsFromRendered(page);
  const measurement = buildMeasurementRecord({
    signals,
    webFacts: conditions.web_facts,
    check,
    robotsTxt: page.robots_txt,
  });
  if (!measurement) return conditions;
  const stamped: MeasurementRecordV1 = { ...measurement, source: "rendered_dom" };
  return { ...conditions, html_signals: signals, measurement: stamped };
}
