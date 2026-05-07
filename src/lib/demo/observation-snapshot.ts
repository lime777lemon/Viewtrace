import { cache } from "react";
import { isBlockedPreviewHost } from "@/lib/url-preview";
import { runUrlPreviewFetch } from "@/lib/url-preview-fetch";

/** 詳細ページ用: 記録 URL のライブプレビュー（同一リクエスト内で重複取得しない） */
export const getCachedUrlPreviewForObservation = cache(async (url: string, regionValue?: string) => {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (isBlockedPreviewHost(u.hostname)) return null;
    const r = await runUrlPreviewFetch(url, { screenshotFallback: false, regionValue });
    return r.ok ? r : null;
  } catch {
    return null;
  }
});
