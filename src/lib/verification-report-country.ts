import type { Observation } from "@/lib/demo/observations";
import { copy, type Locale } from "@/lib/i18n";
import { observationGeoCopyFrom, observationGeoReadout } from "@/lib/observation-geo-readout";

/** 検証レポート用の国・地域表示（実際に適用した geo。州未適用なら国まで） */
export function formatVerificationReportCountry(obs: Observation, locale: Locale = "en"): string {
  const t = copy[locale].observationDetail;
  const readout = observationGeoReadout({
    requestedLabel: obs.regionLabel,
    regionValue: obs.regionValue,
    captureConditions: obs.captureConditions,
    copy: observationGeoCopyFrom(t),
    locale,
  });
  return readout.headline;
}
