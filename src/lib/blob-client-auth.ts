/**
 * Vercel Blob 認証。
 * 本番・Preview では短命の OIDC（VERCEL_OIDC_TOKEN + BLOB_STORE_ID）を使う。
 * 長い BLOB_READ_WRITE_TOKEN はローカル／OIDC 未設定時のフォールバックだけ。
 * `token` を渡すと SDK が OIDC を使わないので、OIDC が使えるときは渡さない。
 */
export type BlobClientAuth = {
  mode: "oidc" | "rw_token";
  options: { token?: string };
};

export function blobClientAuth(): BlobClientAuth | null {
  const oidc = process.env.VERCEL_OIDC_TOKEN?.trim();
  if (oidc) {
    return { mode: "oidc", options: {} };
  }
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) {
    return { mode: "rw_token", options: { token } };
  }
  return null;
}
