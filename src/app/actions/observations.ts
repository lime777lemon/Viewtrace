"use server";

import { redirect } from "next/navigation";
import { appendAuditEvent, AUDIT_ACTION } from "@/lib/audit-log";
import { getSession } from "@/lib/auth/session";
import {
  isBrowserlessConfigured,
  runBrowserlessScreenshotWithProxyRetry,
} from "@/lib/browserless-screenshot";
import type { Observation } from "@/lib/demo/observations";
import {
  appendUserObservation,
  countObservationsSinceTrialStart,
  readUserObservations,
} from "@/lib/demo/user-observations";
import {
  type ObservationSnapshotUploadResult,
  uploadObservationSnapshotPng,
} from "@/lib/observation-snapshot-storage";
import { getPlan, TRIAL_CONFIG } from "@/lib/plans";
import { getRegionOptions } from "@/lib/regions";
import { fetchMicrolinkScreenshotUrl } from "@/lib/microlink-screenshot";
import { normalizeUserUrlInput } from "@/lib/url-preview";
import { runUrlPreviewFetch } from "@/lib/url-preview-fetch";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  formatCaptureNoUrlPreviewFail,
  formatCaptureNoUrlUploadFail,
  formatProcessingDetailRecordedWithImage,
  formatProcessingDetailScreenshotVerified,
  observationEventJa,
} from "@/lib/i18n/observation-event-strings";

function observationUrlHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function coerceRecordingUrl(urlRaw: string): string | null {
  const n = normalizeUserUrlInput(urlRaw);
  if (n) return n;
  try {
    const u = new URL(urlRaw.trim());
    if (u.protocol === "http:" || u.protocol === "https:") {
      u.hash = "";
      return u.href;
    }
  } catch {
    return null;
  }
  return null;
}

export async function recordWebVerifiedObservationAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/observations/new");

  const urlRaw = String(formData.get("url") ?? "").trim();
  const regionValue = String(formData.get("region") ?? "").trim();
  let regionLabel = String(formData.get("regionLabel") ?? "").trim();
  const verifiedTitle = String(formData.get("verifiedTitle") ?? "").trim();
  const verifiedImageUrl = String(formData.get("verifiedImageUrl") ?? "").trim();

  const url = coerceRecordingUrl(urlRaw);
  if (!url || !regionValue) {
    redirect("/dashboard/observations/new?error=invalid");
  }

  const allowedRegions = getRegionOptions(session.plan);
  if (!allowedRegions.some((r) => r.value === regionValue)) {
    redirect("/dashboard/observations/new?error=region");
  }

  if (!regionLabel) {
    regionLabel = allowedRegions.find((r) => r.value === regionValue)?.label ?? regionValue;
  }

  if (session.trialEligible) {
    if (session.trialExpired) {
      redirect("/checkout?plan=starter&reason=trial_expired");
    }
    const existing = await readUserObservations();
    const trialUsed = session.trialStartedAt
      ? countObservationsSinceTrialStart(existing, session.trialStartedAt)
      : existing.length;
    if (trialUsed >= TRIAL_CONFIG.freeObservations) {
      redirect("/checkout?plan=starter&reason=trial_observation_limit");
    }
  }

  // Persisted in Postgres `uuid` column; keep as UUID string.
  const id = crypto.randomUUID();
  const noteParts = ["Webサイト確認に基づく記録"];
  if (verifiedTitle) noteParts.push(`確認時タイトル: ${verifiedTitle.slice(0, 200)}`);

  let snapshotImageUrl =
    /^https?:\/\//i.test(verifiedImageUrl) && verifiedImageUrl.length < 2048 ? verifiedImageUrl : undefined;
  const verifiedSnap =
    snapshotImageUrl && verifiedImageUrl.trim().length > 0 ? verifiedImageUrl.trim() : null;

  const capturedAt = new Date().toISOString();

  const plan = getPlan(session.plan);
  const browserlessOn = isBrowserlessConfigured();

  const preview = await runUrlPreviewFetch(url, {
    screenshotFallback: !browserlessOn,
    fullPageScreenshot: browserlessOn ? false : plan.snapshotFullPage,
    regionValue,
    retryWithoutProxyOnFailure: true,
  });

  let uploadedBrowserlessUrl: string | null = null;
  let browserlessDetail = "";
  let blobUploadResult: ObservationSnapshotUploadResult | null = null;
  /** Blob アップロード直前のバイト列ハッシュ（外部プレビュー URL のみのときは未設定） */
  let snapshotBinarySha256: string | undefined;
  let snapshotPhash: string | undefined;
  let snapshotBytes: number | undefined;
  let snapshotContentType: string | undefined;

  let browserlessShotOk = false;
  if (browserlessOn) {
    const shot = await runBrowserlessScreenshotWithProxyRetry({
      url,
      region: regionValue,
      fullPage: plan.snapshotFullPage,
    });
    if (shot.ok) {
      browserlessShotOk = true;
      // Keep text/UI readable: Starter is slightly more compressed, Pro keeps higher quality.
      const webpQuality = session.plan === "pro" ? 86 : 78;
      blobUploadResult = await uploadObservationSnapshotPng(id, shot.png, {
        format: "webp",
        webpQuality,
        includePerceptualHash: session.plan === "pro",
      });
      if (blobUploadResult.ok) {
        uploadedBrowserlessUrl = blobUploadResult.url;
        snapshotBinarySha256 = blobUploadResult.snapshotSha256;
        snapshotBytes = blobUploadResult.snapshotBytes;
        snapshotContentType = blobUploadResult.snapshotContentType;
        if (blobUploadResult.snapshotPhash) {
          snapshotPhash = blobUploadResult.snapshotPhash;
        }
        snapshotImageUrl = snapshotImageUrl ?? uploadedBrowserlessUrl;
        browserlessDetail = "Browserless→Blob 保存成功";
      } else if (blobUploadResult.code === "token_missing") {
        browserlessDetail =
          "Browserless 成功・BLOB_READ_WRITE_TOKEN 未設定のため Vercel Blob に保存できません（環境変数を設定してください）";
      } else if (blobUploadResult.code === "url_too_long") {
        browserlessDetail = "Browserless 成功・Blob の返却URLが長すぎるため snapshot_image_url に保存できませんでした";
      } else {
        browserlessDetail = `Browserless 成功・Blob 保存失敗${blobUploadResult.message ? `: ${blobUploadResult.message}` : ""}`;
      }
    } else {
      browserlessDetail = `Browserless 失敗: ${shot.error}`;
    }
  }

  if (!snapshotImageUrl) {
    /**
     * 最後の砦：プレビュー HTML 取得や Browserless キャプチャが失敗していても、
     * Microlink 側だけは別経路（独立した取得サーバ＋スクリーンショット）なので
     * 直接スクリーンショット URL の取得を試みる。
     * これにより onamae.com など強いボット保護のサイトでも、少なくとも
     * 画像 URL が記録に残せる可能性が上がる（バイト列は保存しない＝ pHash 比較不可）。
     */
    const microlinkImage = await fetchMicrolinkScreenshotUrl(url, {
      fullPage: plan.snapshotFullPage,
    });
    if (microlinkImage && /^https?:\/\//i.test(microlinkImage)) {
      snapshotImageUrl = microlinkImage.slice(0, 2048);
    }
  }

  const captureDetail = (() => {
    if (snapshotImageUrl) {
      if (verifiedSnap && snapshotImageUrl === verifiedSnap) return observationEventJa.captureFormImage;
      if (uploadedBrowserlessUrl && snapshotImageUrl === uploadedBrowserlessUrl) {
        return observationEventJa.captureBrowserlessBlob;
      }
      return observationEventJa.capturePreviewOg;
    }
    if (blobUploadResult && !blobUploadResult.ok) {
      if (blobUploadResult.code === "token_missing") {
        return observationEventJa.captureNoUrlToken;
      }
      if (blobUploadResult.code === "url_too_long") {
        return observationEventJa.captureNoUrlBlobUrlLong;
      }
      return formatCaptureNoUrlUploadFail(blobUploadResult.message);
    }
    if (browserlessShotOk) {
      return observationEventJa.captureNoUrlBrowserlessOkNoUrl;
    }
    if (browserlessOn && !browserlessShotOk) {
      return observationEventJa.captureNoUrlBrowserlessFail;
    }
    if (!preview.ok) {
      return formatCaptureNoUrlPreviewFail(preview.error);
    }
    return observationEventJa.captureNoUrlNoPreview;
  })();

  const userVerifiedCapture = Boolean(
    verifiedSnap && snapshotImageUrl && snapshotImageUrl === verifiedSnap,
  );
  /** サーバー側 HTML プレビューが落ちても、Browserless 成功 or フォーム確認画像なら記録は成立とみなす */
  const ok = preview.ok || browserlessShotOk || userVerifiedCapture;
  const pageTitle =
    preview.ok && preview.title ? preview.title.slice(0, 300) : undefined;

  const processingDetailWithoutPreview =
    !preview.ok && ok
      ? browserlessShotOk
        ? formatProcessingDetailScreenshotVerified(regionValue, browserlessDetail)
        : formatProcessingDetailRecordedWithImage(regionValue)
      : null;

  const successNote = (() => {
    if (!ok) return `取得に失敗しました（${preview.error}）`;
    if (preview.ok) return noteParts.join(" — ");
    if (browserlessShotOk) return `${noteParts.join(" — ")} — スクリーンショットで確認済み`;
    if (userVerifiedCapture) return `${noteParts.join(" — ")} — 確認画像で記録済み`;
    return noteParts.join(" — ");
  })();

  const obs: Observation = {
    id,
    url,
    regionValue,
    regionLabel,
    capturedAt,
    status: ok ? "success" : "failure",
    note: successNote,
    pageTitle: pageTitle ?? (verifiedTitle ? verifiedTitle.slice(0, 300) : undefined),
    snapshotImageUrl,
    snapshotSha256: snapshotBinarySha256,
    snapshotPhash,
    snapshotBytes,
    snapshotContentType,
    events: [
      {
        at: capturedAt,
        kind: "processing",
        label: observationEventJa.labels.processing,
        detail: !ok
          ? `region=${regionValue} error=${preview.error}`
          : processingDetailWithoutPreview ??
            (preview.ok
              ? `region=${regionValue} status=${preview.status} proxy=${preview.viaProxy ? "on" : "off"}${browserlessDetail ? ` · ${browserlessDetail}` : ""}`
              : `region=${regionValue} error=${preview.error}`),
      },
      {
        at: capturedAt,
        kind: "capture",
        label: observationEventJa.labels.capture,
        detail: captureDetail,
      },
      {
        at: capturedAt,
        kind: "status",
        label: observationEventJa.labels.status,
        detail: ok ? observationEventJa.statusDetailSuccess : observationEventJa.statusDetailFailure,
      },
    ],
  };

  const supabase = await createSupabaseServerClient();
  const saved = await appendUserObservation(obs, {
    retentionDays: plan.retentionDays,
    monthlyLimit: plan.monthlyObservations,
  });
  if (!saved.ok && saved.code === "monthly_limit") {
    await appendAuditEvent(supabase, {
      scope: "observation",
      action: AUDIT_ACTION.OBSERVATION_RECORD,
      observationId: id,
      meta: {
        result: "monthly_limit",
        urlHost: observationUrlHost(url),
        region: regionValue,
      },
    });
    redirect("/dashboard/observations/new?error=limit");
  }

  if (saved.ok) {
    await appendAuditEvent(supabase, {
      scope: "observation",
      action: AUDIT_ACTION.OBSERVATION_RECORD,
      observationId: id,
      meta: {
        result: "saved",
        status: obs.status,
        urlHost: observationUrlHost(url),
        region: regionValue,
        browserless: browserlessOn,
      },
    });
  }

  redirect(`/dashboard/observations/${id}`);
}
