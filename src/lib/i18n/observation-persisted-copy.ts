import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import { observationEventJa } from "@/lib/i18n/observation-event-strings";

/** Longer phrases first — Browserless / Blob fragments embedded in other lines */
const DETAIL_PHRASE_JA_EN: Array<[string, string]> = [
  [
    "snapshot_image_url なし — BLOB_READ_WRITE_TOKEN が未設定のため Vercel Blob にアップロードできません",
    "No snapshot_image_url — could not upload to Vercel Blob (BLOB_READ_WRITE_TOKEN is not set)",
  ],
  [
    "snapshot_image_url なし — Blob の公開URLが長すぎるため保存をスキップしました",
    "No snapshot_image_url — skipped save because the Blob public URL was too long",
  ],
  [
    "snapshot_image_url なし — Browserless は成功しましたが画像URLが確定しませんでした",
    "No snapshot_image_url — Browserless succeeded but no image URL could be determined",
  ],
  [
    "snapshot_image_url なし — Browserless キャプチャに失敗し、プレビューからも画像URLを得られませんでした",
    "No snapshot_image_url — Browserless capture failed and preview did not return an image URL",
  ],
  [
    "snapshot_image_url なし — スクリーンショット・プレビューのいずれからも画像URLを取得できませんでした",
    "No snapshot_image_url — could not get an image URL from screenshot or preview",
  ],
  [
    "Browserless 成功・BLOB_READ_WRITE_TOKEN 未設定のため Vercel Blob に保存できません（環境変数を設定してください）",
    "Browserless succeeded but could not save to Vercel Blob — BLOB_READ_WRITE_TOKEN is not set (configure the env var)",
  ],
  [
    "Browserless 成功・Blob の返却URLが長すぎるため snapshot_image_url に保存できませんでした",
    "Browserless succeeded but the Blob URL was too long to store in snapshot_image_url",
  ],
  ["Browserless→Blob 保存成功", "Browserless → Blob save succeeded"],
  ["フォームの確認画像", "Confirmation image from the form"],
  ["Browserless スナップショット（Vercel Blob）", "Browserless snapshot (Vercel Blob)"],
  ["プレビュー画像（OG / Microlink 等）", "Preview image (OG / Microlink, etc.)"],
];

function translateStaticEventDetailToEn(detail: string): string | null {
  const ja = observationEventJa;
  const en = copy.en.observationEvent;
  if (detail === ja.statusDetailSuccess) return en.statusDetailSuccess;
  if (detail === ja.statusDetailFailure) return en.statusDetailFailure;
  if (detail === ja.captureFormImage) return en.captureFormImage;
  if (detail === ja.captureBrowserlessBlob) return en.captureBrowserlessBlob;
  if (detail === ja.capturePreviewOg) return en.capturePreviewOg;
  if (detail === ja.captureNoUrlToken) return en.captureNoUrlToken;
  if (detail === ja.captureNoUrlBlobUrlLong) return en.captureNoUrlBlobUrlLong;
  if (detail === ja.captureNoUrlBrowserlessOkNoUrl) return en.captureNoUrlBrowserlessOkNoUrl;
  if (detail === ja.captureNoUrlBrowserlessFail) return en.captureNoUrlBrowserlessFail;
  if (detail === ja.captureNoUrlNoPreview) return en.captureNoUrlNoPreview;
  return null;
}

function applyDetailPhraseReplacements(s: string): string {
  let out = s;
  for (const [j, e] of DETAIL_PHRASE_JA_EN) {
    if (out.includes(j)) out = out.split(j).join(e);
  }
  return out
    .replace(/ · Browserless 成功・Blob 保存失敗/g, " · Browserless succeeded; Blob save failed")
    .replace(/Browserless 成功・Blob 保存失敗/g, "Browserless succeeded; Blob save failed")
    .replace(/^Browserless 失敗: /, "Browserless failed: ");
}

function localizeObservationNoteEn(note: string): string {
  const fail = /^取得に失敗しました（([\s\S]*?)）$/.exec(note);
  if (fail) return `Capture failed (${fail[1]})`;

  let s = note;

  s = s.replace(/^自動観測（毎日）$/, "Daily automated observation");
  s = s.replace(/^自動観測（定期）$/, "Scheduled automated observation");
  s = s.replace(
    /^自動観測（画像保存に失敗 — BLOB_READ_WRITE_TOKEN 未設定のため Blob に保存できません）$/,
    "Automated observation (image save failed — BLOB_READ_WRITE_TOKEN not set; could not save to Blob)",
  );
  s = s.replace(
    /^自動観測（画像保存に失敗 — Blob の返却URLが長すぎるため保存できませんでした）$/,
    "Automated observation (image save failed — Blob return URL was too long to save)",
  );
  s = s.replace(/^自動観測（画像保存に失敗）$/, "Automated observation (image save failed)");
  const autoFailGeneric = /^自動観測（画像保存に失敗 — ([\s\S]*?)）$/.exec(s);
  if (autoFailGeneric) {
    return `Automated observation (image save failed — ${autoFailGeneric[1]})`;
  }

  s = s.replace(/^Webサイト確認に基づく記録/, "Record based on website verification");
  s = s.replace(/確認時タイトル: /g, "Title at verification: ");
  s = s.replace(/ — 確認画像で記録済み$/, " — Recorded with the confirmation image");
  s = s.replace(/ — スクリーンショットで確認済み$/, " — Verified with screenshot");

  return s;
}

function localizeObservationEventDetailEn(detail: string): string {
  const en = copy.en.observationEvent;
  const staticTr = translateStaticEventDetailToEn(detail);
  if (staticTr !== null) return staticTr;

  const previewFail = /^snapshot_image_url なし — プレビュー取得失敗（([\s\S]*)）$/.exec(detail);
  if (previewFail) {
    return `No snapshot_image_url — preview fetch failed (${previewFail[1]})`;
  }

  const blobUpload = /^snapshot_image_url なし — Vercel Blob アップロード失敗(?:（([\s\S]*?)）)?$/.exec(detail);
  if (blobUpload) {
    return blobUpload[1]
      ? `No snapshot_image_url — Vercel Blob upload failed (${blobUpload[1]})`
      : `No snapshot_image_url — Vercel Blob upload failed`;
  }

  const regionOnlyImage = /^region=(\S+)\s*[·・]\s*確認画像で記録済み$/.exec(detail);
  if (regionOnlyImage) {
    return `region=${regionOnlyImage[1]} · ${en.processingRecordedWithImageSuffix}`;
  }

  const regionShot = /^region=(\S+)\s*[·・]\s*スクリーンショットで確認済み(?:（([\s\S]*)）)?$/.exec(detail);
  if (regionShot) {
    const regionCode = regionShot[1];
    const inner = regionShot[2] ? applyDetailPhraseReplacements(regionShot[2]) : "";
    const innerPart = inner ? ` (${inner})` : "";
    return `region=${regionCode} · ${en.processingScreenshotVerifiedPrefix}${innerPart}`;
  }

  const s = applyDetailPhraseReplacements(detail);

  const statusSaved = /^(成功|失敗)\s*[—–－-]\s*確認情報をDBに保存$/.exec(detail);
  if (statusSaved) {
    return statusSaved[1] === "成功" ? en.statusDetailSuccess : en.statusDetailFailure;
  }

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
  if (locale === "ja") return detail;
  return localizeObservationEventDetailEn(detail);
}
