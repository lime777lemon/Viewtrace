import {
  BROWSER_LIKE_ACCEPT_LANGUAGE,
  BROWSER_LIKE_USER_AGENT,
} from "@/lib/browser-fingerprint";
import { resolveGeoProxyUrl } from "@/lib/geo/proxy";
import { isValidObservationRegion } from "@/lib/regions";
import { isBlockedPreviewHost, normalizeUserUrlInput } from "@/lib/url-preview";

const DEFAULT_BROWSERLESS_SCREENSHOT = "https://production-sfo.browserless.io/screenshot";

export function isBrowserlessConfigured(): boolean {
  return Boolean(process.env.BROWSERLESS_TOKEN?.trim());
}

function browserlessScreenshotEndpointWithToken(): string | null {
  const token = process.env.BROWSERLESS_TOKEN?.trim();
  if (!token) return null;
  try {
    const parsed = new URL(
      process.env.BROWSERLESS_SCREENSHOT_URL?.trim() || DEFAULT_BROWSERLESS_SCREENSHOT,
    );
    parsed.searchParams.set("token", token);
    return parsed.href;
  } catch {
    return null;
  }
}

export type BrowserlessScreenshotResult =
  | { ok: true; png: ArrayBuffer; normalizedUrl: string }
  | {
      ok: false;
      error: string;
      upstreamStatus?: number;
      detail?: string;
    };

/**
 * Browserless の /screenshot を呼び、PNG を返す（Bright Data は externalProxyServer クエリで連携）。
 */
export async function runBrowserlessScreenshot(params: {
  url: string;
  region?: string;
  fullPage: boolean;
  disableProxy?: boolean;
}): Promise<BrowserlessScreenshotResult> {
  const endpoint = browserlessScreenshotEndpointWithToken();
  if (!endpoint) {
    return { ok: false, error: "browserless_not_configured" };
  }

  const target = normalizeUserUrlInput(params.url);
  if (!target) {
    return { ok: false, error: "invalid_url" };
  }

  try {
    const parsed = new URL(target);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: "invalid_url" };
    }
    if (isBlockedPreviewHost(parsed.hostname)) {
      return { ok: false, error: "forbidden_host" };
    }
  } catch {
    return { ok: false, error: "invalid_url" };
  }

  const hasGeoTemplate = Boolean(process.env.VIEWTRACE_GEO_PROXY_URL_TEMPLATE?.trim());
  const hasGeoFixed = Boolean(process.env.VIEWTRACE_GEO_PROXY_URL?.trim());
  const wantsGeoProxy = hasGeoTemplate || hasGeoFixed;
  const disableProxy = params.disableProxy === true;

  const regionRaw = params.region?.trim() ?? "";

  if (hasGeoTemplate && !disableProxy) {
    if (!regionRaw) {
      return { ok: false, error: "region_required" };
    }
    if (!isValidObservationRegion(regionRaw)) {
      return { ok: false, error: "invalid_region" };
    }
  }

  const geoProxyForBrowserless = disableProxy
    ? null
    : resolveGeoProxyUrl(hasGeoTemplate ? regionRaw : regionRaw || undefined);
  if (wantsGeoProxy && !disableProxy && !geoProxyForBrowserless) {
    return { ok: false, error: "geo_proxy_misconfigured" };
  }

  let browserlessEndpoint = endpoint;
  if (geoProxyForBrowserless) {
    const u = new URL(endpoint);
    u.searchParams.set("externalProxyServer", geoProxyForBrowserless);
    browserlessEndpoint = u.href;
  }

  /**
   * Browserless v2 のペイロード。
   * - `userAgent.userAgent`: v2 では object 必須。既定の `HeadlessChrome/...` を上書き
   * - `setExtraHTTPHeaders.Accept-Language`: 日本語サイトが地域フィルタで弾くのを回避
   * - `gotoOptions.waitUntil`: ボット保護の challenge 解決やリダイレクト後の本体描画を待つ
   * - `options.fullPage`: 既存仕様どおり Pro 等で全画面キャプチャ
   */
  const payload: Record<string, unknown> = {
    url: target,
    userAgent: { userAgent: BROWSER_LIKE_USER_AGENT },
    setExtraHTTPHeaders: { "Accept-Language": BROWSER_LIKE_ACCEPT_LANGUAGE },
    gotoOptions: { waitUntil: "networkidle2", timeout: 30_000 },
  };
  if (params.fullPage) {
    payload.options = { fullPage: true };
  }

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 55_000);
  let upstream: Response;
  try {
    upstream = await fetch(browserlessEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "image/png, application/json" },
      body: JSON.stringify(payload),
      signal: ac.signal,
    });
  } catch {
    clearTimeout(t);
    return { ok: false, error: "browserless_network_error" };
  } finally {
    clearTimeout(t);
  }

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "");
    return {
      ok: false,
      error: "browserless_error",
      upstreamStatus: upstream.status,
      detail: errText.slice(0, 500),
    };
  }

  const ct = upstream.headers.get("content-type") ?? "";
  if (!ct.includes("image")) {
    const text = await upstream.text().catch(() => "");
    return {
      ok: false,
      error: "unexpected_response",
      detail: text.slice(0, 500),
    };
  }

  const png = await upstream.arrayBuffer();
  return { ok: true, png, normalizedUrl: target };
}

/** Browserless が外部プロキシ非対応プラン等で 401 等を返したとき、プロキシなしで 1 回だけ再試行する */
export async function runBrowserlessScreenshotWithProxyRetry(params: {
  url: string;
  region?: string;
  fullPage: boolean;
}): Promise<BrowserlessScreenshotResult> {
  let shot = await runBrowserlessScreenshot(params);
  if (
    !shot.ok &&
    shot.error === "browserless_error" &&
    typeof shot.detail === "string" &&
    /third-party proxy/i.test(shot.detail)
  ) {
    shot = await runBrowserlessScreenshot({ ...params, disableProxy: true });
  }
  return shot;
}
