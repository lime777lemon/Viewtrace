import type { CaptureConditionsV1 } from "@/lib/capture-conditions";
import type { Observation } from "@/lib/demo/observations";

export const HOMEPAGE_OBSERVATION_MODES = ["still", "live_check", "share_clip"] as const;
export type HomepageObservationMode = (typeof HOMEPAGE_OBSERVATION_MODES)[number];

/** 1 セッションで動きを残す長さ。連続ショットは使わない。 */
export const HOMEPAGE_CLIP_DURATION_MS = 12_000;
/** ライブ確認のブラウザ生存。保存しない。 */
export const HOMEPAGE_LIVE_TTL_MS = 90_000;
export const HOMEPAGE_CLIP_MAX_BYTES = 12 * 1024 * 1024;

export function parseHomepageObservationMode(raw: unknown): HomepageObservationMode {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value === "live_check" || value === "share_clip") return value;
  return "still";
}

export function isHomepageVideoContentType(contentType: string | null | undefined): boolean {
  const ct = contentType?.trim().toLowerCase() ?? "";
  return ct.startsWith("video/");
}

export function homepageObservationModeFromConditions(
  conditions: CaptureConditionsV1 | null | undefined,
): HomepageObservationMode {
  const mode = conditions?.homepage_observation?.mode;
  if (mode === "live_check" || mode === "share_clip") return mode;
  const surface = conditions?.engine?.browserless?.api_surface;
  if (surface === "live_bql") return "live_check";
  if (surface === "screencast_v2") return "share_clip";
  return "still";
}

export function isHomepageLiveCheckObservation(
  obs: Pick<Observation, "captureConditions" | "snapshotContentType" | "snapshotImageUrl">,
): boolean {
  return homepageObservationModeFromConditions(obs.captureConditions) === "live_check";
}

export function isHomepageClipObservation(
  obs: Pick<Observation, "captureConditions" | "snapshotContentType">,
): boolean {
  return (
    homepageObservationModeFromConditions(obs.captureConditions) === "share_clip" ||
    isHomepageVideoContentType(obs.snapshotContentType)
  );
}

export function shouldHydrateObservationSnapshot(
  obs: Pick<Observation, "status" | "captureConditions" | "snapshotContentType" | "snapshotImageUrl">,
): boolean {
  if (obs.status !== "success") return false;
  if (isHomepageLiveCheckObservation(obs)) return false;
  if (isHomepageClipObservation(obs)) return false;
  return true;
}
