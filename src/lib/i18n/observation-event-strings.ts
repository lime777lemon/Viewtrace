/**
 * Japanese copy persisted on observation `events` in the database.
 * Consumer-facing only — no vendor names (Browserless, Blob env vars, etc.).
 * Legacy technical strings are normalized on read in `observation-persisted-copy.ts`.
 */
export const observationEventJa = {
  labels: {
    processing: "地域別アクセスで取得",
    capture: "スナップショットを記録",
    status: "オブザベーション登録",
  },
  statusDetailSuccess: "成功 — 確認情報を保存しました",
  statusDetailFailure: "失敗 — 確認情報を保存しました",
  captureFormImage: "フォームの確認画像",
  captureSavedSnapshot: "保存済みスクリーンショット",
  capturePreviewFallback: "プレビュー画像",
  captureNoUrlSaveFailed: "スクリーンショット画像を保存できませんでした",
  captureNoUrlScreenshotFailed: "スクリーンショットを取得できませんでした",
  captureNoUrlPreviewFailed: "ページ情報の取得に失敗しました",
  captureNoUrlNoPreview: "画像を取得できませんでした",
} as const;

export function formatProcessingDetailSuccess(regionLabel: string, httpStatus: number): string {
  return `${regionLabel} から取得 · HTTP ${httpStatus}`;
}

export function formatProcessingDetailRecordedWithImage(regionLabel: string): string {
  return `${regionLabel} · 確認画像で記録`;
}

export function formatProcessingDetailScreenshotVerified(regionLabel: string): string {
  return `${regionLabel} · スクリーンショットで確認`;
}

export function formatProcessingDetailFailure(regionLabel: string): string {
  return `${regionLabel} · 取得に失敗`;
}

export function formatCaptureNoUrlUploadFail(_message?: string): string {
  return observationEventJa.captureNoUrlSaveFailed;
}

export function formatCaptureNoUrlPreviewFail(_error: string): string {
  return observationEventJa.captureNoUrlPreviewFailed;
}
