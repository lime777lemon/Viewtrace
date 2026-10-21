import type { HtmlHeadSignalsV1 } from "@/lib/url-preview";

export const PAGE_SEO_SCORE_LABEL = "page_seo_score" as const;

export type PageSeoSignalId =
  | "title"
  | "meta_description"
  | "canonical"
  | "indexability"
  | "robots_txt"
  | "h1"
  | "lang"
  | "viewport"
  | "http_status"
  | "open_graph"
  | "structured_data";

export type PageSeoVerdict = "pass" | "partial" | "fail" | "not_measured";

export type PageSeoSignalScore = {
  id: PageSeoSignalId;
  weight: number;
  earned: number | null;
  verdict: PageSeoVerdict;
  detail: string | null;
};

export type PageSeoScoreV1 = {
  label: typeof PAGE_SEO_SCORE_LABEL;
  basis: "observed_signals";
  scope: "single_url";
  score: number | null;
  earned: number;
  possible: number;
  measured_count: number;
  not_measured_count: number;
  signals: PageSeoSignalScore[];
};

const WEIGHTS: Record<PageSeoSignalId, number> = {
  title: 15,
  meta_description: 10,
  canonical: 10,
  indexability: 15,
  robots_txt: 10,
  h1: 10,
  lang: 5,
  viewport: 5,
  http_status: 10,
  open_graph: 5,
  structured_data: 5,
};

function row(
  id: PageSeoSignalId,
  verdict: PageSeoVerdict,
  earned: number | null,
  detail: string | null = null,
): PageSeoSignalScore {
  return {
    id,
    weight: WEIGHTS[id],
    earned: verdict === "not_measured" ? null : earned,
    verdict,
    detail,
  };
}

function text(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

export function finalizePageSeoScore(signals: PageSeoSignalScore[]): PageSeoScoreV1 {
  const measured = signals.filter((item) => item.verdict !== "not_measured");
  const earned = measured.reduce((sum, item) => sum + (item.earned ?? 0), 0);
  const possible = measured.reduce((sum, item) => sum + item.weight, 0);
  return {
    label: PAGE_SEO_SCORE_LABEL,
    basis: "observed_signals",
    scope: "single_url",
    score: possible > 0 ? Math.round((earned / possible) * 100) : null,
    earned,
    possible,
    measured_count: measured.length,
    not_measured_count: signals.length - measured.length,
    signals,
  };
}

export function buildPageSeoScore(input: {
  html: HtmlHeadSignalsV1 | null;
  title: "present" | "absent" | "unknown";
  description: "present" | "absent" | "unknown";
  canonical: "present" | "absent" | "unknown";
  canonicalMismatch: boolean;
  noindex: "present" | "absent" | "unknown";
  robotsTxt: "present" | "absent" | "unknown";
  robotsPath: "allowed" | "disallowed" | "unknown";
  httpStatus: number | null;
}): PageSeoScoreV1 {
  const html = input.html;

  const titleRow =
    !html || input.title === "unknown"
      ? row("title", "not_measured", null)
      : input.title === "present"
        ? row("title", "pass", WEIGHTS.title)
        : row("title", "fail", 0, "Missing");

  const descriptionRow =
    !html || input.description === "unknown"
      ? row("meta_description", "not_measured", null)
      : input.description === "present"
        ? row("meta_description", "pass", WEIGHTS.meta_description)
        : row("meta_description", "fail", 0, "Missing");

  let canonicalRow: PageSeoSignalScore;
  if (!html || input.canonical === "unknown") {
    canonicalRow = row("canonical", "not_measured", null);
  } else if (input.canonical === "absent") {
    canonicalRow = row("canonical", "fail", 0, "Missing");
  } else if (input.canonicalMismatch) {
    canonicalRow = row("canonical", "partial", 5, "Mismatch");
  } else {
    canonicalRow = row("canonical", "pass", WEIGHTS.canonical);
  }

  let indexRow: PageSeoSignalScore;
  if (input.noindex === "present") {
    indexRow = row("indexability", "fail", 0, "noindex");
  } else if (html || input.noindex === "absent") {
    indexRow = row("indexability", "pass", WEIGHTS.indexability, "No noindex");
  } else {
    indexRow = row("indexability", "not_measured", null);
  }

  let robotsRow: PageSeoSignalScore;
  if (input.robotsTxt === "unknown") {
    robotsRow = row("robots_txt", "not_measured", null);
  } else if (input.robotsPath === "disallowed") {
    robotsRow = row("robots_txt", "fail", 0, "Disallowed");
  } else if (input.robotsPath === "allowed" || input.robotsTxt === "absent") {
    robotsRow = row(
      "robots_txt",
      "pass",
      WEIGHTS.robots_txt,
      input.robotsTxt === "absent" ? "Not present" : "No matching disallow",
    );
  } else {
    robotsRow = row("robots_txt", "not_measured", null);
  }

  let h1Row: PageSeoSignalScore;
  const h1Count = html?.h1_count;
  const h1Known = typeof h1Count === "number" && (html?.body_scan === "complete" || h1Count >= 2);
  if (!html || typeof h1Count !== "number" || !h1Known) {
    h1Row = row("h1", "not_measured", null);
  } else if (h1Count === 1) {
    h1Row = row("h1", "pass", WEIGHTS.h1, "1");
  } else if (h1Count === 0) {
    h1Row = row("h1", "fail", 0, "Missing");
  } else {
    h1Row = row("h1", "partial", 5, "Multiple");
  }

  const langRow =
    !html || html.html_lang === undefined
      ? row("lang", "not_measured", null)
      : text(html.html_lang)
        ? row("lang", "pass", WEIGHTS.lang)
        : row("lang", "fail", 0, "Missing");

  const viewportRow =
    !html || html.viewport === undefined
      ? row("viewport", "not_measured", null)
      : text(html.viewport)
        ? row("viewport", "pass", WEIGHTS.viewport)
        : row("viewport", "fail", 0, "Missing");

  let httpRow: PageSeoSignalScore;
  const status = input.httpStatus;
  if (status == null || !Number.isFinite(status) || status <= 0) {
    httpRow = row("http_status", "not_measured", null);
  } else if (status >= 200 && status < 300) {
    httpRow = row("http_status", "pass", WEIGHTS.http_status, String(status));
  } else {
    httpRow = row("http_status", "fail", 0, String(status));
  }

  let openGraphRow: PageSeoSignalScore;
  if (!html) {
    openGraphRow = row("open_graph", "not_measured", null);
  } else {
    const parts = [html.og_title, html.og_description, html.og_image].map((value) => text(value));
    const present = parts.filter(Boolean).length;
    if (present === 3) openGraphRow = row("open_graph", "pass", WEIGHTS.open_graph);
    else if (present === 0) openGraphRow = row("open_graph", "fail", 0, "Missing");
    else openGraphRow = row("open_graph", "partial", 4, "Incomplete");
  }

  let structuredRow: PageSeoSignalScore;
  if (!html) {
    structuredRow = row("structured_data", "not_measured", null);
  } else if (html.json_ld_types.length > 0) {
    structuredRow = row("structured_data", "pass", WEIGHTS.structured_data, html.json_ld_types.join(", "));
  } else if (html.body_scan === "complete") {
    structuredRow = row("structured_data", "fail", 0, "Missing");
  } else {
    structuredRow = row("structured_data", "not_measured", null);
  }

  return finalizePageSeoScore([
    titleRow,
    descriptionRow,
    canonicalRow,
    indexRow,
    robotsRow,
    h1Row,
    langRow,
    viewportRow,
    httpRow,
    openGraphRow,
    structuredRow,
  ]);
}
