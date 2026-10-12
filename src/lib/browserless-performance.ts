import { resolveGeoProxyUrl } from "@/lib/geo/proxy";
import {
  buildBrowserlessResidentialSearchParams,
  isBrowserlessConfigured,
  isBrowserlessProxyStateEnabled,
  isBrowserlessResidentialEnabled,
} from "@/lib/browserless-screenshot";
import { isValidObservationRegion, resolveBrowserlessResidentialTarget } from "@/lib/regions";
import { parseMeasuredProxyBytes } from "@/lib/observation-cost-signals";
import { isBlockedPreviewHost, normalizeUserUrlInput } from "@/lib/url-preview";
import { parseLabCwvFromLighthouse, type LabCwvV1 } from "@/lib/observation-lab-cwv";

const DEFAULT_BROWSERLESS_PERFORMANCE = "https://production-sfo.browserless.io/performance";
const PERFORMANCE_TIMEOUT_MS = 90_000;

export type BrowserlessPerformanceResult =
  | { ok: true; labCwv: LabCwvV1; durationMs: number; proxyBytes: number | null }
  | { ok: false; error: string; durationMs: number; proxyBytes: number | null; detail?: string };

function performanceEndpointWithToken(): string | null {
  const token = process.env.BROWSERLESS_TOKEN?.trim();
  if (!token) return null;
  const screenshot = process.env.BROWSERLESS_SCREENSHOT_URL?.trim();
  let href = DEFAULT_BROWSERLESS_PERFORMANCE;
  if (screenshot) {
    try {
      const parsed = new URL(screenshot);
      parsed.pathname = parsed.pathname.replace(/\/screenshot\/?$/, "/performance");
      if (!/performance/i.test(parsed.pathname)) parsed.pathname = "/performance";
      href = parsed.origin + parsed.pathname;
    } catch {
      href = DEFAULT_BROWSERLESS_PERFORMANCE;
    }
  }
  try {
    const endpoint = new URL(href);
    endpoint.searchParams.set("token", token);
    return endpoint.href;
  } catch {
    return null;
  }
}

function applyResidential(
  endpoint: URL,
  regionRaw: string,
  includeState: boolean,
  includeCity: boolean,
): boolean {
  const params = buildBrowserlessResidentialSearchParams(regionRaw, includeState, includeCity);
  if (!params) return false;
  for (const [key, value] of params.entries()) {
    endpoint.searchParams.set(key, value);
  }
  return true;
}

function readProxyBytes(headers: Headers): number | null {
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

async function runOnce(params: {
  url: string;
  region?: string;
  disableProxy?: boolean;
  residentialState?: boolean;
  residentialCity?: boolean;
}): Promise<BrowserlessPerformanceResult> {
  const endpointHref = performanceEndpointWithToken();
  if (!endpointHref) return { ok: false, error: "browserless_not_configured", durationMs: 0, proxyBytes: null };

  const target = normalizeUserUrlInput(params.url);
  if (!target) return { ok: false, error: "invalid_url", durationMs: 0, proxyBytes: null };

  try {
    const parsed = new URL(target);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: "invalid_url", durationMs: 0, proxyBytes: null };
    }
    if (isBlockedPreviewHost(parsed.hostname)) {
      return { ok: false, error: "forbidden_host", durationMs: 0, proxyBytes: null };
    }
  } catch {
    return { ok: false, error: "invalid_url", durationMs: 0, proxyBytes: null };
  }

  const disableProxy = params.disableProxy === true;
  const regionRaw = params.region?.trim() ?? "";
  const hasGeoTemplate = Boolean(process.env.VIEWTRACE_GEO_PROXY_URL_TEMPLATE?.trim());
  const hasGeoFixed = Boolean(process.env.VIEWTRACE_GEO_PROXY_URL?.trim());
  const wantsExternal = hasGeoTemplate || hasGeoFixed;
  const geoProxy = disableProxy
    ? null
    : resolveGeoProxyUrl(hasGeoTemplate ? regionRaw : regionRaw || undefined);
  if (wantsExternal && !disableProxy && !geoProxy) {
    return { ok: false, error: "geo_proxy_misconfigured", durationMs: 0, proxyBytes: null };
  }

  const endpoint = new URL(endpointHref);
  endpoint.searchParams.set("timeout", String(PERFORMANCE_TIMEOUT_MS));
  if (geoProxy) {
    endpoint.searchParams.set("externalProxyServer", geoProxy);
  } else if (
    !disableProxy &&
    isBrowserlessResidentialEnabled() &&
    regionRaw &&
    isValidObservationRegion(regionRaw)
  ) {
    applyResidential(
      endpoint,
      regionRaw,
      params.residentialState === true,
      params.residentialCity === true,
    );
  }

  /** REST `/performance` は `url` と任意の `config` / `budgets` だけ。他は additional properties で 400。 */
  const payload: Record<string, unknown> = {
    url: target,
    config: {
      extends: "lighthouse:default",
      settings: {
        onlyCategories: ["performance"],
      },
    },
  };

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), PERFORMANCE_TIMEOUT_MS);
  const startedAt = Date.now();
  let upstream: Response;
  try {
    upstream = await fetch(endpoint.href, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: ac.signal,
    });
  } catch {
    clearTimeout(timer);
    return {
      ok: false,
      error: "browserless_network_error",
      durationMs: Date.now() - startedAt,
      proxyBytes: null,
    };
  } finally {
    clearTimeout(timer);
  }

  const durationMs = Date.now() - startedAt;
  const proxyBytes = readProxyBytes(upstream.headers);
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return {
      ok: false,
      error: "browserless_error",
      durationMs,
      proxyBytes,
      detail: detail.slice(0, 500),
    };
  }

  let raw: unknown;
  try {
    raw = await upstream.json();
  } catch {
    return { ok: false, error: "unexpected_response", durationMs, proxyBytes };
  }

  const labCwv = parseLabCwvFromLighthouse({
    raw,
    url: target,
    measuredAt: new Date().toISOString(),
    durationMs,
    proxyBytes,
  });
  if (labCwv.error === "no_audits") {
    return { ok: false, error: "no_audits", durationMs, proxyBytes };
  }
  return { ok: true, labCwv, durationMs, proxyBytes };
}

function geoRequested(regionRaw: string | undefined, disableProxy: boolean): boolean {
  if (disableProxy) return false;
  if (process.env.VIEWTRACE_GEO_PROXY_URL_TEMPLATE?.trim() || process.env.VIEWTRACE_GEO_PROXY_URL?.trim()) {
    return true;
  }
  if (!regionRaw?.trim()) return false;
  return isBrowserlessResidentialEnabled() && isValidObservationRegion(regionRaw);
}

function retryableDeny(result: BrowserlessPerformanceResult): boolean {
  if (result.ok) return false;
  return result.error === "browserless_error";
}

/**
 * 撮影と同じ順: 都市 →（任意）州 → 国 → プロキシなし。
 * Observed geo は書き換えない。ラボ計測だけ。
 */
export async function runBrowserlessPerformanceWithProxyRetry(params: {
  url: string;
  region?: string;
}): Promise<BrowserlessPerformanceResult> {
  if (!isBrowserlessConfigured()) {
    return { ok: false, error: "browserless_not_configured", durationMs: 0, proxyBytes: null };
  }

  const geo = geoRequested(params.region, false);
  const target = resolveBrowserlessResidentialTarget(params.region ?? "");
  const hasUsState = Boolean(target?.stateCode);
  const tryCity = geo && hasUsState && Boolean(target?.city);
  const tryState = geo && hasUsState && isBrowserlessProxyStateEnabled() && !tryCity;

  if (tryCity) {
    const city = await runOnce({ ...params, residentialCity: true, residentialState: false });
    if (city.ok || !retryableDeny(city)) return city;
  }
  if (tryState) {
    const state = await runOnce({ ...params, residentialState: true, residentialCity: false });
    if (state.ok || !retryableDeny(state)) return state;
  }
  if (geo) {
    const country = await runOnce({
      ...params,
      residentialState: false,
      residentialCity: false,
      disableProxy: false,
    });
    if (country.ok || !retryableDeny(country)) return country;
    return runOnce({ ...params, disableProxy: true });
  }
  return runOnce(params);
}
