/**
 * サーバー側 fetch / ヘッドレスブラウザでサイトを取得するときに使う共通のブラウザ風指紋。
 *
 * Akamai / Imperva 等のボット保護を入れている大手サイト（onamae.com 等）は
 *   - 明らかな非ブラウザ UA（`Mozilla/5.0 ... HeadlessChrome/...` を含む）
 *   - `Accept-Language` が空
 * を即 403/406/429 で弾く。`url-preview-fetch.ts` と `browserless-screenshot.ts` で
 * 同じ値を使うため、定数として 1 箇所にまとめて管理する。
 */

/** 直近の安定版 Chrome on macOS の UA（Browserless 既定 `HeadlessChrome` を避ける） */
export const BROWSER_LIKE_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";

/** 日本語サイト優先、英語フォールバック */
export const BROWSER_LIKE_ACCEPT_LANGUAGE = "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7";

/** `<browser>` 経由の HTML fetch で送るヘッダ一式 */
export const BROWSER_LIKE_HEADERS: Record<string, string> = {
  "User-Agent": BROWSER_LIKE_USER_AGENT,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": BROWSER_LIKE_ACCEPT_LANGUAGE,
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};
