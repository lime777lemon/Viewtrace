"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import type { Observation } from "@/lib/demo/observations";
import { appendUserObservation } from "@/lib/demo/user-observations";
import { getRegionOptions } from "@/lib/regions";
import { normalizeUserUrlInput } from "@/lib/url-preview";

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
    /^https?:\/\//i.test(verifiedImageUrl) && verifiedImageUrl.length < 2048
      ? verifiedImageUrl
      : undefined;

  const capturedAt = new Date().toISOString();
  const obs: Observation = {
    id,
    url,
    regionLabel,
    capturedAt,
    status: "success",
    note: noteParts.join(" — "),
    pageTitle: verifiedTitle ? verifiedTitle.slice(0, 300) : undefined,
    snapshotImageUrl,
    events: [
      {
        at: capturedAt,
        kind: "processing",
        label: "Web での表示を確認",
        detail: "プレビューに基づき記録を作成",
      },
      {
        at: capturedAt,
        kind: "capture",
        label: "メタ情報・プレビュー画像を保存",
        detail: snapshotImageUrl ? "OG 画像 URL を紐づけ" : "画像なし",
      },
      {
        at: capturedAt,
        kind: "status",
        label: "オブザベーション登録",
        detail: "成功（デモ・クッキー保存）",
      },
    ],
  };

  await appendUserObservation(obs);
  redirect(`/dashboard/observations/${id}`);
}
