/**
 * Japanese copy persisted on observation `events` in the database.
 * Keep in sync with `localizeObservationEventDetail` / EN keys in `copy.en.observationEvent`.
 */
export const observationEventJa = {
  labels: {
    processing: "地域別アクセスで取得",
    capture: "スナップショットを記録",
    status: "オブザベーション登録",
  },
  statusDetailSuccess: "成功 — 確認情報をDBに保存",
  statusDetailFailure: "失敗 — 確認情報をDBに保存",
  captureFormImage: "フォームの確認画像",
  captureBrowserlessBlob: "Browserless スナップショット（Vercel Blob）",
  capturePreviewOg: "プレビュー画像（OG / Microlink 等）",
  captureNoUrlToken:
    "snapshot_image_url なし — BLOB_READ_WRITE_TOKEN が未設定のため Vercel Blob にアップロードできません",
  captureNoUrlBlobUrlLong:
    "snapshot_image_url なし — Blob の公開URLが長すぎるため保存をスキップしました",
  captureNoUrlBrowserlessOkNoUrl:
    "snapshot_image_url なし — Browserless は成功しましたが画像URLが確定しませんでした",
  captureNoUrlBrowserlessFail:
    "snapshot_image_url なし — Browserless キャプチャに失敗し、プレビューからも画像URLを得られませんでした",
  captureNoUrlNoPreview:
    "snapshot_image_url なし — スクリーンショット・プレビューのいずれからも画像URLを取得できませんでした",
} as const;

export function formatProcessingDetailRecordedWithImage(region: string): string {
  return `region=${region} · 確認画像で記録済み`;
}

export function formatProcessingDetailScreenshotVerified(
  region: string,
  browserlessDetail: string,
): string {
  return `region=${region} · スクリーンショットで確認済み${browserlessDetail ? `（${browserlessDetail}）` : ""}`;
}

export function formatCaptureNoUrlUploadFail(message?: string): string {
  return `snapshot_image_url なし — Vercel Blob アップロード失敗${message ? `（${message}）` : ""}`;
}

export function formatCaptureNoUrlPreviewFail(error: string): string {
  return `snapshot_image_url なし — プレビュー取得失敗（${error}）`;
}
