/** 公開サイトのドメイン（正規ホスト名） */
export const siteDomain = "viewtrace.net";

const rawOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();

/**
 * `new URL()` 用の絶対オリジン（scheme + host [+ port] のみ）。
 * Vercel 等で `NEXT_PUBLIC_SITE_URL=viewtrace.net` のように **https を付け忘れると**
 * `layout` の `metadataBase: new URL(siteOrigin)` が例外になり **全ページ 500** になるため正規化する。
 */
function normalizePublicSiteOrigin(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return `https://${siteDomain}`;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed.replace(/^\/+/, "")}`;
    return new URL(withScheme).origin;
  } catch {
    return `https://${siteDomain}`;
  }
}

/** 正規オリジン（OG・metadataBase 用）。未設定時は本番想定の https://viewtrace.net */
export const siteOrigin = rawOrigin ? normalizePublicSiteOrigin(rawOrigin) : `https://${siteDomain}`;

/** お問い合わせ・サポート・法務表記で共通して用いる連絡先 */
export const siteEmail = "info@viewtrace.net";

/** プライバシーポリシー等（siteEmail と同一） */
export const supportEmail = siteEmail;

/** お問い合わせページ等（siteEmail と同一） */
export const contactEmail = siteEmail;
