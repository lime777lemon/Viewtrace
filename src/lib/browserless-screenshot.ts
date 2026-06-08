import {
  BROWSER_LIKE_ACCEPT_LANGUAGE,
  BROWSER_LIKE_USER_AGENT,
} from "@/lib/browser-fingerprint";
import { resolveGeoProxyUrl } from "@/lib/geo/proxy";
import { isValidObservationRegion, resolveBrowserlessResidentialTarget } from "@/lib/regions";
import { isBlockedPreviewHost, normalizeUserUrlInput } from "@/lib/url-preview";

const DEFAULT_BROWSERLESS_SCREENSHOT = "https://production-sfo.browserless.io/screenshot";

export function isBrowserlessConfigured(): boolean {
  return Boolean(process.env.BROWSERLESS_TOKEN?.trim());
}

/** 内蔵 residential（`proxy=residential`）を region 指定時に使う。`VIEWTRACE_BROWSERLESS_RESIDENTIAL=0` で無効。 */
export function isBrowserlessResidentialEnabled(): boolean {
  const raw = process.env.VIEWTRACE_BROWSERLESS_RESIDENTIAL?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off") return false;
  return true;
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
  | {
      ok: true;
      png: ArrayBuffer;
      normalizedUrl: string;
      viaResidential?: boolean;
      viaExternalProxy?: boolean;
      /** 地理ルーティング失敗後、プロキシなしで再試行して成功した */
      usedRetryWithoutProxy?: boolean;
    }
  | {
      ok: false;
      error: string;
      upstreamStatus?: number;
      detail?: string;
    };

function applyBrowserlessResidentialParams(endpoint: URL, regionRaw: string): boolean {
  const target = resolveBrowserlessResidentialTarget(regionRaw);
  if (!target) return false;
  endpoint.searchParams.set("proxy", "residential");
  endpoint.searchParams.set("proxyCountry", target.country);
  if (target.state) {
    endpoint.searchParams.set("proxyState", target.state);
  }
  endpoint.searchParams.set("proxySticky", "true");
  return true;
}

/**
 * Browserless の /screenshot を呼び、PNG を返す。
 * - 内蔵 residential: `proxy=residential` + `proxyCountry` (+ US 州は `proxyState`)
 * - 任意: `VIEWTRACE_GEO_PROXY_*` があれば `externalProxyServer`（Bright Data 等）を優先
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
  const wantsExternalGeoProxy = hasGeoTemplate || hasGeoFixed;
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
  if (wantsExternalGeoProxy && !disableProxy && !geoProxyForBrowserless) {
    return { ok: false, error: "geo_proxy_misconfigured" };
  }

  let viaResidential = false;
  let viaExternalProxy = false;

  const endpointUrl = new URL(endpoint);
  if (geoProxyForBrowserless) {
    endpointUrl.searchParams.set("externalProxyServer", geoProxyForBrowserless);
    viaExternalProxy = true;
  } else if (
    !disableProxy &&
    isBrowserlessResidentialEnabled() &&
    regionRaw &&
    isValidObservationRegion(regionRaw)
  ) {
    viaResidential = applyBrowserlessResidentialParams(endpointUrl, regionRaw);
  }

  const browserlessEndpoint = endpointUrl.href;

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
  return {
    ok: true,
    png,
    normalizedUrl: target,
    viaResidential,
    viaExternalProxy,
  };
}

function geoRoutingRequested(regionRaw: string | undefined, disableProxy: boolean): boolean {
  if (disableProxy) return false;
  const hasGeoTemplate = Boolean(process.env.VIEWTRACE_GEO_PROXY_URL_TEMPLATE?.trim());
  const hasGeoFixed = Boolean(process.env.VIEWTRACE_GEO_PROXY_URL?.trim());
  if (hasGeoTemplate || hasGeoFixed) return true;
  if (!regionRaw?.trim()) return false;
  return isBrowserlessResidentialEnabled() && isValidObservationRegion(regionRaw);
}

/** 地理ルーティング（内蔵 residential または外部プロキシ）失敗時、プロキシなしで 1 回だけ再試行する */
export async function runBrowserlessScreenshotWithProxyRetry(params: {
  url: string;
  region?: string;
  fullPage: boolean;
}): Promise<BrowserlessScreenshotResult> {
  const shot = await runBrowserlessScreenshot(params);
  if (
    !shot.ok &&
    shot.error === "browserless_error" &&
    geoRoutingRequested(params.region, false)
  ) {
    const retry = await runBrowserlessScreenshot({ ...params, disableProxy: true });
    if (retry.ok) {
      return { ...retry, usedRetryWithoutProxy: true };
    }
    return retry;
  }
  if (shot.ok) {
    return { ...shot, usedRetryWithoutProxy: false };
  }
  return shot;
}
