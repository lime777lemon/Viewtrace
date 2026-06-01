import type { Observation } from "@/lib/demo/observations";
import { observationEventJa } from "@/lib/i18n/observation-event-strings";

/** ユーザー向け：取得経路の品質段階（技術名は出さない） */
export type ObservationCaptureTier =
  | "geo_saved"
  | "preview_fallback"
  | "form_image"
  | "none"
  | "failed";

const LEGACY_CAPTURE_DETAIL_TIER: Record<string, ObservationCaptureTier> = {
  "Browserless スナップショット（Vercel Blob）": "geo_saved",
  "プレビュー画像（OG / Microlink 等）": "preview_fallback",
  "フォームの確認画像": "form_image",
};

function tierFromCaptureDetail(detail: string | undefined): ObservationCaptureTier | null {
  if (!detail?.trim()) return null;
  const d = detail.trim();
  if (d === observationEventJa.captureSavedSnapshot) return "geo_saved";
  if (d === observationEventJa.capturePreviewFallback) return "preview_fallback";
  if (d === observationEventJa.captureFormImage) return "form_image";
  return LEGACY_CAPTURE_DETAIL_TIER[d] ?? null;
}

/**
 * 保存済み Observation から取得品質 tier を推定する。
 * Blob 保存（snapshot_sha256）を最優先 — 定期観測など events なし行にも対応。
 */
export function resolveObservationCaptureTier(obs: Observation): ObservationCaptureTier {
  if (obs.status === "failure") return "failed";

  if (obs.snapshotSha256?.trim()) return "geo_saved";

  const fromEvent = tierFromCaptureDetail(
    obs.events?.find((e) => e.kind === "capture")?.detail,
  );
  if (fromEvent) return fromEvent;

  if (obs.snapshotImageUrl?.trim()) return "preview_fallback";

  if (obs.status === "success") return "none";

  return "failed";
}

export function observationRetryHref(obs: Observation): string | null {
  if (!obs.url?.trim() || !obs.regionValue?.trim()) return null;
  const q = new URLSearchParams({
    url: obs.url,
    region: obs.regionValue,
  });
  return `/dashboard/observations/new?${q.toString()}`;
}
