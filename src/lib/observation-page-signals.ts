import type { HtmlHeadSignalsV1 } from "@/lib/url-preview";
import { htmlHeadSignalsHasAny } from "@/lib/url-preview";

export const PAGE_SIGNALS_MAX = 100;
export const PAGE_SIGNALS_CRITICAL = 25;
export const PAGE_SIGNALS_IMPORTANT = 10;
export const PAGE_SIGNALS_MINOR = 3;

export type PageSignalSeverity = "critical" | "important" | "minor";
export type PageSignalBand = "good" | "review" | "attention";

export type PageSignalReasonId =
  | "http_error"
  | "noindex"
  | "canonical_mismatch"
  | "title_missing"
  | "description_missing"
  | "canonical_missing"
  | "robots_missing"
  | "og_missing"
  | "og_title_missing"
  | "og_description_missing"
  | "og_image_missing"
  | "lang_missing"
  | "viewport_missing"
  | "twitter_missing"
  | "final_url_missing";

export type PageSignalReason = {
  id: PageSignalReasonId;
  severity: PageSignalSeverity;
  points: number;
  httpStatus?: number | null;
};

export type PageSignalsScore = {
  score: number;
  band: PageSignalBand;
  reasons: PageSignalReason[];
};

function text(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function critical(id: PageSignalReasonId, extra?: Pick<PageSignalReason, "httpStatus">): PageSignalReason {
  return { id, severity: "critical", points: PAGE_SIGNALS_CRITICAL, ...extra };
}

function important(id: PageSignalReasonId): PageSignalReason {
  return { id, severity: "important", points: PAGE_SIGNALS_IMPORTANT };
}

function minor(id: PageSignalReasonId): PageSignalReason {
  return { id, severity: "minor", points: PAGE_SIGNALS_MINOR };
}

export function pageSignalsBand(score: number): PageSignalBand {
  if (score >= 85) return "good";
  if (score >= 60) return "review";
  return "attention";
}

/**
 * 保存済み html_signals だけの減点。測っていない Performance / SEO / A11y は使わない。
 * シグナルが無いときは null（点数を作らない）。
 */
export function scorePageSignals(
  signals: HtmlHeadSignalsV1 | null | undefined,
): PageSignalsScore | null {
  if (!signals || !htmlHeadSignalsHasAny(signals)) return null;

  const reasons: PageSignalReason[] = [];

  if (typeof signals.http_status === "number" && signals.http_status >= 400) {
    reasons.push(critical("http_error", { httpStatus: signals.http_status }));
  }
  if (signals.noindex === true) reasons.push(critical("noindex"));
  if (signals.canonical_mismatch === true) reasons.push(critical("canonical_mismatch"));

  if (!text(signals.document_title)) reasons.push(important("title_missing"));
  if (!text(signals.meta_description)) reasons.push(important("description_missing"));
  if (!text(signals.canonical_url)) reasons.push(important("canonical_missing"));
  if (!text(signals.robots_meta) && !text(signals.x_robots_tag)) {
    reasons.push(important("robots_missing"));
  }

  const ogTitle = text(signals.og_title);
  const ogDescription = text(signals.og_description);
  const ogImage = text(signals.og_image);
  if (!ogTitle && !ogDescription && !ogImage) {
    reasons.push(important("og_missing"));
  } else {
    if (!ogTitle) reasons.push(minor("og_title_missing"));
    if (!ogDescription) reasons.push(minor("og_description_missing"));
    if (!ogImage) reasons.push(minor("og_image_missing"));
  }

  if (!text(signals.html_lang)) reasons.push(minor("lang_missing"));
  if (!text(signals.viewport)) reasons.push(minor("viewport_missing"));
  if (
    !text(signals.twitter_card) &&
    !text(signals.twitter_title) &&
    !text(signals.twitter_description) &&
    !text(signals.twitter_image)
  ) {
    reasons.push(minor("twitter_missing"));
  }
  if (!text(signals.final_url)) reasons.push(minor("final_url_missing"));

  const deducted = reasons.reduce((sum, row) => sum + row.points, 0);
  const score = Math.max(0, PAGE_SIGNALS_MAX - deducted);
  return { score, band: pageSignalsBand(score), reasons };
}
