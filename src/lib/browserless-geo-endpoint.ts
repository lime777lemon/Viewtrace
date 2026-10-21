import { resolveGeoProxyUrl } from "@/lib/geo/proxy";
import {
  buildBrowserlessResidentialSearchParams,
  isBrowserlessProxyStateEnabled,
  isBrowserlessResidentialEnabled,
} from "@/lib/browserless-screenshot";
import { isValidObservationRegion, resolveBrowserlessResidentialTarget } from "@/lib/regions";

const DEFAULT_BROWSERLESS_SCREENSHOT = "https://production-sfo.browserless.io/screenshot";

export function browserlessPathEndpoint(pathname: string): string | null {
  const token = process.env.BROWSERLESS_TOKEN?.trim();
  if (!token) return null;
  try {
    const parsed = new URL(
      process.env.BROWSERLESS_SCREENSHOT_URL?.trim() || DEFAULT_BROWSERLESS_SCREENSHOT,
    );
    parsed.pathname = pathname.startsWith("/") ? pathname : `/${pathname}`;
    parsed.searchParams.set("token", token);
    return parsed.href;
  } catch {
    return null;
  }
}

export type BrowserlessGeoFlags = {
  viaResidential: boolean;
  viaExternalProxy: boolean;
  residentialStateApplied: boolean;
};

export function geoRoutingRequested(regionRaw: string | undefined, disableProxy: boolean): boolean {
  if (disableProxy) return false;
  if (process.env.VIEWTRACE_GEO_PROXY_URL_TEMPLATE?.trim() || process.env.VIEWTRACE_GEO_PROXY_URL?.trim()) {
    return true;
  }
  if (!regionRaw?.trim()) return false;
  return isBrowserlessResidentialEnabled() && isValidObservationRegion(regionRaw);
}

export function applyBrowserlessGeoToUrl(params: {
  href: string;
  regionRaw: string;
  disableProxy?: boolean;
  residentialState?: boolean;
  residentialCity?: boolean;
}): { href: string; flags: BrowserlessGeoFlags } | { error: string } {
  const disableProxy = params.disableProxy === true;
  const regionRaw = params.regionRaw.trim();
  const hasGeoTemplate = Boolean(process.env.VIEWTRACE_GEO_PROXY_URL_TEMPLATE?.trim());
  const hasGeoFixed = Boolean(process.env.VIEWTRACE_GEO_PROXY_URL?.trim());
  const wantsExternal = hasGeoTemplate || hasGeoFixed;
  const geoProxy = disableProxy
    ? null
    : resolveGeoProxyUrl(hasGeoTemplate ? regionRaw : regionRaw || undefined);
  if (wantsExternal && !disableProxy && !geoProxy) {
    return { error: "geo_proxy_misconfigured" };
  }

  const endpoint = new URL(params.href);
  let viaResidential = false;
  let viaExternalProxy = false;
  let residentialStateApplied = false;
  const residentialTarget = resolveBrowserlessResidentialTarget(regionRaw);

  if (geoProxy) {
    endpoint.searchParams.set("externalProxyServer", geoProxy);
    viaExternalProxy = true;
  } else if (
    !disableProxy &&
    isBrowserlessResidentialEnabled() &&
    regionRaw &&
    isValidObservationRegion(regionRaw)
  ) {
    const geoParams = buildBrowserlessResidentialSearchParams(
      regionRaw,
      params.residentialState === true,
      params.residentialCity === true,
    );
    if (geoParams) {
      for (const [key, value] of geoParams.entries()) {
        endpoint.searchParams.set(key, value);
      }
      viaResidential = true;
      residentialStateApplied =
        Boolean(residentialTarget?.stateCode) &&
        ((params.residentialState === true && Boolean(residentialTarget?.state)) ||
          (params.residentialCity === true && Boolean(residentialTarget?.city)));
    }
  }

  return {
    href: endpoint.href,
    flags: { viaResidential, viaExternalProxy, residentialStateApplied },
  };
}

export async function withBrowserlessGeoRetry<T extends { ok: boolean }>(params: {
  region?: string;
  run: (opts: {
    disableProxy?: boolean;
    residentialState?: boolean;
    residentialCity?: boolean;
  }) => Promise<T>;
  retryable: (result: T) => boolean;
}): Promise<T> {
  const geo = geoRoutingRequested(params.region, false);
  const target = resolveBrowserlessResidentialTarget(params.region ?? "");
  const hasUsState = Boolean(target?.stateCode);
  const tryCity = geo && hasUsState && Boolean(target?.city);
  const tryState = geo && hasUsState && isBrowserlessProxyStateEnabled() && !tryCity;

  if (tryCity) {
    const city = await params.run({ residentialCity: true, residentialState: false });
    if (city.ok || !params.retryable(city)) return city;
  }
  if (tryState) {
    const state = await params.run({ residentialState: true, residentialCity: false });
    if (state.ok || !params.retryable(state)) return state;
  }
  if (geo) {
    const country = await params.run({
      residentialState: false,
      residentialCity: false,
      disableProxy: false,
    });
    if (country.ok || !params.retryable(country)) return country;
    return params.run({ disableProxy: true });
  }
  return params.run({});
}
