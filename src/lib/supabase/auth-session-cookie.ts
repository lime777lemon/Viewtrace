/**
 * @supabase/ssr が付けるセッショントークン Cookie があるか。
 * `sb-<ref>-auth-token` とチャンク（`.0` / `.1`）。code-verifier は含まない。
 */
export function hasSupabaseAuthSessionCookie(
  cookies: readonly { name: string }[],
): boolean {
  return cookies.some(
    (c) => c.name.includes("-auth-token") && !c.name.includes("code-verifier"),
  );
}
