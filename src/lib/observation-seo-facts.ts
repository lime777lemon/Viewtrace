import { buildPageSeoScore, type PageSeoScoreV1 } from "@/lib/observation-page-seo-score";
import type { HtmlHeadSignalsV1 } from "@/lib/url-preview";
import type {
  ObservationRobotsDirectivesV1,
  ObservationWebFactsV1,
} from "@/lib/observation-web-facts";

export const OBSERVATION_SEO_FACTS_SCHEMA_VERSION = 1 as const;

export type SeoFactSource = "html" | "http" | "robots_txt";

export type SeoFactState =
  | "present"
  | "absent"
  | "match"
  | "mismatch"
  | "allowed"
  | "disallowed"
  | "unknown";

export type SeoFactId =
  | "document_title"
  | "meta_description"
  | "canonical"
  | "canonical_vs_final"
  | "html_lang"
  | "json_ld"
  | "robots_meta"
  | "x_robots_tag"
  | "noindex"
  | "nofollow"
  | "http_status"
  | "requested_vs_final"
  | "robots_txt"
  | "robots_txt_path"
  | "sitemap_declared";

export type ObservationSeoFactV1 = {
  id: SeoFactId;
  source: SeoFactSource;
  state: SeoFactState;
  value: string | null;
};

export type ObservationSeoFactsV1 = {
  schema_version: typeof OBSERVATION_SEO_FACTS_SCHEMA_VERSION;
  scope: "single_url";
  requested_url: string;
  final_url: string | null;
  http_status: number | null;
  facts: ObservationSeoFactV1[];
  page_seo_score?: PageSeoScoreV1;
  note: "Page SEO Score is a deterministic total of measured signals on this URL. Unmeasured signals are excluded. Not an AI score and not a site score.";
};

const VALUE_MAX = 500;

function clip(value: string | null | undefined): string | null {
  const text = value?.replace(/\s+/g, " ").trim() ?? "";
  return text ? text.slice(0, VALUE_MAX) : null;
}

function fact(
  id: SeoFactId,
  source: SeoFactSource,
  state: SeoFactState,
  value?: string | null,
): ObservationSeoFactV1 {
  return { id, source, state, value: clip(value) };
}

function presence(value: string | null | undefined): { state: "present" | "absent"; value: string | null } {
  const text = clip(value);
  return text ? { state: "present", value: text } : { state: "absent", value: null };
}

function looseUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim() ?? "";
  if (!value) return null;
  try {
    const url = new URL(value);
    url.hash = "";
    let path = url.pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    return `${url.protocol}//${url.host.toLowerCase()}${path}${url.search}`;
  } catch {
    return null;
  }
}

function pathForRobots(raw: string | null | undefined): string | null {
  const value = raw?.trim() ?? "";
  if (!value) return null;
  try {
    const url = new URL(value);
    return `${url.pathname || "/"}${url.search}`;
  } catch {
    return null;
  }
}

export function robotsRuleMatches(rule: string, path: string): boolean {
  if (!rule.startsWith("/") && !rule.startsWith("*")) return false;
  const end = rule.endsWith("$");
  const body = end ? rule.slice(0, -1) : rule;
  let source = "^";
  for (const ch of body) {
    source += ch === "*" ? ".*" : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  if (end) source += "$";
  try {
    return new RegExp(source).test(path);
  } catch {
    return false;
  }
}

function isStarAgent(agent: string): boolean {
  return agent.trim().toLowerCase() === "*";
}

export function decideRobotsPath(
  directives: ObservationRobotsDirectivesV1,
  path: string,
): { state: "allowed" | "disallowed" | "unknown"; rule: string | null } {
  const groups = directives.groups ?? [];
  let allow: string[] = [];
  let disallow: string[] = [];
  if (groups.length > 0) {
    const stars = groups.filter((group) => group.user_agents.some(isStarAgent));
    if (stars.length === 0) return { state: "unknown", rule: null };
    allow = stars.flatMap((group) => group.allow);
    disallow = stars.flatMap((group) => group.disallow);
  } else if (directives.user_agents.length > 0 && directives.user_agents.every(isStarAgent)) {
    allow = directives.allow;
    disallow = directives.disallow;
  } else if (
    directives.user_agents.length === 0 &&
    directives.allow.length === 0 &&
    directives.disallow.length === 0
  ) {
    allow = [];
    disallow = [];
  } else {
    return { state: "unknown", rule: null };
  }

  let best: { length: number; allow: boolean; rule: string } | null = null;
  for (const [rule, isAllow] of [
    ...disallow.map((rule) => [rule, false] as const),
    ...allow.map((rule) => [rule, true] as const),
  ]) {
    if (!rule || !robotsRuleMatches(rule, path)) continue;
    if (
      !best ||
      rule.length > best.length ||
      (rule.length === best.length && isAllow && !best.allow)
    ) {
      best = { length: rule.length, allow: isAllow, rule };
    }
  }
  if (!best) return { state: "allowed", rule: null };
  return {
    state: best.allow ? "allowed" : "disallowed",
    rule: `${best.allow ? "Allow" : "Disallow"}: ${best.rule}`,
  };
}

function directiveToken(
  parts: Array<string | null | undefined>,
  token: "noindex" | "nofollow",
): ObservationSeoFactV1 {
  const present = parts.map((part) => clip(part)).filter((part): part is string => Boolean(part));
  if (present.length === 0) return fact(token, "html", "unknown");
  const joined = present.join(" | ");
  const hit = present.some((part) => new RegExp(`\\b(?:${token}|none)\\b`, "i").test(part));
  return fact(token, "html", hit ? "present" : "absent", joined);
}

export function buildObservationSeoFacts(input: {
  requestedUrl: string;
  html: HtmlHeadSignalsV1 | null;
  webFacts: ObservationWebFactsV1 | null;
}): ObservationSeoFactsV1 | null {
  if (!input.html && !input.webFacts) return null;
  const requested = clip(input.requestedUrl) ?? input.requestedUrl;
  const html = input.html;
  const httpStatus =
    (typeof html?.http_status === "number" && html.http_status > 0 ? html.http_status : null) ??
    (typeof input.webFacts?.http.status === "number" && input.webFacts.http.status > 0
      ? input.webFacts.http.status
      : null);
  const finalUrl = clip(html?.final_url) ?? clip(input.webFacts?.http.final_url);
  const xRobots = clip(html?.x_robots_tag) ?? clip(input.webFacts?.http.headers["x-robots-tag"]);
  const robotsMeta = clip(html?.robots_meta);

  const title = html ? presence(html.document_title) : null;
  const description = html ? presence(html.meta_description) : null;
  const canonical = html ? presence(html.canonical_url) : null;
  const lang = html ? presence(html.html_lang) : null;
  const jsonLd = html
    ? html.json_ld_types.length > 0
      ? { state: "present" as const, value: html.json_ld_types.join(", ") }
      : { state: "absent" as const, value: null }
    : null;

  let canonicalVsFinal: ObservationSeoFactV1;
  if (!html || !canonical || canonical.state === "absent" || !finalUrl) {
    canonicalVsFinal = fact("canonical_vs_final", "html", "unknown", canonical?.value);
  } else {
    const left = looseUrl(canonical.value);
    const right = looseUrl(finalUrl);
    canonicalVsFinal = fact(
      "canonical_vs_final",
      "html",
      left && right && left === right ? "match" : "mismatch",
      canonical.value,
    );
  }

  let requestedVsFinal: ObservationSeoFactV1;
  if (!finalUrl) {
    requestedVsFinal = fact("requested_vs_final", "http", "unknown");
  } else {
    const left = looseUrl(requested);
    const right = looseUrl(finalUrl);
    requestedVsFinal = fact(
      "requested_vs_final",
      "http",
      left && right && left === right ? "match" : "mismatch",
      finalUrl,
    );
  }

  const robots = input.webFacts?.robots;
  let robotsTxt: ObservationSeoFactV1;
  let robotsPath: ObservationSeoFactV1;
  let sitemap: ObservationSeoFactV1;
  if (!robots || robots.error || robots.present == null) {
    robotsTxt = fact("robots_txt", "robots_txt", "unknown");
    robotsPath = fact("robots_txt_path", "robots_txt", "unknown");
    sitemap = fact("sitemap_declared", "robots_txt", "unknown");
  } else if (robots.present === false) {
    robotsTxt = fact("robots_txt", "robots_txt", "absent");
    robotsPath = fact("robots_txt_path", "robots_txt", "unknown");
    sitemap = fact("sitemap_declared", "robots_txt", "unknown");
  } else {
    robotsTxt = fact("robots_txt", "robots_txt", "present", robots.url);
    const path = pathForRobots(finalUrl) ?? pathForRobots(requested);
    if (!path) {
      robotsPath = fact("robots_txt_path", "robots_txt", "unknown");
    } else {
      const decided = decideRobotsPath(robots.directives, path);
      robotsPath = fact("robots_txt_path", "robots_txt", decided.state, decided.rule ?? path);
    }
    const sitemaps = robots.directives.sitemaps;
    sitemap = fact(
      "sitemap_declared",
      "robots_txt",
      sitemaps.length > 0 ? "present" : "absent",
      sitemaps.length > 0 ? sitemaps.join(" ") : null,
    );
  }

  const noindexSource: SeoFactSource = robotsMeta && !xRobots ? "html" : xRobots && !robotsMeta ? "http" : "html";
  const noindex = directiveToken([robotsMeta, xRobots], "noindex");
  const nofollow = directiveToken([robotsMeta, xRobots], "nofollow");
  const facts: ObservationSeoFactV1[] = [
      title
        ? fact("document_title", "html", title.state, title.value)
        : fact("document_title", "html", "unknown"),
      description
        ? fact("meta_description", "html", description.state, description.value)
        : fact("meta_description", "html", "unknown"),
      canonical
        ? fact("canonical", "html", canonical.state, canonical.value)
        : fact("canonical", "html", "unknown"),
      canonicalVsFinal,
      lang ? fact("html_lang", "html", lang.state, lang.value) : fact("html_lang", "html", "unknown"),
      jsonLd
        ? fact("json_ld", "html", jsonLd.state, jsonLd.value)
        : fact("json_ld", "html", "unknown"),
      html
        ? fact("robots_meta", "html", robotsMeta ? "present" : "absent", robotsMeta)
        : fact("robots_meta", "html", "unknown"),
      fact(
        "x_robots_tag",
        "http",
        xRobots ? "present" : html || input.webFacts?.http.status != null ? "absent" : "unknown",
        xRobots,
      ),
      { ...noindex, source: noindex.state === "unknown" ? "html" : noindexSource },
      { ...nofollow, source: nofollow.state === "unknown" ? "html" : noindexSource },
      fact("http_status", "http", httpStatus ? "present" : "unknown", httpStatus ? String(httpStatus) : null),
      requestedVsFinal,
      robotsTxt,
      robotsPath,
      sitemap,
    ];
  const factState = (id: SeoFactId) => facts.find((item) => item.id === id)?.state ?? "unknown";

  return {
    schema_version: OBSERVATION_SEO_FACTS_SCHEMA_VERSION,
    scope: "single_url",
    requested_url: requested,
    final_url: finalUrl,
    http_status: httpStatus,
    note: "Page SEO Score is a deterministic total of measured signals on this URL. Unmeasured signals are excluded. Not an AI score and not a site score.",
    facts,
    page_seo_score: buildPageSeoScore({
      html,
      title: factState("document_title") === "present" ? "present" : factState("document_title") === "absent" ? "absent" : "unknown",
      description:
        factState("meta_description") === "present"
          ? "present"
          : factState("meta_description") === "absent"
            ? "absent"
            : "unknown",
      canonical:
        factState("canonical") === "present" ? "present" : factState("canonical") === "absent" ? "absent" : "unknown",
      canonicalMismatch: factState("canonical_vs_final") === "mismatch",
      noindex: noindex.state === "present" ? "present" : noindex.state === "absent" ? "absent" : "unknown",
      robotsTxt:
        robotsTxt.state === "present" ? "present" : robotsTxt.state === "absent" ? "absent" : "unknown",
      robotsPath:
        robotsPath.state === "allowed" || robotsPath.state === "disallowed" ? robotsPath.state : "unknown",
      httpStatus,
    }),
  };
}

export function pageSeoScoreFromRecord(
  facts: ObservationSeoFactsV1,
  html: HtmlHeadSignalsV1 | null,
): PageSeoScoreV1 {
  if (facts.page_seo_score) return facts.page_seo_score;
  const state = (id: SeoFactId) => facts.facts.find((item) => item.id === id)?.state ?? "unknown";
  const asPresence = (id: SeoFactId): "present" | "absent" | "unknown" => {
    const value = state(id);
    return value === "present" || value === "absent" ? value : "unknown";
  };
  const robotsPath = state("robots_txt_path");
  return buildPageSeoScore({
    html,
    title: asPresence("document_title"),
    description: asPresence("meta_description"),
    canonical: asPresence("canonical"),
    canonicalMismatch: state("canonical_vs_final") === "mismatch",
    noindex: asPresence("noindex"),
    robotsTxt: asPresence("robots_txt"),
    robotsPath: robotsPath === "allowed" || robotsPath === "disallowed" ? robotsPath : "unknown",
    httpStatus: facts.http_status,
  });
}

export function seoFactsForObservation(input: {
  requestedUrl: string;
  storedHtmlSignals?: HtmlHeadSignalsV1 | null;
  preview?: { ok: boolean; html?: boolean; htmlSignals?: HtmlHeadSignalsV1 | null } | null;
  webFacts?: ObservationWebFactsV1 | null;
}): ObservationSeoFactsV1 | null {
  const previewHtml =
    input.preview?.ok && input.preview.html ? (input.preview.htmlSignals ?? null) : null;
  return buildObservationSeoFacts({
    requestedUrl: input.requestedUrl,
    html: previewHtml ?? input.storedHtmlSignals ?? null,
    webFacts: input.webFacts ?? null,
  });
}
