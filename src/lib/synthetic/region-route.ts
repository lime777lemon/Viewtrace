import { resolveGeoProxyUrl } from "@/lib/geo/proxy";
import type { RegionRoute } from "@/lib/synthetic/browser-provider";

function parseProxyUrl(raw: string): RegionRoute["proxy"] {
  try {
    const u = new URL(raw);
    const server = `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ""}`;
    const username = u.username ? decodeURIComponent(u.username) : undefined;
    const password = u.password ? decodeURIComponent(u.password) : undefined;
    return {
      server,
      ...(username ? { username } : {}),
      ...(password ? { password } : {}),
    };
  } catch {
    return { server: raw };
  }
}

/** Browserless Geo とは独立。将来 Oxylabs / 自社 worker でも同じ型を渡す。 */
export function resolveRegionRoute(regionRaw: string | undefined): RegionRoute {
  const region = (regionRaw ?? "").trim();
  const proxyUrl = resolveGeoProxyUrl(region || undefined);
  return {
    region,
    proxy: proxyUrl ? parseProxyUrl(proxyUrl) : null,
  };
}
