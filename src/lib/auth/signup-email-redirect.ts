/**
 * `signUp({ options: { emailRedirectTo } })` に渡す URL を組み立てる。
 *
 * クエリ（`?next=`）は付けない。Supabase の Redirect URLs が完全一致のみのとき、
 * `.../auth/callback?next=...` が拒否され確認メール自体が送れなくなることがある。
 * `next` 未指定時は `GET /auth/callback` 側で `/auth/email-verified` に既定フォールバックする。
 */
export function buildSignupEmailRedirectTo(pageOrigin: string): string {
  return new URL("/auth/callback", pageOrigin).href;
}
