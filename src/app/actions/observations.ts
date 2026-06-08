"use server";

import { redirect } from "next/navigation";
import { appendAuditEvent, AUDIT_ACTION } from "@/lib/audit-log";
import { getSession } from "@/lib/auth/session";
import {
  buildCaptureConditionsFromBrowserless,
  buildCaptureConditionsFromDirectFetch,
  buildCaptureConditionsFromFormUpload,
  buildCaptureConditionsFromMicrolink,
  type CaptureConditionsV1,
} from "@/lib/capture-conditions";
import {
  isBrowserlessConfigured,
  runBrowserlessScreenshotWithProxyRetry,
  type BrowserlessScreenshotResult,
} from "@/lib/browserless-screenshot";
import { getPngDimensions } from "@/lib/png-dimensions";
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
  formatProcessingDetailFailure,
  formatProcessingDetailRecordedWithImage,
  formatProcessingDetailScreenshotVerified,
  formatProcessingDetailSuccess,
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
  let blobUploadResult: ObservationSnapshotUploadResult | null = null;
  /** Blob アップロード直前のバイト列ハッシュ（外部プレビュー URL のみのときは未設定） */
  let snapshotBinarySha256: string | undefined;
  let snapshotPhash: string | undefined;
  let snapshotBytes: number | undefined;
  let snapshotContentType: string | undefined;

  let browserlessShotOk = false;
  let lastBrowserlessShot: Extract<BrowserlessScreenshotResult, { ok: true }> | null = null;
  let usedMicrolink = false;
  if (browserlessOn) {
    const shot = await runBrowserlessScreenshotWithProxyRetry({
      url,
      region: regionValue,
      fullPage: plan.snapshotFullPage,
    });
    if (shot.ok) {
      browserlessShotOk = true;
      lastBrowserlessShot = shot;
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
      }
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
      usedMicrolink = true;
      snapshotImageUrl = microlinkImage.slice(0, 2048);
    }
  }

  const captureDetail = (() => {
    if (snapshotImageUrl) {
      if (verifiedSnap && snapshotImageUrl === verifiedSnap) return observationEventJa.captureFormImage;
      if (uploadedBrowserlessUrl && snapshotImageUrl === uploadedBrowserlessUrl) {
        return observationEventJa.captureSavedSnapshot;
      }
      return observationEventJa.capturePreviewFallback;
    }
    if (blobUploadResult && !blobUploadResult.ok) {
      return formatCaptureNoUrlUploadFail(blobUploadResult.message);
    }
    if (browserlessShotOk) {
      return observationEventJa.captureNoUrlSaveFailed;
    }
    if (browserlessOn && !browserlessShotOk) {
      return observationEventJa.captureNoUrlScreenshotFailed;
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
        ? formatProcessingDetailScreenshotVerified(regionLabel)
        : formatProcessingDetailRecordedWithImage(regionLabel)
      : null;

  const successNote = (() => {
    if (!ok) return "取得に失敗しました";
    if (preview.ok) return noteParts.join(" — ");
    if (browserlessShotOk) return `${noteParts.join(" — ")} — スクリーンショットで確認済み`;
    if (userVerifiedCapture) return `${noteParts.join(" — ")} — 確認画像で記録済み`;
    return noteParts.join(" — ");
  })();

  let captureConditions: CaptureConditionsV1;
  if (lastBrowserlessShot) {
    const dims = await getPngDimensions(lastBrowserlessShot.png);
    const webpQuality = session.plan === "pro" ? 86 : 78;
    captureConditions = buildCaptureConditionsFromBrowserless({
      capturedAt,
      regionInput: regionValue,
      regionLabel,
      fullPageRequested: plan.snapshotFullPage,
      viaResidential: lastBrowserlessShot.viaResidential ?? false,
      viaExternalProxy: lastBrowserlessShot.viaExternalProxy ?? false,
      usedRetryWithoutProxy: lastBrowserlessShot.usedRetryWithoutProxy ?? false,
      storageFormat: "webp",
      webpQuality,
      imageWidthPx: dims?.width ?? null,
      imageHeightPx: dims?.height ?? null,
      snapshotBytes: snapshotBytes ?? null,
      snapshotContentType: snapshotContentType ?? null,
      snapshotSha256Present: Boolean(snapshotBinarySha256),
    });
  } else if (userVerifiedCapture) {
    captureConditions = buildCaptureConditionsFromFormUpload({
      capturedAt,
      regionInput: regionValue,
      regionLabel,
    });
  } else if (usedMicrolink) {
    captureConditions = buildCaptureConditionsFromMicrolink({
      capturedAt,
      regionInput: regionValue,
      regionLabel,
      fullPageRequested: plan.snapshotFullPage,
      snapshotBytes: snapshotBytes ?? null,
      snapshotContentType: snapshotContentType ?? null,
      snapshotSha256Present: Boolean(snapshotBinarySha256),
    });
  } else {
    captureConditions = buildCaptureConditionsFromDirectFetch({
      capturedAt,
      regionInput: regionValue,
      regionLabel,
      fullPageRequested: plan.snapshotFullPage,
      viaProxy: preview.ok ? preview.viaProxy : false,
      httpStatus: preview.ok ? preview.status : null,
    });
  }

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
    captureConditions,
    events: [
      {
        at: capturedAt,
        kind: "processing",
        label: observationEventJa.labels.processing,
        detail: !ok
          ? formatProcessingDetailFailure(regionLabel)
          : processingDetailWithoutPreview ??
            (preview.ok
              ? formatProcessingDetailSuccess(regionLabel, preview.status)
              : formatProcessingDetailFailure(regionLabel)),
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
