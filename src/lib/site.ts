/** 公開サイトのドメイン（正規ホスト名） */
export const siteDomain = "viewtrace.net";

const rawOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();

/** 正規オリジン（OG・metadataBase 用）。未設定時は本番想定の https://viewtrace.net */
export const siteOrigin = rawOrigin
  ? rawOrigin.replace(/\/$/, "")
  : `https://${siteDomain}`;

/** お問い合わせ・サポート・法務表記で共通して用いる連絡先 */
export const siteEmail = "info@viewtrace.net";

/** プライバシーポリシー等（siteEmail と同一） */
export const supportEmail = siteEmail;

/** お問い合わせページ等（siteEmail と同一） */
export const contactEmail = siteEmail;
