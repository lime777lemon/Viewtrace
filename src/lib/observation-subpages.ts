import type { HtmlHeadSignalsV1 } from "@/lib/url-preview";
import { isBlockedPreviewHost, normalizeUserUrlInput } from "@/lib/url-preview";
import {
  scorePageSignals,
  type PageSignalBand,
  type PageSignalReasonId,
} from "@/lib/observation-page-signals";

export const SUBPAGE_SCORES_SCHEMA_VERSION = 1 as const;
export const SUBPAGE_SCORES_SOURCE = "same_origin_html_fetch" as const;

const SKIP_EXT =
  /\.(?:pdf|jpe?g|png|gif|webp|svg|ico|zip|mp4|mp3|webm|css|js|mjs|woff2?|ttf|otf|map)(?:[?#]|$)/i;

export type SubpageScoreRowV1 = {
  url: string;
  path: string;
  title: string | null;
  http_status: number | null;
  score: number | null;
  band: PageSignalBand | null;
  reason_ids: PageSignalReasonId[];
  error: string | null;
};

export type SubpageScoresV1 = {
  schema_version: typeof SUBPAGE_SCORES_SCHEMA_VERSION;
  source: typeof SUBPAGE_SCORES_SOURCE;
  measured_at: string;
  screenshot: false;
  origin: string;
  max_pages: number;
  pages: SubpageScoreRowV1[];
};

function normalizePageUrl(raw: string): string | null {
  const href = normalizeUserUrlInput(raw);
  if (!href) return null;
  try {
    const u = new URL(href);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (isBlockedPreviewHost(u.hostname)) return null;
    u.hash = "";
    return u.href;
  } catch {
    return null;
  }
}

function sameOrigin(a: URL, b: URL): boolean {
  return a.protocol === b.protocol && a.hostname.toLowerCase() === b.hostname.toLowerCase();
}

export function extractSameOriginLinks(html: string, pageUrl: string, limit: number): string[] {
  const cap = Math.max(0, Math.min(20, Math.floor(limit)));
  const baseHref = normalizePageUrl(pageUrl);
  if (!baseHref || cap === 0) return [];
  let base: URL;
  try {
    base = new URL(baseHref);
  } catch {
    return [];
  }

  const found: string[] = [];
  const seen = new Set<string>([baseHref]);
  const re = /<a\b[^>]*\bhref\s*=\s*(["'])([^"']+)\1/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && found.length < cap) {
    const raw = m[2]?.trim() ?? "";
    if (!raw || raw.startsWith("#") || /^(?:mailto|tel|javascript|data):/i.test(raw)) continue;
    let abs: URL;
    try {
      abs = new URL(raw, base);
    } catch {
      continue;
    }
    if (!sameOrigin(abs, base)) continue;
    if (SKIP_EXT.test(abs.pathname)) continue;
    abs.hash = "";
    const href = abs.href;
    if (seen.has(href)) continue;
    seen.add(href);
    found.push(href);
  }
  return found;
}

export function subpageScoreRowFromSignals(
  url: string,
  signals: HtmlHeadSignalsV1 | null,
  error: string | null,
): SubpageScoreRowV1 {
  let path = url;
  try {
    path = new URL(url).pathname || "/";
  } catch {
    path = url;
  }
  const scored = scorePageSignals(signals);
  return {
    url,
    path,
    title: signals?.document_title ?? signals?.og_title ?? null,
    http_status: typeof signals?.http_status === "number" ? signals.http_status : null,
    score: scored?.score ?? null,
    band: scored?.band ?? null,
    reason_ids: scored?.reasons.map((row) => row.id) ?? [],
    error,
  };
}

export function parseSubpageScoresFromUnknown(raw: unknown): SubpageScoresV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.schema_version !== SUBPAGE_SCORES_SCHEMA_VERSION) return null;
  if (o.source !== SUBPAGE_SCORES_SOURCE) return null;
  if (typeof o.measured_at !== "string" || typeof o.origin !== "string") return null;
  if (!Array.isArray(o.pages)) return null;
  const pages: SubpageScoreRowV1[] = [];
  for (const row of o.pages) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.url !== "string") continue;
    pages.push({
      url: r.url,
      path: typeof r.path === "string" ? r.path : r.url,
      title: typeof r.title === "string" ? r.title : null,
      http_status: typeof r.http_status === "number" ? r.http_status : null,
      score: typeof r.score === "number" ? r.score : null,
      band:
        r.band === "good" || r.band === "review" || r.band === "attention" ? r.band : null,
      reason_ids: Array.isArray(r.reason_ids)
        ? r.reason_ids.filter((id): id is PageSignalReasonId => typeof id === "string")
        : [],
      error: typeof r.error === "string" ? r.error : null,
    });
  }
  return {
    schema_version: SUBPAGE_SCORES_SCHEMA_VERSION,
    source: SUBPAGE_SCORES_SOURCE,
    measured_at: o.measured_at,
    screenshot: false,
    origin: o.origin,
    max_pages: typeof o.max_pages === "number" ? o.max_pages : pages.length,
    pages,
  };
}
