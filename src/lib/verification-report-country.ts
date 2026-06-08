import type { Observation } from "@/lib/demo/observations";

/** 検証レポート用の国・地域表示（capture_conditions 優先、なければ region） */
export function formatVerificationReportCountry(obs: Observation): string {
  const geo = obs.captureConditions?.geo;
  if (geo?.country) {
    const country = geo.country.toUpperCase();
    return geo.state ? `${country} / ${geo.state.toUpperCase()}` : country;
  }
  if (obs.regionLabel?.trim()) {
    return obs.regionValue?.trim()
      ? `${obs.regionLabel} (${obs.regionValue})`
      : obs.regionLabel;
  }
  return obs.regionValue?.trim() || "—";
}
