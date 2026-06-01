import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import { observationEventJa } from "@/lib/i18n/observation-event-strings";

/** Exact legacy JA strings (pre–consumer-copy) → current consumer JA */
const LEGACY_DETAIL_JA_TO_CONSUMER: Record<string, string> = {
  "成功 — 確認情報をDBに保存": observationEventJa.statusDetailSuccess,
  "失敗 — 確認情報をDBに保存": observationEventJa.statusDetailFailure,
  "Browserless スナップショット（Vercel Blob）": observationEventJa.captureSavedSnapshot,
  "プレビュー画像（OG / Microlink 等）": observationEventJa.capturePreviewFallback,
  "snapshot_image_url なし — BLOB_READ_WRITE_TOKEN が未設定のため Vercel Blob にアップロードできません":
    observationEventJa.captureNoUrlSaveFailed,
  "snapshot_image_url なし — Blob の公開URLが長すぎるため保存をスキップしました":
    observationEventJa.captureNoUrlSaveFailed,
  "snapshot_image_url なし — Browserless は成功しましたが画像URLが確定しませんでした":
    observationEventJa.captureNoUrlSaveFailed,
  "snapshot_image_url なし — Browserless キャプチャに失敗し、プレビューからも画像URLを得られませんでした":
    observationEventJa.captureNoUrlScreenshotFailed,
  "snapshot_image_url なし — スクリーンショット・プレビューのいずれからも画像URLを取得できませんでした":
    observationEventJa.captureNoUrlNoPreview,
};

function normalizeConsumerEventDetailJa(detail: string): string {
  const trimmed = detail.trim();
  const exact = LEGACY_DETAIL_JA_TO_CONSUMER[trimmed];
  if (exact) return exact;

  const proc = /^region=(\S+)\s+status=(\d+)\s+proxy=(?:on|off)(?:\s*·\s*(.*))?$/.exec(trimmed);
  if (proc) {
    return `${proc[1]} から取得 · HTTP ${proc[2]}`;
  }

  const procErr = /^region=(\S+)\s+error=(.+)$/.exec(trimmed);
  if (procErr) {
    return `${procErr[1]} · 取得に失敗`;
  }

  const imageRecorded = /^region=(\S+)\s*[·・]\s*確認画像で記録済み$/.exec(trimmed);
  if (imageRecorded) {
    return `${imageRecorded[1]} · 確認画像で記録`;
  }

  const screenshotVerified =
    /^region=(\S+)\s*[·・]\s*スクリーンショットで確認済み(?:（[\s\S]*）)?$/.exec(trimmed);
  if (screenshotVerified) {
    return `${screenshotVerified[1]} · スクリーンショットで確認`;
  }

  if (/^snapshot_image_url なし — Vercel Blob アップロード失敗/.test(trimmed)) {
    return observationEventJa.captureNoUrlSaveFailed;
  }
  if (/^snapshot_image_url なし — プレビュー取得失敗/.test(trimmed)) {
    return observationEventJa.captureNoUrlPreviewFailed;
  }
  if (/^Browserless 失敗:/.test(trimmed) || /Browserless/i.test(trimmed)) {
    return observationEventJa.captureNoUrlScreenshotFailed;
  }

  return trimmed
    .replace(/（Browserless[\s\S]*?）/g, "")
    .replace(/\s*·\s*Browserless[\s\S]*/g, "")
    .replace(/snapshot_image_url/g, "スクリーンショット")
    .trim();
}

function translateStaticEventDetailToEn(detail: string): string | null {
  const ja = observationEventJa;
  const en = copy.en.observationEvent;
  if (detail === ja.statusDetailSuccess) return en.statusDetailSuccess;
  if (detail === ja.statusDetailFailure) return en.statusDetailFailure;
  if (detail === ja.captureFormImage) return en.captureFormImage;
  if (detail === ja.captureSavedSnapshot) return en.captureSavedSnapshot;
  if (detail === ja.capturePreviewFallback) return en.capturePreviewFallback;
  if (detail === ja.captureNoUrlSaveFailed) return en.captureNoUrlSaveFailed;
  if (detail === ja.captureNoUrlScreenshotFailed) return en.captureNoUrlScreenshotFailed;
  if (detail === ja.captureNoUrlPreviewFailed) return en.captureNoUrlPreviewFailed;
  if (detail === ja.captureNoUrlNoPreview) return en.captureNoUrlNoPreview;
  return null;
}

function localizeObservationEventDetailEn(detail: string): string {
  const en = copy.en.observationEvent;
  const staticTr = translateStaticEventDetailToEn(detail);
  if (staticTr !== null) return staticTr;

  const proc = /^(\S+)\s+から取得 · HTTP (\d+)$/.exec(detail);
  if (proc) {
    return `${proc[1]} · fetched · HTTP ${proc[2]}`;
  }

  const procFail = /^(\S+)\s*·\s*取得に失敗$/.exec(detail);
  if (procFail) {
    return `${procFail[1]} · capture failed`;
  }

  const imageRecorded = /^(\S+)\s*·\s*確認画像で記録$/.exec(detail);
  if (imageRecorded) {
    return `${imageRecorded[1]} · ${en.processingRecordedWithImageSuffix}`;
  }

  const screenshotVerified = /^(\S+)\s*·\s*スクリーンショットで確認$/.exec(detail);
  if (screenshotVerified) {
    return `${screenshotVerified[1]} · ${en.processingScreenshotVerifiedSuffix}`;
  }

  return detail;
}

function localizeObservationNoteEn(note: string): string {
  const failGeneric = /^取得に失敗しました(?:（[\s\S]*?）)?$/.exec(note);
  if (failGeneric) return "Capture failed";

  let s = note;

  s = s.replace(/^自動観測（毎日）$/, "Daily automated observation");
  s = s.replace(/^自動観測（定期）$/, "Scheduled automated observation");
  s = s.replace(
    /^自動観測（画像保存に失敗(?: — [\s\S]*?)?）$/,
    "Automated observation (could not save screenshot)",
  );
  s = s.replace(/^自動観測（スクリーンショットの保存に失敗）$/, "Automated observation (could not save screenshot)");

  s = s.replace(/^Webサイト確認に基づく記録/, "Record based on website verification");
  s = s.replace(/確認時タイトル: /g, "Title at verification: ");
  s = s.replace(/ — 確認画像で記録済み$/, " — Recorded with the confirmation image");
  s = s.replace(/ — スクリーンショットで確認済み$/, " — Verified with screenshot");

  return s;
}

export function localizeObservationNote(
  note: string | undefined,
  locale: Locale,
): string | undefined {
  if (note == null || locale === "ja") return note;
  return localizeObservationNoteEn(note);
}

export function localizeObservationEventLabel(label: string, locale: Locale): string {
  if (locale === "ja") return label;
  const en = copy.en.observationEvent;
  const ja = observationEventJa.labels;
  if (label === ja.processing) return en.processingLabel;
  if (label === ja.capture) return en.captureLabel;
  if (label === ja.status) return en.statusLabel;
  return label;
}

export function localizeObservationEventDetail(detail: string, locale: Locale): string {
  const normalizedJa = normalizeConsumerEventDetailJa(detail);
  if (locale === "ja") return normalizedJa;
  return localizeObservationEventDetailEn(normalizedJa);
}
