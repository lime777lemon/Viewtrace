import { isValidObservationRegion, normalizeObservationRegionInput } from "@/lib/regions";

export type RequestedGeo = {
  country: string | null;
  region: string | null;
};

export type ObservedGeo = {
  country: string | null;
  region: string | null;
  observed: string | null;
};

export function parseRequestedGeo(value: string | null | undefined): RequestedGeo {
  const raw = value?.trim() ?? "";
  if (!raw) return { country: null, region: null };
  const n = normalizeObservationRegionInput(raw);
  const us = n.match(/^US-([A-Z]{2})$/);
  if (us) return { country: "US", region: us[1] ?? null };
  if (/^[A-Z]{2}$/.test(n)) return { country: n, region: null };
  return { country: null, region: null };
}

export function formatObservedGeo(country: string | null, region: string | null): string | null {
  if (!country) return null;
  if (country === "US" && region) {
    const code = `US-${region}`;
    if (isValidObservationRegion(code)) return code;
  }
  return country;
}

/** Declared node region never becomes Observed. Only verified country/region. */
export function resolveObservedGeo(input: {
  verifiedCountry: string | null | undefined;
  verifiedRegion: string | null | undefined;
}): ObservedGeo {
  const country = input.verifiedCountry?.trim().toUpperCase() || null;
  const regionRaw = input.verifiedRegion?.trim().toUpperCase() || null;
  const region = country === "US" && regionRaw && isValidObservationRegion(`US-${regionRaw}`) ? regionRaw : null;
  return {
    country,
    region,
    observed: formatObservedGeo(country, region),
  };
}

export function parseIpType(value: string | null | undefined): "residential" | "datacenter" | null {
  const v = value?.trim().toLowerCase();
  if (v === "residential" || v === "datacenter") return v;
  return null;
}

export function parseCountryCode(value: string | null | undefined): string | null {
  const v = value?.trim().toUpperCase() ?? "";
  return /^[A-Z]{2}$/.test(v) ? v : null;
}

export function parseUsRegion(value: string | null | undefined): string | null {
  const v = value?.trim().toUpperCase() ?? "";
  if (!v) return null;
  return isValidObservationRegion(`US-${v}`) ? v : null;
}
