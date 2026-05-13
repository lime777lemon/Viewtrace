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
  /**
   * true のとき、地域プロキシで失敗した場合に直アクセスで 1 回だけ再試行する。
   * - 取得成功率は上がるが「地域別アクセス」の保証はできないため、デフォルトは false。
   */
  retryWithoutProxyOnFailure?: boolean;
};

/** サーバー側で HTML を取得し OG / title を解決（API ルートと詳細ページで共用） */
export async function runUrlPreviewFetch(
  target: string,
  options: UrlPreviewFetchOptions = {},
): Promise<UrlPreviewResult> {
  const screenshotFallback = options.screenshotFallback === true;
  const fullPageScreenshot = options.fullPageScreenshot === true;
  const regionValue = options.regionValue?.trim();
  const retryWithoutProxyOnFailure = options.retryWithoutProxyOnFailure === true;
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

  const deadlineMs = 14_000;
  const startedAt = Date.now();
  const remainingMs = () => Math.max(1_000, deadlineMs - (Date.now() - startedAt));

  const proxy = regionValue ? getGeoProxyAgent(regionValue) : null;

  async function attemptFetch(dispatcher?: unknown): Promise<Response> {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), remainingMs());
    try {
      return await fetch(target, {
        redirect: "follow",
        signal: ac.signal,
        ...(dispatcher ? { dispatcher } : {}),
        headers: {
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          "User-Agent": "Viewtrace-UrlPreview/1.0 (+https://viewtrace.net)",
        },
      });
    } finally {
      clearTimeout(timer);
    }
  }

  function classifyNetworkError(err: unknown): "timeout" | "network_error" {
    if (err instanceof Error && err.name === "AbortError") {
      return "timeout";
    }
    return "network_error";
  }

  /** 自前 fetch が届かないときでも、Microlink 側の取得でスナップショット URL だけ確保する */
  async function tryMicrolinkAfterFetchFailure(): Promise<UrlPreviewResult | null> {
    if (!screenshotFallback) return null;
    const imageOut = await fetchMicrolinkScreenshotUrl(target, {
      fullPage: fullPageScreenshot,
    });
    if (!imageOut) return null;
    return {
      ok: true,
      canonicalUrl: target,
      title: null,
      image: imageOut,
      html: false,
      status: 0,
      headers: {},
      viaProxy: false,
    };
  }

  async function failFetch(kind: "timeout" | "network_error"): Promise<UrlPreviewResult> {
    const ml = await tryMicrolinkAfterFetchFailure();
    return ml ?? { ok: false, error: kind };
  }

  try {
    let res: Response;
    let usedProxy = Boolean(proxy);
    try {
      res = await attemptFetch(proxy?.dispatcher);
    } catch (err) {
      const kind = classifyNetworkError(err);
      const errName = err instanceof Error ? err.name : "UnknownError";
      const errCode =
        err instanceof Error && "code" in err && typeof (err as { code: unknown }).code === "string"
          ? (err as { code: string }).code
          : undefined;
      const errMsg = err instanceof Error ? err.message : String(err);

      // NOTE: proxy URL には資格情報が含まれるため絶対にログしない
      console.warn("[url-preview] fetch failed", {
        kind,
        region: regionValue ?? null,
        viaProxy: Boolean(proxy),
        errName,
        errCode,
        errMsg: errMsg.slice(0, 300),
      });

      // プロキシ経由だけが落ちるケースの救済（ただし地域保証はできない）
      if (proxy && retryWithoutProxyOnFailure && remainingMs() > 1_500) {
        try {
          res = await attemptFetch(undefined);
          usedProxy = false;
        } catch {
          return failFetch(kind);
        }
      } else {
        return failFetch(kind);
      }
    }

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
      viaProxy: usedProxy,
    };
  } catch (err) {
    const kind = classifyNetworkError(err);
    const errName = err instanceof Error ? err.name : "UnknownError";
    const errCode =
      err instanceof Error && "code" in err && typeof (err as { code: unknown }).code === "string"
        ? (err as { code: string }).code
        : undefined;
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn("[url-preview] unexpected failure", {
      kind,
      region: regionValue ?? null,
      viaProxy: Boolean(proxy),
      errName,
      errCode,
      errMsg: errMsg.slice(0, 300),
    });
    const ml = await tryMicrolinkAfterFetchFailure();
    return ml ?? { ok: false, error: kind };
  }
}
