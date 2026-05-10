import { POST_EMAIL_VERIFY_PATH } from "@/lib/auth/email-verified-copy";

/**
 * `signUp({ options: { emailRedirectTo } })` に渡す URL を組み立てる。
 * メール内 verify リンクの `redirect_to` が
 * `{origin}/auth/callback?next=/auth/email-verified` になるようにする（パスは URL エンコードされる）。
 */
export function buildSignupEmailRedirectTo(pageOrigin: string): string {
  const u = new URL("/auth/callback", pageOrigin);
  u.searchParams.set("next", POST_EMAIL_VERIFY_PATH);
  return u.href;
}
