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
import { HOMEPAGE_LIVE_TTL_MS } from "@/lib/observation-homepage-mode";
import { isBlockedPreviewHost, normalizeUserUrlInput } from "@/lib/url-preview";

export type BrowserlessLiveResult =
  | {
      ok: true;
      liveUrl: string;
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

function bqlEndpoint(): string | null {
  return (
    browserlessPathEndpoint("/chromium/bql") ??
    browserlessPathEndpoint("/bql") ??
    browserlessPathEndpoint("/chromium/stealth/bql")
  );
}

function liveMutation(url: string): string {
  const escaped = JSON.stringify(url);
  return `mutation {
  goto(url: ${escaped}, waitUntil: networkIdle) {
    status
  }
  liveURL(timeout: ${HOMEPAGE_LIVE_TTL_MS}) {
    liveURL
  }
}`;
}

function readLiveUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const live = data.liveURL;
  if (typeof live === "string" && /^https?:\/\//i.test(live)) return live;
  if (live && typeof live === "object") {
    const nested = (live as Record<string, unknown>).liveURL;
    if (typeof nested === "string" && /^https?:\/\//i.test(nested)) return nested;
  }
  return null;
}

async function runOnce(params: {
  url: string;
  region?: string;
  disableProxy?: boolean;
  residentialState?: boolean;
  residentialCity?: boolean;
}): Promise<BrowserlessLiveResult> {
  const endpointHref = bqlEndpoint();
  if (!endpointHref) {
    return { ok: false, error: "browserless_not_configured", durationMs: 0 };
  }

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
    href: endpointHref,
    regionRaw: params.region?.trim() ?? "",
    disableProxy: params.disableProxy,
    residentialState: params.residentialState,
    residentialCity: params.residentialCity,
  });
  if ("error" in decorated) {
    return { ok: false, error: decorated.error, durationMs: 0 };
  }

  const endpoint = new URL(decorated.href);
  endpoint.searchParams.set("timeout", String(HOMEPAGE_LIVE_TTL_MS));
  endpoint.searchParams.set("ttl", String(HOMEPAGE_LIVE_TTL_MS));

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 45_000);
  const startedAt = Date.now();
  let upstream: Response;
  try {
    upstream = await fetch(endpoint.href, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        query: liveMutation(target),
        userAgent: { userAgent: BROWSER_LIKE_USER_AGENT },
        setExtraHTTPHeaders: { "Accept-Language": BROWSER_LIKE_ACCEPT_LANGUAGE },
      }),
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
  const detail = await upstream.text().catch(() => "");
  if (!upstream.ok) {
    return {
      ok: false,
      error: "browserless_error",
      durationMs,
      detail: detail.slice(0, 500),
      ...decorated.flags,
    };
  }

  let payload: unknown = detail;
  try {
    payload = JSON.parse(detail) as unknown;
  } catch {
    return {
      ok: false,
      error: "unexpected_response",
      durationMs,
      detail: detail.slice(0, 500),
      ...decorated.flags,
    };
  }

  const liveUrl = readLiveUrl(payload);
  if (!liveUrl) {
    return {
      ok: false,
      error: "live_url_missing",
      durationMs,
      detail: detail.slice(0, 500),
      ...decorated.flags,
    };
  }

  return {
    ok: true,
    liveUrl,
    normalizedUrl: target,
    durationMs,
    usedRetryWithoutProxy: params.disableProxy === true,
    ...decorated.flags,
  };
}

function retryable(result: BrowserlessLiveResult): boolean {
  if (result.ok) return false;
  return result.error === "browserless_error" || result.error === "live_url_missing";
}

export async function runBrowserlessLiveWithProxyRetry(params: {
  url: string;
  region?: string;
}): Promise<BrowserlessLiveResult> {
  if (!isBrowserlessConfigured()) {
    return { ok: false, error: "browserless_not_configured", durationMs: 0 };
  }
  return withBrowserlessGeoRetry({
    region: params.region,
    run: (opts) => runOnce({ ...params, ...opts }),
    retryable,
  });
}
