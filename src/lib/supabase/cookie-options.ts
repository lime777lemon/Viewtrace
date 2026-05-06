import type { CookieOptionsWithName } from "@supabase/ssr";

/** 本番 apex / www で PKCE・セッション Cookie を同一ドメインに揃える */
export function supabaseCookieOptions(hostname: string, isHttps: boolean): CookieOptionsWithName {
  const base: CookieOptionsWithName = {
    path: "/",
    sameSite: "lax",
    secure: isHttps,
  };
  if (hostname === "viewtrace.net" || hostname.endsWith(".viewtrace.net")) {
    return { ...base, domain: ".viewtrace.net" };
  }
  return base;
}
