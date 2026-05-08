"use server";

import { redirect } from "next/navigation";
import { appendAuditEvent, AUDIT_ACTION } from "@/lib/audit-log";
import { getSession } from "@/lib/auth/session";
import { isBrowserlessConfigured, runBrowserlessScreenshot } from "@/lib/browserless-screenshot";
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
import { normalizeUserUrlInput } from "@/lib/url-preview";
import { runUrlPreviewFetch } from "@/lib/url-preview-fetch";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
    const shot = await runBrowserlessScreenshot({
      url,
      region: regionValue,
      fullPage: plan.snapshotFullPage,
    });
    if (shot.ok) {
      browserlessShotOk = true;
      // Keep text/UI readable: Starter is slightly more compressed, Pro keeps higher quality.
      const webpQuality = session.plan === "starter" ? 78 : 86;
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

  if (!snapshotImageUrl && preview.ok) {
    const fallback = await runUrlPreviewFetch(url, {
      screenshotFallback: true,
      fullPageScreenshot: plan.snapshotFullPage,
      regionValue,
    });
    if (fallback.ok && fallback.image && /^https?:\/\//i.test(fallback.image)) {
      snapshotImageUrl = fallback.image.slice(0, 2048);
    }
  }

  const captureDetail = (() => {
    if (snapshotImageUrl) {
      if (verifiedSnap && snapshotImageUrl === verifiedSnap) return "フォームの確認画像";
      if (uploadedBrowserlessUrl && snapshotImageUrl === uploadedBrowserlessUrl) {
        return "Browserless スナップショット（Vercel Blob）";
      }
      return "プレビュー画像（OG / Microlink 等）";
    }
    if (blobUploadResult && !blobUploadResult.ok) {
      if (blobUploadResult.code === "token_missing") {
        return "snapshot_image_url なし — BLOB_READ_WRITE_TOKEN が未設定のため Vercel Blob にアップロードできません";
      }
      if (blobUploadResult.code === "url_too_long") {
        return "snapshot_image_url なし — Blob の公開URLが長すぎるため保存をスキップしました";
      }
      return `snapshot_image_url なし — Vercel Blob アップロード失敗${blobUploadResult.message ? `（${blobUploadResult.message}）` : ""}`;
    }
    if (browserlessShotOk) {
      return "snapshot_image_url なし — Browserless は成功しましたが画像URLが確定しませんでした";
    }
    if (browserlessOn && !browserlessShotOk) {
      return "snapshot_image_url なし — Browserless キャプチャに失敗し、プレビューからも画像URLを得られませんでした";
    }
    if (!preview.ok) {
      return `snapshot_image_url なし — プレビュー取得失敗（${preview.error}）`;
    }
    return "snapshot_image_url なし — スクリーンショット・プレビューのいずれからも画像URLを取得できませんでした";
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
        ? `region=${regionValue} · スクリーンショットで確認済み${browserlessDetail ? `（${browserlessDetail}）` : ""}`
        : `region=${regionValue} · 確認画像で記録済み`
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
        label: "地域別アクセスで取得",
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
        label: "スナップショットを記録",
        detail: captureDetail,
      },
      {
        at: capturedAt,
        kind: "status",
        label: "オブザベーション登録",
        detail: `${ok ? "成功" : "失敗"} — 確認情報をDBに保存`,
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
      action: AUDIT_ACTION.OBSERVATION_RECORD,
      resourceType: "observation",
      resourceId: id,
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
      action: AUDIT_ACTION.OBSERVATION_RECORD,
      resourceType: "observation",
      resourceId: id,
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
