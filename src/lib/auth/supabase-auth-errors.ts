import type { AuthError } from "@supabase/supabase-js";

/** Supabase 側に refresh token が無い／失効している（Cookie だけ古い状態） */
export function isStaleRefreshTokenError(error: AuthError): boolean {
  const code = error.code ?? "";
  if (code === "refresh_token_not_found" || code === "invalid_refresh_token") {
    return true;
  }
  const m = error.message?.toLowerCase() ?? "";
  return m.includes("refresh token not found") || m.includes("invalid refresh token");
}

export function isBenignMissingSessionError(error: AuthError): boolean {
  if (error.name === "AuthSessionMissingError") return true;
  const m = error.message?.toLowerCase() ?? "";
  return m.includes("auth session missing");
}
