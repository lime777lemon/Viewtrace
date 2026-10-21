import {
  BROWSER_LIKE_ACCEPT_LANGUAGE,
  BROWSER_LIKE_USER_AGENT,
} from "@/lib/browser-fingerprint";
import { isBrowserlessConfigured } from "@/lib/browserless-screenshot";
import {
  applyBrowserlessGeoToUrl,
  browserlessPathEndpoint,
  withBrowserlessGeoRetry,
} from "@/lib/browserless-geo-endpoint";
import {
  HOMEPAGE_CLIP_DURATION_MS,
  HOMEPAGE_CLIP_MAX_BYTES,
} from "@/lib/observation-homepage-mode";
import { isBlockedPreviewHost, normalizeUserUrlInput } from "@/lib/url-preview";

export type BrowserlessScreencastResult =
  | {
      ok: true;
      bytes: ArrayBuffer;
      contentType: string;
      normalizedUrl: string;
      durationMs: number;
      viaResidential: boolean;
      viaExternalProxy: boolean;
      residentialStateApplied: boolean;
      usedRetryWithoutProxy: boolean;
    }
  | {
      ok: false;
      error: string;
      durationMs: number;
      detail?: string;
      viaResidential?: boolean;
      viaExternalProxy?: boolean;
      residentialStateApplied?: boolean;
    };

const SCROLL_WAIT_FN = `async () => {
  const end = Date.now() + ${HOMEPAGE_CLIP_DURATION_MS - 2000};
  while (Date.now() < end) {
    window.scrollBy(0, Math.min(140, Math.max(40, document.body.scrollHeight / 18)));
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return true;
}`;

function screencastEndpoints(): string[] {
  const paths = ["/chromium/screencast", "/screencast", "/chrome/screencast"];
  const out: string[] = [];
  for (const path of paths) {
    const href = browserlessPathEndpoint(path);
    if (href) out.push(href);
  }
  return out;
}

function isVideoContentType(ct: string): boolean {
  const lower = ct.toLowerCase();
  return lower.includes("video/") || lower.includes("webm") || lower.includes("mp4");
}

function inferContentType(ct: string): string {
  const lower = ct.toLowerCase();
  if (lower.includes("mp4")) return "video/mp4";
  return "video/webm";
}

async function runOnce(params: {
  url: string;
  region?: string;
  disableProxy?: boolean;
  residentialState?: boolean;
  residentialCity?: boolean;
  includeScroll?: boolean;
  endpointHref: string;
}): Promise<BrowserlessScreencastResult> {
  const target = normalizeUserUrlInput(params.url);
  if (!target) return { ok: false, error: "invalid_url", durationMs: 0 };
  try {
    const parsed = new URL(target);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: "invalid_url", durationMs: 0 };
    }
    if (isBlockedPreviewHost(parsed.hostname)) {
      return { ok: false, error: "forbidden_host", durationMs: 0 };
    }
  } catch {
    return { ok: false, error: "invalid_url", durationMs: 0 };
  }

  const decorated = applyBrowserlessGeoToUrl({
    href: params.endpointHref,
    regionRaw: params.region?.trim() ?? "",
    disableProxy: params.disableProxy,
    residentialState: params.residentialState,
    residentialCity: params.residentialCity,
  });
  if ("error" in decorated) {
    return { ok: false, error: decorated.error, durationMs: 0 };
  }

  const payload: Record<string, unknown> = {
    url: target,
    userAgent: { userAgent: BROWSER_LIKE_USER_AGENT },
    setExtraHTTPHeaders: { "Accept-Language": BROWSER_LIKE_ACCEPT_LANGUAGE },
    gotoOptions: { waitUntil: "networkidle2", timeout: 30_000 },
    viewport: { width: 1280, height: 800 },
    bestAttempt: true,
    waitForTimeout: HOMEPAGE_CLIP_DURATION_MS,
  };
  if (params.includeScroll !== false) {
    payload.waitForFunction = { fn: SCROLL_WAIT_FN, timeout: HOMEPAGE_CLIP_DURATION_MS + 3_000 };
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 70_000);
  const startedAt = Date.now();
  let upstream: Response;
  try {
    upstream = await fetch(decorated.href, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "video/webm, video/mp4, application/octet-stream, application/json",
      },
      body: JSON.stringify(payload),
      signal: ac.signal,
    });
  } catch {
    clearTimeout(timer);
    return {
      ok: false,
      error: "browserless_network_error",
      durationMs: Date.now() - startedAt,
      ...decorated.flags,
    };
  } finally {
    clearTimeout(timer);
  }

  const durationMs = Date.now() - startedAt;
  const ct = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return {
      ok: false,
      error: "browserless_error",
      durationMs,
      detail: detail.slice(0, 500),
      ...decorated.flags,
    };
  }

  if (!isVideoContentType(ct) && !ct.includes("octet-stream")) {
    const detail = await upstream.text().catch(() => "");
    return {
      ok: false,
      error: "unexpected_response",
      durationMs,
      detail: detail.slice(0, 500),
      ...decorated.flags,
    };
  }

  const bytes = await upstream.arrayBuffer();
  if (bytes.byteLength < 32) {
    return {
      ok: false,
      error: "empty_clip",
      durationMs,
      ...decorated.flags,
    };
  }
  if (bytes.byteLength > HOMEPAGE_CLIP_MAX_BYTES) {
    return {
      ok: false,
      error: "clip_too_large",
      durationMs,
      ...decorated.flags,
    };
  }

  return {
    ok: true,
    bytes,
    contentType: inferContentType(ct),
    normalizedUrl: target,
    durationMs,
    usedRetryWithoutProxy: params.disableProxy === true,
    ...decorated.flags,
  };
}

function retryable(result: BrowserlessScreencastResult): boolean {
  if (result.ok) return false;
  return result.error === "browserless_error" || result.error === "unexpected_response";
}

export async function runBrowserlessScreencastWithProxyRetry(params: {
  url: string;
  region?: string;
}): Promise<BrowserlessScreencastResult> {
  if (!isBrowserlessConfigured()) {
    return { ok: false, error: "browserless_not_configured", durationMs: 0 };
  }
  const endpoints = screencastEndpoints();
  if (endpoints.length === 0) {
    return { ok: false, error: "browserless_not_configured", durationMs: 0 };
  }

  let last: BrowserlessScreencastResult = {
    ok: false,
    error: "browserless_error",
    durationMs: 0,
  };
  for (const endpointHref of endpoints) {
    last = await withBrowserlessGeoRetry({
      region: params.region,
      run: (opts) => runOnce({ ...params, endpointHref, includeScroll: true, ...opts }),
      retryable,
    });
    if (last.ok) return last;
    if (last.error === "unexpected_response" || last.error === "browserless_error") {
      const withoutScroll = await withBrowserlessGeoRetry({
        region: params.region,
        run: (opts) => runOnce({ ...params, endpointHref, includeScroll: false, ...opts }),
        retryable,
      });
      if (withoutScroll.ok) return withoutScroll;
      last = withoutScroll;
    }
    if (last.error !== "browserless_error" && last.error !== "unexpected_response") {
      return last;
    }
  }
  return last;
}
