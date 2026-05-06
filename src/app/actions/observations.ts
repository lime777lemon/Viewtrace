"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import type { Observation } from "@/lib/demo/observations";
import { appendUserObservation } from "@/lib/demo/user-observations";
import { getPlan } from "@/lib/plans";
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

  const id = `obs_u_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const noteParts = ["Webサイト確認に基づく記録"];
  if (verifiedTitle) noteParts.push(`確認時タイトル: ${verifiedTitle.slice(0, 200)}`);

  const snapshotImageUrl =
    /^https?:\/\//i.test(verifiedImageUrl) && verifiedImageUrl.length < 2048 ? verifiedImageUrl : undefined;

  const capturedAt = new Date().toISOString();

  const plan = getPlan(session.plan);
  const preview = await runUrlPreviewFetch(url, {
    screenshotFallback: true,
    fullPageScreenshot: plan.snapshotFullPage,
    regionValue,
  });

  const ok = preview.ok;
  const pageTitle = ok && preview.title ? preview.title.slice(0, 300) : undefined;
  const previewImage =
    ok && preview.image && /^https?:\/\//i.test(preview.image) ? preview.image.slice(0, 2048) : undefined;

  const obs: Observation = {
    id,
    url,
    regionLabel,
    capturedAt,
    status: ok ? "success" : "failure",
    note: ok ? noteParts.join(" — ") : `取得に失敗しました（${preview.error}）`,
    pageTitle: pageTitle ?? (verifiedTitle ? verifiedTitle.slice(0, 300) : undefined),
    snapshotImageUrl: snapshotImageUrl ?? previewImage,
    events: [
      {
        at: capturedAt,
        kind: "processing",
        label: "地域別アクセスで取得",
        detail: ok
          ? `region=${regionValue} status=${preview.status} proxy=${preview.viaProxy ? "on" : "off"}`
          : `region=${regionValue} error=${preview.error}`,
      },
      {
        at: capturedAt,
        kind: "capture",
        label: "メタ情報・プレビュー画像を保存",
        detail: (snapshotImageUrl ?? previewImage) ? "プレビュー画像 URL を紐づけ" : "画像なし",
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
