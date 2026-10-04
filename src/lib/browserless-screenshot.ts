import {
  BROWSER_LIKE_ACCEPT_LANGUAGE,
  BROWSER_LIKE_USER_AGENT,
} from "@/lib/browser-fingerprint";
import { resolveGeoProxyUrl } from "@/lib/geo/proxy";
import { isValidObservationRegion, resolveBrowserlessResidentialTarget } from "@/lib/regions";
import {
  estimatedBrowserTimeUnits,
  parseMeasuredProxyBytes,
  summarizeCaptureCostAttempts,
  type CaptureCostAttemptStage,
  type CaptureCostAttemptV1,
} from "@/lib/observation-cost-signals";
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

/**
 * US 州の `proxyState` は Browserless Scale（500k+）向け。
 * 現行 Starter 180k は 401 "State level proxying not allowed" になるので既定オフ。
 * Scale に上げたあと `VIEWTRACE_BROWSERLESS_PROXY_STATE=1` で有効化。
 */
export function isBrowserlessProxyStateEnabled(): boolean {
  const raw = process.env.VIEWTRACE_BROWSERLESS_PROXY_STATE?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on";
}

export function buildBrowserlessResidentialSearchParams(
  regionRaw: string,
  includeState: boolean,
): URLSearchParams | null {
  const target = resolveBrowserlessResidentialTarget(regionRaw);
  if (!target) return null;
  const params = new URLSearchParams();
  params.set("proxy", "residential");
  params.set("proxyCountry", target.country);
  if (includeState && target.state) {
    params.set("proxyState", target.state);
  }
  params.set("proxySticky", "true");
  return params;
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
      /** true のときだけ Browserless に proxyState を付けた */
      residentialStateApplied?: boolean;
      viaExternalProxy?: boolean;
      /** 地理ルーティング失敗後、プロキシなしで再試行して成功した */
      usedRetryWithoutProxy?: boolean;
      durationMs?: number;
      estimatedTimeUnits?: number;
      proxyBytes?: number | null;
      proxyBytesMeasuredAttempts?: number;
      attempts?: number;
      attemptsLog?: CaptureCostAttemptV1[];
    }
  | {
      ok: false;
      error: string;
      upstreamStatus?: number;
      detail?: string;
      durationMs?: number;
      estimatedTimeUnits?: number;
      proxyBytes?: number | null;
      proxyBytesMeasuredAttempts?: number;
      attempts?: number;
      attemptsLog?: CaptureCostAttemptV1[];
      viaResidential?: boolean;
      residentialStateApplied?: boolean;
      viaExternalProxy?: boolean;
    };

function applyBrowserlessResidentialParams(
  endpoint: URL,
  regionRaw: string,
  includeState: boolean,
): boolean {
  const params = buildBrowserlessResidentialSearchParams(regionRaw, includeState);
  if (!params) return false;
  for (const [key, value] of params.entries()) {
    endpoint.searchParams.set(key, value);
  }
  return true;
}

function readProxyBytesFromHeaders(headers: Headers): number | null {
  const names = [
    "x-proxy-bytes",
    "x-browserless-proxy-bytes",
    "browserless-proxy-bytes",
    "x-proxy-bandwidth",
  ];
  for (const name of names) {
    const parsed = parseMeasuredProxyBytes(headers.get(name));
    if (parsed != null) return parsed;
  }
  return null;
}

export { estimatedBrowserTimeUnits };

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
  /** US 州を proxyState で指定するか。未指定ならプラン既定（Starter では false）。 */
  residentialState?: boolean;
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
  let residentialStateApplied = false;
  const includeState = params.residentialState === true;

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
    viaResidential = applyBrowserlessResidentialParams(endpointUrl, regionRaw, includeState);
    residentialStateApplied =
      viaResidential && includeState && Boolean(resolveBrowserlessResidentialTarget(regionRaw)?.state);
  }

  const browserlessEndpoint = endpointUrl.href;

  /**
   * Browserless v2 のペイロード。
   * - `userAgent.userAgent`: v2 では object 必須。既定の `HeadlessChrome/...` を上書き
   * - `setExtraHTTPHeaders.Accept-Language`: 日本語サイトが地域フィルタで弾くのを回避
   * - `gotoOptions.waitUntil`: ボット保護の challenge 解決やリダイレクト後の本体描画を待つ
   * - `options.fullPage`: Starter / Pro は全画面キャプチャ
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
  const startedAt = Date.now();
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
    return {
      ok: false,
      error: "browserless_network_error",
      durationMs: Date.now() - startedAt,
      proxyBytes: null,
      viaResidential,
      residentialStateApplied,
      viaExternalProxy,
    };
  } finally {
    clearTimeout(t);
  }
  const durationMs = Date.now() - startedAt;
  const proxyBytes = readProxyBytesFromHeaders(upstream.headers);

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "");
    return {
      ok: false,
      error: "browserless_error",
      upstreamStatus: upstream.status,
      detail: errText.slice(0, 500),
      durationMs,
      proxyBytes,
      viaResidential,
      residentialStateApplied,
      viaExternalProxy,
    };
  }

  const ct = upstream.headers.get("content-type") ?? "";
  if (!ct.includes("image")) {
    const text = await upstream.text().catch(() => "");
    return {
      ok: false,
      error: "unexpected_response",
      detail: text.slice(0, 500),
      durationMs,
      proxyBytes,
      viaResidential,
      residentialStateApplied,
      viaExternalProxy,
    };
  }

  const png = await upstream.arrayBuffer();
  return {
    ok: true,
    png,
    normalizedUrl: target,
    viaResidential,
    residentialStateApplied,
    viaExternalProxy,
    durationMs,
    proxyBytes,
  };
}

function shotToAttemptCost(
  shot: BrowserlessScreenshotResult,
  stage: CaptureCostAttemptStage,
  usedProxy: boolean,
): CaptureCostAttemptV1 {
  const durationMs = shot.durationMs ?? null;
  const billed = durationMs != null;
  return {
    stage,
    ok: shot.ok,
    billed,
    duration_ms: durationMs,
    estimated_time_units: durationMs != null ? estimatedBrowserTimeUnits(durationMs) : null,
    proxy_bytes: shot.proxyBytes ?? null,
    used_proxy: usedProxy,
    error: shot.ok ? null : shot.error,
  };
}

function withAttemptTotals(
  shot: BrowserlessScreenshotResult,
  log: CaptureCostAttemptV1[],
  extra: { usedRetryWithoutProxy?: boolean } = {},
): BrowserlessScreenshotResult {
  const sum = summarizeCaptureCostAttempts(log);
  const cost = {
    durationMs: sum.duration_ms ?? undefined,
    estimatedTimeUnits: sum.estimated_time_units ?? undefined,
    proxyBytes: sum.proxy_bytes,
    proxyBytesMeasuredAttempts: sum.proxy_bytes_measured_attempts,
    attempts: sum.attempts,
    attemptsLog: log,
  };
  if (shot.ok) {
    return { ...shot, ...extra, ...cost };
  }
  return { ...shot, ...extra, ...cost };
}

function geoRoutingRequested(regionRaw: string | undefined, disableProxy: boolean): boolean {
  if (disableProxy) return false;
  const hasGeoTemplate = Boolean(process.env.VIEWTRACE_GEO_PROXY_URL_TEMPLATE?.trim());
  const hasGeoFixed = Boolean(process.env.VIEWTRACE_GEO_PROXY_URL?.trim());
  if (hasGeoTemplate || hasGeoFixed) return true;
  if (!regionRaw?.trim()) return false;
  return isBrowserlessResidentialEnabled() && isValidObservationRegion(regionRaw);
}

function isStateProxyDenied(shot: BrowserlessScreenshotResult): boolean {
  if (shot.ok) return false;
  if (shot.upstreamStatus !== 401 && shot.upstreamStatus !== 400) return false;
  const detail = (shot.detail ?? "").toLowerCase();
  return detail.includes("state level") || detail.includes("proxying not allowed");
}

/**
 * 1 本ずつ試す（並列に投げない）。
 * 1. 州（opt-in かつ US-*）
 * 2. 国（Starter 180k の既定。US-CA は us のみ）
 * 3. プロキシなし
 */
export async function runBrowserlessScreenshotWithProxyRetry(params: {
  url: string;
  region?: string;
  fullPage: boolean;
}): Promise<BrowserlessScreenshotResult> {
  const log: CaptureCostAttemptV1[] = [];
  const geo = geoRoutingRequested(params.region, false);
  const hasUsState = Boolean(resolveBrowserlessResidentialTarget(params.region ?? "")?.state);
  const tryStateFirst = geo && hasUsState && isBrowserlessProxyStateEnabled();

  if (tryStateFirst) {
    const withState = await runBrowserlessScreenshot({ ...params, residentialState: true });
    log.push(shotToAttemptCost(withState, "state", true));
    if (withState.ok) return withAttemptTotals(withState, log, { usedRetryWithoutProxy: false });
    if (withState.error !== "browserless_error" && !isStateProxyDenied(withState)) {
      return withAttemptTotals(withState, log);
    }
  }

  if (geo) {
    const country = await runBrowserlessScreenshot({
      ...params,
      residentialState: false,
      disableProxy: false,
    });
    log.push(shotToAttemptCost(country, "country", true));
    if (country.ok) return withAttemptTotals(country, log, { usedRetryWithoutProxy: false });
    if (country.error !== "browserless_error") return withAttemptTotals(country, log);

    const retry = await runBrowserlessScreenshot({ ...params, disableProxy: true });
    log.push(shotToAttemptCost(retry, "no_proxy", false));
    if (retry.ok) return withAttemptTotals(retry, log, { usedRetryWithoutProxy: true });
    return withAttemptTotals(retry, log);
  }

  const shot = await runBrowserlessScreenshot(params);
  const usedProxy = Boolean(shot.viaResidential || shot.viaExternalProxy);
  log.push(shotToAttemptCost(shot, "direct", usedProxy));
  if (shot.ok) return withAttemptTotals(shot, log, { usedRetryWithoutProxy: false });
  return withAttemptTotals(shot, log);
}
