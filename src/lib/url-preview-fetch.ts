import { fetchMicrolinkScreenshotUrl } from "@/lib/microlink-screenshot";
import {
  extractHtmlPreviewMeta,
  isBlockedPreviewHost,
  readHtmlHeadForPreview,
} from "@/lib/url-preview";
import { getGeoProxyAgent } from "@/lib/geo/proxy";

export type UrlPreviewResult =
  | {
      ok: true;
      canonicalUrl: string;
      title: string | null;
      image: string | null;
      html: boolean;
      status: number;
      headers: Record<string, string>;
      viaProxy: boolean;
    }
  | { ok: false; error: string };

export type UrlPreviewFetchOptions = {
  /**
   * true のとき、HTML から OG/Twitter 画像が取れなければ Microlink でスクリーンショット URL を補う。
   * 遅延・外部 API 依存があるため、SSR では false を推奨。
   */
  screenshotFallback?: boolean;
  /** true のとき Microlink のフルページキャプチャ（Pro 向け・遅くなりがち） */
  fullPageScreenshot?: boolean;
  /** 例: `US-CA`。設定された地理プロキシを使って取得する */
  regionValue?: string;
};

/** サーバー側で HTML を取得し OG / title を解決（API ルートと詳細ページで共用） */
export async function runUrlPreviewFetch(
  target: string,
  options: UrlPreviewFetchOptions = {},
): Promise<UrlPreviewResult> {
  const screenshotFallback = options.screenshotFallback === true;
  const fullPageScreenshot = options.fullPageScreenshot === true;
  const regionValue = options.regionValue?.trim();
  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return { ok: false, error: "invalid_url" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "invalid_url" };
  }

  if (isBlockedPreviewHost(parsed.hostname)) {
    return { ok: false, error: "forbidden_host" };
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 14_000);

  try {
    const proxy = regionValue ? getGeoProxyAgent(regionValue) : null;
    const res = await fetch(target, {
      redirect: "follow",
      signal: ac.signal,
      ...(proxy ? { dispatcher: proxy.dispatcher } : {}),
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "User-Agent": "Viewtrace-UrlPreview/1.0 (+https://viewtrace.net)",
      },
    });

    const finalUrl = res.url;
    let finalParsed: URL;
    try {
      finalParsed = new URL(finalUrl);
    } catch {
      return { ok: false, error: "invalid_response" };
    }

    if (isBlockedPreviewHost(finalParsed.hostname)) {
      return { ok: false, error: "forbidden_redirect" };
    }

    if (!res.ok) {
      return { ok: false, error: `fetch_failed:${res.status}` };
    }

    const ct = res.headers.get("content-type") ?? "";
    const htmlish = ct.includes("text/html") || ct.includes("application/xhtml");

    const headersOut: Record<string, string> = {};
    for (const [k, v] of res.headers.entries()) {
      const key = k.toLowerCase();
      // サイズ上限のため、重要ヘッダのみ保持
      if (
        key === "content-type" ||
        key === "content-language" ||
        key === "cache-control" ||
        key === "content-security-policy" ||
        key === "set-cookie" ||
        key === "x-frame-options" ||
        key === "x-robots-tag" ||
        key === "location"
      ) {
        headersOut[key] = v.slice(0, 500);
      }
    }

    if (!htmlish) {
      return {
        ok: true,
        canonicalUrl: finalUrl,
        title: null,
        image: null,
        html: false,
        status: res.status,
        headers: headersOut,
        viaProxy: Boolean(proxy),
      };
    }

    const chunk = await readHtmlHeadForPreview(res.body);
    const { title, image } = extractHtmlPreviewMeta(chunk, finalUrl);

    let imageOut = image;
    if (!imageOut && screenshotFallback) {
      imageOut = await fetchMicrolinkScreenshotUrl(finalUrl, {
        fullPage: fullPageScreenshot,
      });
    }

    return {
      ok: true,
      canonicalUrl: finalUrl,
      title,
      image: imageOut,
      html: true,
      status: res.status,
      headers: headersOut,
      viaProxy: Boolean(proxy),
    };
  } catch {
    return { ok: false, error: "network_error" };
  } finally {
    clearTimeout(timer);
  }
}
