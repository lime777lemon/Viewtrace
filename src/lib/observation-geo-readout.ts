import type { CaptureConditionsV1 } from "@/lib/capture-conditions";
import type { Locale } from "@/lib/i18n";

const COUNTRY_EN: Record<string, string> = {
  us: "United States",
  gb: "United Kingdom",
  de: "Germany",
  fr: "France",
  jp: "Japan",
  au: "Australia",
  ca: "Canada",
};

const COUNTRY_JA: Record<string, string> = {
  us: "米国",
  gb: "英国",
  de: "ドイツ",
  fr: "フランス",
  jp: "日本",
  au: "オーストラリア",
  ca: "カナダ",
};

export type ObservationGeoReadoutCopy = {
  requestedObserved: string;
  observedNoGeo: string;
};

export function observationGeoCopyFrom(t: {
  geoRequestedObserved: string;
  geoObservedNoGeo: string;
}): ObservationGeoReadoutCopy {
  return {
    requestedObserved: t.geoRequestedObserved,
    observedNoGeo: t.geoObservedNoGeo,
  };
}

export type ObservationGeoReadout = {
  requestedLabel: string;
  observedLabel: string;
  /** 一覧・見出し用。経路が弱いときは観測事実側 */
  headline: string;
  distinguish: boolean;
  detailLine: string | null;
};

export function countryCodeDisplayName(code: string, locale: Locale): string {
  const key = code.trim().toLowerCase();
  const map = locale === "ja" ? COUNTRY_JA : COUNTRY_EN;
  return map[key] ?? code.trim().toUpperCase();
}

function observedFromConditions(
  conditions: CaptureConditionsV1 | null | undefined,
  copy: ObservationGeoReadoutCopy,
  locale: Locale,
): string | null {
  if (!conditions?.geo) return null;
  const mode = conditions.geo.proxy_mode;
  if (mode === "retry_without_proxy" || mode === "none") {
    return copy.observedNoGeo;
  }
  const country = conditions.geo.country?.trim();
  const state = conditions.geo.state?.trim();
  if (!country) return copy.observedNoGeo;
  const countryLabel = countryCodeDisplayName(country, locale);
  if (state) return `${countryLabel} · ${state}`;
  return countryLabel;
}

export function observationGeoReadout(input: {
  requestedLabel: string;
  regionValue?: string | null;
  captureConditions?: CaptureConditionsV1 | null;
  copy: ObservationGeoReadoutCopy;
  locale: Locale;
}): ObservationGeoReadout {
  const requestedLabel = input.requestedLabel.trim() || input.regionValue?.trim() || "—";
  const observedLabel = observedFromConditions(input.captureConditions, input.copy, input.locale);
  if (!observedLabel || !input.captureConditions) {
    return {
      requestedLabel,
      observedLabel: requestedLabel,
      headline: requestedLabel,
      distinguish: false,
      detailLine: null,
    };
  }

  const requestedUsState = /^US-/i.test(input.captureConditions.region_input);
  const distinguish =
    input.captureConditions.geo.proxy_mode === "retry_without_proxy" ||
    (requestedUsState && !input.captureConditions.geo.state);

  if (!distinguish) {
    return {
      requestedLabel,
      observedLabel,
      headline: requestedLabel,
      distinguish: false,
      detailLine: null,
    };
  }

  return {
    requestedLabel,
    observedLabel,
    headline: observedLabel,
    distinguish: true,
    detailLine: input.copy.requestedObserved
      .replace("{requested}", requestedLabel)
      .replace("{observed}", observedLabel),
  };
}
