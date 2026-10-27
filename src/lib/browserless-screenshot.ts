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
import { runStateMeasurementSession, type StateMeasurementResult } from "@/lib/state-measurement-session";
import {
  ATTR,
  browserlessResultAttrs,
  markSpanResult,
  requestedStateAttr,
  setSpanAttrs,
  urlHostAttr,
  withSpan,
} from "@/lib/otel/trace";

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
 * US 州は proxyState と出口確認を同じセッションで行う。
 * 確認できないときは国単位で残し、no-proxy には落とさない。
 * `VIEWTRACE_BROWSERLESS_PROXY_STATE=0` で州試行をしない。
 */
export function isBrowserlessProxyStateEnabled(): boolean {
  const raw = process.env.VIEWTRACE_BROWSERLESS_PROXY_STATE?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off") return false;
  return true;
}

export function buildBrowserlessResidentialSearchParams(
  regionRaw: string,
  includeState: boolean,
  includeCity = false,
): URLSearchParams | null {
  const target = resolveBrowserlessResidentialTarget(regionRaw);
  if (!target) return null;
  const params = new URLSearchParams();
  params.set("proxy", "residential");
  params.set("proxyCountry", target.country);
  if (includeState && target.state) {
    params.set("proxyState", target.state);
  } else if (includeCity && target.city) {
    params.set("proxyCity", target.city);
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
      /** true のときだけ、同じセッションの出口州が requested state と一致した */
      residentialStateApplied?: boolean;
      stateVerified?: boolean;
      fallbackLevel?: "state" | "country" | null;
      geoAttempts?: number;
      stateTargetingRejected?: boolean;
      verifiedMeasurements?: Array<"screenshot" | "interaction" | "journey" | "lab_cwv">;
      proxyProvider?: "browserless" | "bright_data" | "decodo" | "custom" | null;
      interaction?: unknown;
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
      stateVerified?: boolean;
      fallbackLevel?: "state" | "country" | null;
      geoAttempts?: number;
      stateTargetingRejected?: boolean;
      verifiedMeasurements?: Array<"screenshot" | "interaction" | "journey" | "lab_cwv">;
      proxyProvider?: "browserless" | "bright_data" | "decodo" | "custom" | null;
      interaction?: unknown;
      viaExternalProxy?: boolean;
    };

function applyBrowserlessResidentialParams(
  endpoint: URL,
  regionRaw: string,
  includeState: boolean,
  includeCity = false,
): boolean {
  const params = buildBrowserlessResidentialSearchParams(regionRaw, includeState, includeCity);
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
 * - 内蔵 residential: `proxy=residential` + `proxyCountry`（US 州は `proxyState`、だめなら `proxyCity`）
 */
type BrowserlessScreenshotParams = {
  url: string;
  region?: string;
  fullPage: boolean;
  viewport?: { width: number; height: number; isMobile: boolean; hasTouch: boolean };
  disableProxy?: boolean;
  /** US 州を proxyState で指定するか。未指定なら、州を選んだ Observation では true。 */
  residentialState?: boolean;
  /** US 州の代表都市を proxyCity で指定するか。 */
  residentialCity?: boolean;
};

export async function runBrowserlessScreenshot(
  params: BrowserlessScreenshotParams,
): Promise<BrowserlessScreenshotResult> {
  return withSpan(
    "browserless.screenshot",
    {
      [ATTR.operation]: "screenshot",
      [ATTR.urlHost]: urlHostAttr(params.url),
      [ATTR.regionRequested]: params.region ?? null,
      [ATTR.stateRequested]: requestedStateAttr(params.region),
      [ATTR.fullPage]: params.fullPage,
      "viewtrace.proxy.disabled": params.disableProxy === true,
      "viewtrace.proxy.state_requested": params.residentialState === true,
      "viewtrace.proxy.city_requested": params.residentialCity === true,
    },
    async (span) => {
      const result = await runBrowserlessScreenshotOnce(params);
      setSpanAttrs(span, browserlessResultAttrs(result));
      markSpanResult(span, result);
      return result;
    },
  );
}

async function runBrowserlessScreenshotOnce(
  params: BrowserlessScreenshotParams,
): Promise<BrowserlessScreenshotResult> {
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
  const includeCity = params.residentialCity === true;
  const residentialTarget = resolveBrowserlessResidentialTarget(regionRaw);

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
    viaResidential = applyBrowserlessResidentialParams(
      endpointUrl,
      regionRaw,
      includeState,
      includeCity,
    );
    residentialStateApplied =
      viaResidential &&
      Boolean(residentialTarget?.stateCode) &&
      ((includeState && Boolean(residentialTarget?.state)) ||
        (includeCity && Boolean(residentialTarget?.city)));
  }

  const browserlessEndpoint = endpointUrl.href;

  const payload: Record<string, unknown> = {
    url: target,
    userAgent: { userAgent: BROWSER_LIKE_USER_AGENT },
    setExtraHTTPHeaders: { "Accept-Language": BROWSER_LIKE_ACCEPT_LANGUAGE },
    gotoOptions: { waitUntil: "networkidle2", timeout: 30_000 },
  };
  if (params.viewport) {
    payload.viewport = {
      width: params.viewport.width,
      height: params.viewport.height,
      deviceScaleFactor: 1,
      isMobile: params.viewport.isMobile,
      hasTouch: params.viewport.hasTouch,
    };
  }
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

/**
 * 1 本ずつ試す（並列に投げない）。
 * US 州: proxyState で出口を確認し、一致した同じセッションで撮影。最大3回。
 * 確認できなければ国単位の residential を1回。no-proxy には落とさない。
 * 州以外: 国、だめならプロキシなし。
 */
export function browserlessShotFromStateSession(
  session: StateMeasurementResult,
  normalizedUrl: string,
): BrowserlessScreenshotResult {
  const shared = {
    stateVerified: session.stateVerified,
    fallbackLevel: session.fallbackLevel,
    geoAttempts: session.geoAttempts,
    stateTargetingRejected: session.stateTargetingRejected,
    verifiedMeasurements: session.verifiedMeasurements,
    interaction: session.interaction,
    viaResidential: session.viaResidential,
    viaExternalProxy: session.viaExternalProxy,
    proxyProvider: session.provider === "decodo" ? "decodo" as const : undefined,
    residentialStateApplied: session.stateVerified,
    durationMs: session.durationMs,
    proxyBytes: session.proxyBytes,
    usedRetryWithoutProxy: false as const,
  };
  if (session.ok && session.png) {
    return { ok: true, png: session.png, normalizedUrl, ...shared };
  }
  return { ok: false, error: session.error || "state_not_confirmed", upstreamStatus: session.upstreamStatus, ...shared };
}

export async function runBrowserlessScreenshotWithProxyRetry(params: {
  url: string;
  region?: string;
  fullPage: boolean;
  viewport?: { width: number; height: number; isMobile: boolean; hasTouch: boolean };
  interaction?: Record<string, unknown>;
}): Promise<BrowserlessScreenshotResult> {
  const log: CaptureCostAttemptV1[] = [];
  const geo = geoRoutingRequested(params.region, false);
  const target = resolveBrowserlessResidentialTarget(params.region ?? "");
  const hasUsState = Boolean(target?.stateCode);
  const tryState = geo && hasUsState && isBrowserlessProxyStateEnabled();

  if (tryState && params.region) {
    const session = await runStateMeasurementSession({
      url: params.url,
      region: params.region,
      fullPage: params.fullPage,
      viewport: params.viewport ? { width: params.viewport.width, height: params.viewport.height } : undefined,
      measures: params.interaction ? ["screenshot", "interaction"] : ["screenshot"],
      interaction: params.interaction,
      countryFallback: true,
    });
    const shot = browserlessShotFromStateSession(session, params.url);
    log.push(shotToAttemptCost(shot, session.fallbackLevel === "state" ? "state" : "country", true));
    if (shot.ok) return withAttemptTotals(shot, log, { usedRetryWithoutProxy: false });
    // State exit did not return a PNG. Keep a country-level residential screenshot.
    const country = await runBrowserlessScreenshot({
      ...params,
      residentialState: false,
      residentialCity: false,
      disableProxy: false,
    });
    log.push(shotToAttemptCost(country, "country", true));
    return withAttemptTotals(country, log, { usedRetryWithoutProxy: false });
  }

  if (geo) {
    const country = await runBrowserlessScreenshot({
      ...params,
      residentialState: false,
      residentialCity: false,
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
