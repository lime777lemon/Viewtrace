"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isBrowserlessConfigured, runBrowserlessScreenshot } from "@/lib/browserless-screenshot";
import type { Observation } from "@/lib/demo/observations";
import {
  appendUserObservation,
  countObservationsSinceTrialStart,
  readUserObservations,
} from "@/lib/demo/user-observations";
import { uploadObservationSnapshotPng } from "@/lib/observation-snapshot-storage";
import { getPlan, TRIAL_CONFIG } from "@/lib/plans";
import { getRegionOptions } from "@/lib/regions";
import { normalizeUserUrlInput } from "@/lib/url-preview";
import { runUrlPreviewFetch } from "@/lib/url-preview-fetch";

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

  const id = `obs_u_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
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

  if (browserlessOn) {
    const shot = await runBrowserlessScreenshot({
      url,
      region: regionValue,
      fullPage: plan.snapshotFullPage,
    });
    if (shot.ok) {
      uploadedBrowserlessUrl = await uploadObservationSnapshotPng(id, shot.png);
      if (uploadedBrowserlessUrl) {
        snapshotImageUrl = snapshotImageUrl ?? uploadedBrowserlessUrl;
        browserlessDetail = "Browserless→Blob 成功";
      } else {
        browserlessDetail = "Browserless 成功・BLOB_READ_WRITE_TOKEN 未設定のため URL 未保存";
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

  const captureDetail = !snapshotImageUrl
    ? "画像なし"
    : verifiedSnap && snapshotImageUrl === verifiedSnap
      ? "フォームの確認画像"
      : uploadedBrowserlessUrl && snapshotImageUrl === uploadedBrowserlessUrl
        ? "Browserless スナップショット（Vercel Blob）"
        : "プレビュー画像（OG / Microlink 等）";

  const ok = preview.ok;
  const pageTitle = ok && preview.title ? preview.title.slice(0, 300) : undefined;

  const obs: Observation = {
    id,
    url,
    regionLabel,
    capturedAt,
    status: ok ? "success" : "failure",
    note: ok ? noteParts.join(" — ") : `取得に失敗しました（${preview.error}）`,
    pageTitle: pageTitle ?? (verifiedTitle ? verifiedTitle.slice(0, 300) : undefined),
    snapshotImageUrl,
    events: [
      {
        at: capturedAt,
        kind: "processing",
        label: "地域別アクセスで取得",
        detail: ok
          ? `region=${regionValue} status=${preview.status} proxy=${preview.viaProxy ? "on" : "off"}${browserlessDetail ? ` · ${browserlessDetail}` : ""}`
          : `region=${regionValue} error=${preview.error}`,
      },
      {
        at: capturedAt,
        kind: "capture",
        label: "スナップショット・メタ情報",
        detail: captureDetail,
      },
      {
        at: capturedAt,
        kind: "status",
        label: "オブザベーション登録",
        detail: `${ok ? "成功" : "失敗"}（クッキー保存）`,
      },
    ],
  };

  const saved = await appendUserObservation(obs, {
    retentionDays: plan.retentionDays,
    monthlyLimit: plan.monthlyObservations,
  });
  if (!saved.ok && saved.code === "monthly_limit") {
    redirect("/dashboard/observations/new?error=limit");
  }
  redirect(`/dashboard/observations/${id}`);
}
