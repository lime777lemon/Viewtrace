"use server";

import { redirect } from "next/navigation";
import { appendAuditEvent, AUDIT_ACTION } from "@/lib/audit-log";
import { getSession } from "@/lib/auth/session";
import {
  applyRequestedDevice,
  buildCaptureConditionsFromBrowserless,
  buildCaptureConditionsFromDirectFetch,
  buildCaptureConditionsFromFormUpload,
  buildCaptureConditionsFromMicrolink,
  buildCaptureConditionsFromPlaywrightWorker,
  REQUESTED_DEVICE_VIEWPORT,
  type CaptureConditionsV1,
  type RequestedDeviceClass,
} from "@/lib/capture-conditions";
import {
  isBrowserlessConfigured,
  type BrowserlessScreenshotResult,
} from "@/lib/browserless-screenshot";
import { runBrowserlessLiveWithProxyRetry } from "@/lib/browserless-live";
import { runBrowserlessScreencastWithProxyRetry } from "@/lib/browserless-screencast";
import { isPlaywrightWorkerCaptureEnabled } from "@/lib/observation-capture-backend";
import { runObservationPrimaryScreenshot } from "@/lib/observation-primary-capture";
import type { ObservationWorkerCaptureResult } from "@/lib/observation-worker-capture";
import { getPngDimensions } from "@/lib/png-dimensions";
import type { Observation } from "@/lib/demo/observations";
import {
  appendUserObservation,
  countObservationsSinceTrialStart,
  readUserObservations,
} from "@/lib/demo/user-observations";
import {
  type ObservationSnapshotUploadResult,
  uploadObservationMedia,
  uploadObservationSnapshotPng,
} from "@/lib/observation-snapshot-storage";
import {
  HOMEPAGE_CLIP_DURATION_MS,
  HOMEPAGE_LIVE_TTL_MS,
  parseHomepageObservationMode,
  type HomepageObservationMode,
} from "@/lib/observation-homepage-mode";
import { getPlan, TRIAL_CONFIG } from "@/lib/plans";
import { readScreenshotRetentionDays } from "@/lib/screenshot-retention-store";
import { getRegionOptions } from "@/lib/regions";
import { fetchMicrolinkScreenshotUrl } from "@/lib/microlink-screenshot";
import { htmlHeadSignalsHasAny, normalizeUserUrlInput } from "@/lib/url-preview";
import { runUrlPreviewFetch } from "@/lib/url-preview-fetch";
import { stampMeasurement } from "@/lib/measurement-record";
import { seoFactsForObservation } from "@/lib/observation-seo-facts";
import { collectObservationWebFacts } from "@/lib/observation-web-facts";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Span } from "@opentelemetry/api";
import {
  ATTR,
  markSpanResult,
  requestedStateAttr,
  setSpanAttrs,
  urlHostAttr,
  withSpan,
} from "@/lib/otel/trace";
import {
  formatCaptureNoUrlPreviewFail,
  formatCaptureNoUrlUploadFail,
  formatProcessingDetailFailure,
  formatProcessingDetailLiveCheck,
  formatProcessingDetailRecordedWithImage,
  formatProcessingDetailScreenshotVerified,
  formatProcessingDetailShareClip,
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

export type RecordObservationFailureCode =
  | "unauthenticated"
  | "invalid"
  | "region"
  | "trial_expired"
  | "trial_limit"
  | "monthly_limit";

export type RecordObservationResult =
  | { ok: true; id: string; liveUrl?: string }
  | { ok: false; code: RecordObservationFailureCode };

function parseDeviceClass(raw: FormDataEntryValue | null): RequestedDeviceClass | undefined {
  const value = String(raw ?? "");
  return value === "desktop" || value === "mobile" ? value : undefined;
}

function parseObservationForm(formData: FormData): {
  urlRaw: string;
  regionValue: string;
  regionLabel: string;
  verifiedTitle: string;
  verifiedImageUrl: string;
  homepageMode: HomepageObservationMode;
  deviceClass?: RequestedDeviceClass;
} {
  return {
    urlRaw: String(formData.get("url") ?? "").trim(),
    regionValue: String(formData.get("region") ?? "").trim(),
    regionLabel: String(formData.get("regionLabel") ?? "").trim(),
    verifiedTitle: String(formData.get("verifiedTitle") ?? "").trim(),
    verifiedImageUrl: String(formData.get("verifiedImageUrl") ?? "").trim(),
    homepageMode: parseHomepageObservationMode(formData.get("homepageMode")),
    deviceClass: parseDeviceClass(formData.get("deviceClass")),
  };
}

type RecordOneObservationInput = {
  urlRaw: string;
  regionValue: string;
  regionLabel: string;
  verifiedTitle: string;
  verifiedImageUrl: string;
  homepageMode: HomepageObservationMode;
  deviceClass?: RequestedDeviceClass;
};

/**
 * 手動 Observation 1 件 = trace 1 本（span `observation.create`）。
 * 子 span: preview.fetch / capture.primary / browserless.* / blob.upload_* / facts.web / supabase.observation_insert。
 */
async function recordOneObservation(input: RecordOneObservationInput): Promise<RecordObservationResult> {
  return withSpan(
    "observation.create",
    {
      [ATTR.source]: "manual",
      [ATTR.urlHost]: urlHostAttr(coerceRecordingUrl(input.urlRaw) ?? ""),
      [ATTR.regionRequested]: input.regionValue || null,
      [ATTR.stateRequested]: requestedStateAttr(input.regionValue),
      [ATTR.homepageMode]: input.homepageMode,
      [ATTR.deviceClass]: input.deviceClass ?? null,
    },
    async (span) => {
      const result = await recordOneObservationInner(input, span);
      markSpanResult(span, { ok: result.ok, error: result.ok ? null : result.code }, {
        [ATTR.observationId]: result.ok ? result.id : null,
        [ATTR.outcome]: result.ok ? "saved" : result.code,
      });
      return result;
    },
  );
}

async function recordOneObservationInner(
  input: RecordOneObservationInput,
  span: Span,
): Promise<RecordObservationResult> {
  const session = await getSession();
  if (!session) return { ok: false, code: "unauthenticated" };
  setSpanAttrs(span, { [ATTR.userId]: session.userId, "viewtrace.plan": session.plan });

  const urlRaw = input.urlRaw;
  const regionValue = input.regionValue;
  let regionLabel = input.regionLabel;
  const verifiedTitle = input.verifiedTitle;
  const verifiedImageUrl = input.verifiedImageUrl;
  const homepageMode = input.homepageMode;

  const url = coerceRecordingUrl(urlRaw);
  if (!url || !regionValue) {
    return { ok: false, code: "invalid" };
  }

  const allowedRegions = getRegionOptions(session.plan);
  if (!allowedRegions.some((r) => r.value === regionValue)) {
    return { ok: false, code: "region" };
  }

  if (!regionLabel) {
    regionLabel = allowedRegions.find((r) => r.value === regionValue)?.label ?? regionValue;
  }

  if (session.trialEligible) {
    if (session.trialExpired) {
      return { ok: false, code: "trial_expired" };
    }
    const existing = await readUserObservations();
    const trialUsed = session.trialStartedAt
      ? countObservationsSinceTrialStart(existing, session.trialStartedAt)
      : existing.length;
    if (trialUsed >= TRIAL_CONFIG.freeObservations) {
      return { ok: false, code: "trial_limit" };
    }
  }

  // Persisted in Postgres `uuid` column; keep as UUID string.
  const id = crypto.randomUUID();
  setSpanAttrs(span, { [ATTR.observationId]: id });
  const noteParts = ["Webサイト確認に基づく記録"];
  if (verifiedTitle) noteParts.push(`確認時タイトル: ${verifiedTitle.slice(0, 200)}`);

  let snapshotImageUrl =
    /^https?:\/\//i.test(verifiedImageUrl) && verifiedImageUrl.length < 2048 ? verifiedImageUrl : undefined;
  const verifiedSnap =
    snapshotImageUrl && verifiedImageUrl.trim().length > 0 ? verifiedImageUrl.trim() : null;

  const capturedAt = new Date().toISOString();

  const plan = getPlan(session.plan);
  const workerOn = isPlaywrightWorkerCaptureEnabled();
  const browserlessOn = isBrowserlessConfigured();
  const primaryCaptureOn = workerOn || browserlessOn;

  const preview = await runUrlPreviewFetch(url, {
    screenshotFallback: !primaryCaptureOn,
    fullPageScreenshot: primaryCaptureOn ? false : plan.snapshotFullPage,
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
  let lastWorkerShot: Extract<ObservationWorkerCaptureResult, { ok: true }> | null = null;
  let usedMicrolink = false;
  let liveUrl: string | undefined;
  let liveCheckOk = false;
  let lastLive:
    | Extract<Awaited<ReturnType<typeof runBrowserlessLiveWithProxyRetry>>, { ok: true }>
    | null = null;
  let lastClip:
    | Extract<Awaited<ReturnType<typeof runBrowserlessScreencastWithProxyRetry>>, { ok: true }>
    | null = null;

  if (homepageMode === "live_check" && browserlessOn) {
    const live = await runBrowserlessLiveWithProxyRetry({ url, region: regionValue });
    if (live.ok) {
      liveCheckOk = true;
      lastLive = live;
      liveUrl = live.liveUrl;
    }
  } else if (homepageMode === "share_clip" && browserlessOn) {
    const clip = await runBrowserlessScreencastWithProxyRetry({ url, region: regionValue });
    if (clip.ok) {
      lastClip = clip;
      const mediaType = clip.contentType === "video/mp4" ? "video/mp4" : "video/webm";
      blobUploadResult = await uploadObservationMedia({
        observationId: id,
        body: clip.bytes,
        contentType: mediaType,
      });
      if (blobUploadResult.ok) {
        uploadedBrowserlessUrl = blobUploadResult.url;
        snapshotBinarySha256 = blobUploadResult.snapshotSha256;
        snapshotBytes = blobUploadResult.snapshotBytes;
        snapshotContentType = blobUploadResult.snapshotContentType;
        snapshotImageUrl = snapshotImageUrl ?? uploadedBrowserlessUrl;
      }
    }
  } else if (homepageMode === "still" && primaryCaptureOn) {
    const requestedSize = input.deviceClass ? REQUESTED_DEVICE_VIEWPORT[input.deviceClass] : null;
    const primary = await runObservationPrimaryScreenshot({
      url,
      region: regionValue,
      fullPage: plan.snapshotFullPage,
      viewport: requestedSize
        ? {
            width: requestedSize.width,
            height: requestedSize.height,
            isMobile: input.deviceClass === "mobile",
            hasTouch: input.deviceClass === "mobile",
          }
        : undefined,
    });
    const shotOk =
      (primary.engine === "playwright_worker" && primary.result.ok) ||
      (primary.engine === "browserless" && primary.result.ok);
    if (shotOk && primary.result.ok) {
      browserlessShotOk = true;
      if (primary.engine === "playwright_worker") {
        lastWorkerShot = primary.result;
      } else if (primary.engine === "browserless") {
        lastBrowserlessShot = primary.result;
      }
      const png = primary.result.png;
      // Keep text/UI readable: Starter is slightly more compressed, Pro keeps higher quality.
      const webpQuality = session.plan === "pro" ? 86 : 78;
      blobUploadResult = await uploadObservationSnapshotPng(id, png, {
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

  if (!snapshotImageUrl && homepageMode === "still") {
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

  const clipSaved = Boolean(lastClip && uploadedBrowserlessUrl);
  const captureDetail = (() => {
    if (homepageMode === "live_check") {
      return liveCheckOk ? observationEventJa.captureLiveCheck : observationEventJa.captureLiveFailed;
    }
    if (homepageMode === "share_clip") {
      if (clipSaved) return observationEventJa.captureShareClip;
      if (blobUploadResult && !blobUploadResult.ok) {
        return formatCaptureNoUrlUploadFail(blobUploadResult.message);
      }
      return observationEventJa.captureClipFailed;
    }
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
    if (primaryCaptureOn && !browserlessShotOk) {
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
  const ok =
    homepageMode === "live_check"
      ? liveCheckOk
      : homepageMode === "share_clip"
        ? clipSaved
        : preview.ok || browserlessShotOk || userVerifiedCapture;
  const pageTitle =
    preview.ok && preview.title ? preview.title.slice(0, 300) : undefined;

  const processingDetailWithoutPreview =
    !preview.ok && ok
      ? liveCheckOk
        ? formatProcessingDetailLiveCheck(regionLabel)
        : clipSaved
          ? formatProcessingDetailShareClip(regionLabel)
          : browserlessShotOk
            ? formatProcessingDetailScreenshotVerified(regionLabel)
            : formatProcessingDetailRecordedWithImage(regionLabel)
      : null;

  const successNote = (() => {
    if (!ok) return "取得に失敗しました";
    if (liveCheckOk) {
      return `${noteParts.join(" — ")} — ライブ確認のみ。動きは保存していません`;
    }
    if (clipSaved) {
      return `${noteParts.join(" — ")} — 短い動画を保存`;
    }
    if (preview.ok) return noteParts.join(" — ");
    if (browserlessShotOk) return `${noteParts.join(" — ")} — スクリーンショットで確認済み`;
    if (userVerifiedCapture) return `${noteParts.join(" — ")} — 確認画像で記録済み`;
    return noteParts.join(" — ");
  })();

  let captureConditions: CaptureConditionsV1;
  if (lastLive) {
    captureConditions = buildCaptureConditionsFromBrowserless({
      capturedAt,
      regionInput: regionValue,
      regionLabel,
      fullPageRequested: false,
      viaResidential: lastLive.viaResidential,
      viaExternalProxy: lastLive.viaExternalProxy,
      usedRetryWithoutProxy: lastLive.usedRetryWithoutProxy,
      residentialStateApplied: lastLive.residentialStateApplied,
      durationMs: lastLive.durationMs,
      storageFormat: "none",
      webpQuality: null,
      imageWidthPx: null,
      imageHeightPx: null,
      snapshotBytes: null,
      snapshotContentType: null,
      snapshotSha256Present: false,
      apiSurface: "live_bql",
      upstreamImageFormat: "none",
      homepageObservation: {
        mode: "live_check",
        sequential_stills: false,
        live_ttl_ms: HOMEPAGE_LIVE_TTL_MS,
      },
    });
  } else if (lastClip) {
    captureConditions = buildCaptureConditionsFromBrowserless({
      capturedAt,
      regionInput: regionValue,
      regionLabel,
      fullPageRequested: false,
      viaResidential: lastClip.viaResidential,
      viaExternalProxy: lastClip.viaExternalProxy,
      usedRetryWithoutProxy: lastClip.usedRetryWithoutProxy,
      residentialStateApplied: lastClip.residentialStateApplied,
      durationMs: lastClip.durationMs,
      storageFormat: "webm",
      webpQuality: null,
      imageWidthPx: 1280,
      imageHeightPx: 800,
      snapshotBytes: snapshotBytes ?? null,
      snapshotContentType: snapshotContentType ?? null,
      snapshotSha256Present: Boolean(snapshotBinarySha256),
      apiSurface: "screencast_v2",
      upstreamImageFormat: "webm",
      clipDurationMs: HOMEPAGE_CLIP_DURATION_MS,
      homepageObservation: {
        mode: "share_clip",
        sequential_stills: false,
        clip_duration_ms: HOMEPAGE_CLIP_DURATION_MS,
      },
    });
  } else if (lastWorkerShot) {
    const dims = await getPngDimensions(lastWorkerShot.png);
    const webpQuality = session.plan === "pro" ? 86 : 78;
    captureConditions = buildCaptureConditionsFromPlaywrightWorker({
      capturedAt,
      regionInput: regionValue,
      regionLabel,
      fullPageRequested: plan.snapshotFullPage,
      observedCountry: lastWorkerShot.observed.country,
      observedState: lastWorkerShot.observed.region,
      viaResidentialProxy: lastWorkerShot.viaResidentialProxy,
      durationMs: lastWorkerShot.durationMs,
      storageFormat: "webp",
      webpQuality,
      imageWidthPx: dims?.width ?? null,
      imageHeightPx: dims?.height ?? null,
      snapshotBytes: snapshotBytes ?? null,
      snapshotContentType: snapshotContentType ?? null,
      snapshotSha256Present: Boolean(snapshotBinarySha256),
    });
    if (lastWorkerShot.htmlSignals) {
      captureConditions = { ...captureConditions, html_signals: lastWorkerShot.htmlSignals };
    }
  } else if (lastBrowserlessShot) {
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
      residentialStateApplied: lastBrowserlessShot.residentialStateApplied ?? false,
      stateVerified: lastBrowserlessShot.stateVerified === true,
      fallbackLevel: lastBrowserlessShot.fallbackLevel ?? null,
      geoAttempts: lastBrowserlessShot.geoAttempts ?? null,
      stateTargetingRejected: lastBrowserlessShot.stateTargetingRejected === true,
      verifiedMeasurements: lastBrowserlessShot.verifiedMeasurements,
      proxyProvider: lastBrowserlessShot.proxyProvider,
      durationMs: lastBrowserlessShot.durationMs ?? null,
      estimatedTimeUnits: lastBrowserlessShot.estimatedTimeUnits ?? null,
      proxyBytes: lastBrowserlessShot.proxyBytes ?? null,
      proxyBytesMeasuredAttempts: lastBrowserlessShot.proxyBytesMeasuredAttempts ?? null,
      fallback: lastBrowserlessShot.usedRetryWithoutProxy ?? false,
      attempts: lastBrowserlessShot.attempts ?? null,
      attemptsLog: lastBrowserlessShot.attemptsLog ?? null,
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

  if (
    !captureConditions.html_signals &&
    preview.ok &&
    htmlHeadSignalsHasAny(preview.htmlSignals)
  ) {
    captureConditions = { ...captureConditions, html_signals: preview.htmlSignals };
  }
  try {
    const webFacts = await collectObservationWebFacts({
      target: url,
      observedAt: new Date().toISOString(),
      preview: preview.ok
        ? {
            status: preview.status,
            final_url: preview.canonicalUrl,
            via_proxy: preview.viaProxy,
            headers: preview.headers,
            html_sample_sha256: preview.htmlSampleSha256,
            html_sample_bytes: preview.htmlSampleBytes,
            html_sample_truncated: preview.htmlSampleTruncated,
          }
        : undefined,
    });
    if (webFacts) captureConditions = { ...captureConditions, web_facts: webFacts };
    captureConditions = stampMeasurement(captureConditions);
  } catch (err) {
    console.warn("[observation] web facts unavailable", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
  const seoFacts = seoFactsForObservation({
    requestedUrl: url,
    storedHtmlSignals: captureConditions.html_signals,
    preview: preview.ok
      ? { ok: true, html: preview.html, htmlSignals: preview.htmlSignals }
      : { ok: false },
    webFacts: captureConditions.web_facts,
  });
  if (seoFacts) captureConditions = { ...captureConditions, seo_facts: seoFacts };
  if (input.deviceClass) captureConditions = applyRequestedDevice(captureConditions, input.deviceClass);
  setSpanAttrs(span, {
    [ATTR.engine]: captureConditions.engine.name,
    [ATTR.observedCountry]: captureConditions.geo.country,
    [ATTR.observedState]: captureConditions.geo.state,
    [ATTR.stateVerified]: captureConditions.geo.state_verified ?? null,
    [ATTR.fallbackLevel]: captureConditions.geo.fallback_level ?? null,
    "viewtrace.observation.status": ok ? "success" : "failure",
    "viewtrace.observation.snapshot_stored": Boolean(snapshotBinarySha256),
    "viewtrace.observation.microlink": usedMicrolink,
  });

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
    retentionDays: await readScreenshotRetentionDays(session.userId, session.plan),
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
    return { ok: false, code: "monthly_limit" };
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
    return { ok: true, id, liveUrl };
  }

  return { ok: false, code: "invalid" };
}

export async function recordObservationForRegionAction(
  formData: FormData,
): Promise<RecordObservationResult> {
  return recordOneObservation(parseObservationForm(formData));
}

export async function recordWebVerifiedObservationAction(formData: FormData): Promise<void> {
  const result = await recordOneObservation(parseObservationForm(formData));
  if (result.ok) {
    redirect(`/dashboard/observations/${result.id}`);
  }
  if (result.code === "unauthenticated") {
    redirect("/login?next=/dashboard/observations/new");
  }
  if (result.code === "trial_expired") {
    redirect("/checkout?plan=starter&reason=trial_expired");
  }
  if (result.code === "trial_limit") {
    redirect("/checkout?plan=starter&reason=trial_observation_limit");
  }
  if (result.code === "monthly_limit") {
    redirect("/dashboard/observations/new?error=limit");
  }
  redirect("/dashboard/observations/new?error=invalid");
}
