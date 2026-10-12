import { BROWSER_LIKE_HEADERS } from "@/lib/browser-fingerprint";
import { getGeoProxyAgent } from "@/lib/geo/proxy";
import {
  extractHtmlHeadSignals,
  isBlockedPreviewHost,
  normalizeUserUrlInput,
} from "@/lib/url-preview";
import { runUrlPreviewFetch } from "@/lib/url-preview-fetch";
import {
  extractSameOriginLinks,
  subpageScoreRowFromSignals,
  SUBPAGE_SCORES_SCHEMA_VERSION,
  SUBPAGE_SCORES_SOURCE,
  type SubpageScoresV1,
} from "@/lib/observation-subpages";

const DISCOVERY_HTML_BYTES = 400_000;
const DISCOVERY_TIMEOUT_MS = 12_000;

async function readHtmlBytes(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<string> {
  if (!body) return "";
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    while (buf.length < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
  return buf;
}

async function fetchDiscoveryHtml(
  url: string,
  regionValue?: string,
): Promise<{ html: string; finalUrl: string } | { error: string }> {
  const target = normalizeUserUrlInput(url);
  if (!target) return { error: "invalid_url" };
  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return { error: "invalid_url" };
  }
  if (isBlockedPreviewHost(parsed.hostname)) return { error: "forbidden_host" };

  const proxy = regionValue ? getGeoProxyAgent(regionValue) : null;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), DISCOVERY_TIMEOUT_MS);
  try {
    const res = await fetch(target, {
      redirect: "follow",
      signal: ac.signal,
      ...(proxy?.dispatcher ? { dispatcher: proxy.dispatcher } : {}),
      headers: BROWSER_LIKE_HEADERS,
    });
    const finalUrl = res.url || target;
    try {
      if (isBlockedPreviewHost(new URL(finalUrl).hostname)) return { error: "forbidden_redirect" };
    } catch {
      return { error: "invalid_response" };
    }
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
      return { error: "not_html" };
    }
    const html = await readHtmlBytes(res.body, DISCOVERY_HTML_BYTES);
    return { html, finalUrl };
  } catch {
    return { error: "fetch_failed" };
  } finally {
    clearTimeout(timer);
  }
}

export async function runSameOriginSubpageScores(input: {
  pageUrl: string;
  regionValue?: string;
  maxPages: number;
}): Promise<SubpageScoresV1 | { error: string }> {
  const originUrl = normalizeUserUrlInput(input.pageUrl);
  if (!originUrl) return { error: "invalid_url" };
  let origin: URL;
  try {
    origin = new URL(originUrl);
  } catch {
    return { error: "invalid_url" };
  }

  const discovered = await fetchDiscoveryHtml(originUrl, input.regionValue);
  if ("error" in discovered) return discovered;
  const links = extractSameOriginLinks(discovered.html, discovered.finalUrl, input.maxPages);

  const pages = [];
  for (const href of links) {
    const preview = await runUrlPreviewFetch(href, {
      screenshotFallback: false,
      regionValue: input.regionValue,
      retryWithoutProxyOnFailure: true,
    });
    if (!preview.ok) {
      pages.push(subpageScoreRowFromSignals(href, extractHtmlHeadSignals("", href, null), preview.error));
      continue;
    }
    pages.push(subpageScoreRowFromSignals(href, preview.htmlSignals, null));
  }

  return {
    schema_version: SUBPAGE_SCORES_SCHEMA_VERSION,
    source: SUBPAGE_SCORES_SOURCE,
    measured_at: new Date().toISOString(),
    screenshot: false,
    origin: origin.origin,
    max_pages: input.maxPages,
    pages,
  };
}
