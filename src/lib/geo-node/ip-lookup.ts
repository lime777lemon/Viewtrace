type IpLookup = {
  country: string | null;
  region: string | null;
};

async function fetchJson(url: string, ms: number): Promise<Record<string, unknown> | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const res = await fetch(url, { signal: ac.signal, headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** State/region from the outbound IP. Country from Cloudflare trace still wins. */
export async function lookupIpRegion(ip: string | null | undefined): Promise<IpLookup> {
  const addr = ip?.trim() ?? "";
  if (!addr) return { country: null, region: null };
  const json = await fetchJson(`https://ipwho.is/${encodeURIComponent(addr)}`, 4000);
  if (!json || json.success === false) return { country: null, region: null };
  const country = typeof json.country_code === "string" ? json.country_code.trim().toUpperCase() : null;
  const region = typeof json.region_code === "string" ? json.region_code.trim().toUpperCase() : null;
  return {
    country: country && /^[A-Z]{2}$/.test(country) ? country : null,
    region: region && /^[A-Z]{2}$/.test(region) ? region : null,
  };
}

export function verifiedRegionFromLookup(
  cfCountry: string | null,
  lookup: IpLookup,
): string | null {
  if (!cfCountry || !lookup.country || lookup.country !== cfCountry) return null;
  return lookup.region;
}
