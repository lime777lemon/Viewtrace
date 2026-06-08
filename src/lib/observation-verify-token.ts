import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppOriginForEmailLinks } from "@/lib/site";

export const VERIFY_TOKEN_HEX_LENGTH = 48;

export function generateObservationVerifyToken(): string {
  return randomBytes(VERIFY_TOKEN_HEX_LENGTH / 2).toString("hex");
}

export function sanitizeVerifyTokenParam(raw: string): string | null {
  const t = raw.trim().toLowerCase();
  if (!/^[a-f0-9]{48}$/.test(t)) return null;
  return t;
}

export function buildPublicVerifyUrl(appOrigin: string, token: string): string {
  const origin = appOrigin.replace(/\/+$/, "");
  return `${origin}/verify/${token}`;
}

export function buildPublicVerifyUrlForObservation(token: string): string {
  return buildPublicVerifyUrl(getAppOriginForEmailLinks(), token);
}

/** Logged-in user: return existing token or set one (legacy rows). */
export async function ensureObservationVerifyTokenForUser(
  supabase: SupabaseClient,
  observationId: string,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return null;

  const { data: row } = await supabase
    .from("observations")
    .select("verify_token")
    .eq("id", observationId)
    .eq("user_id", user.id)
    .maybeSingle();

  const existing =
    typeof row?.verify_token === "string" && row.verify_token.length === VERIFY_TOKEN_HEX_LENGTH
      ? row.verify_token.toLowerCase()
      : null;
  if (existing) return existing;

  const token = generateObservationVerifyToken();
  const { data: updated, error } = await supabase
    .from("observations")
    .update({ verify_token: token, updated_at: new Date().toISOString() })
    .eq("id", observationId)
    .eq("user_id", user.id)
    .is("verify_token", null)
    .select("verify_token")
    .maybeSingle();

  if (!error && typeof updated?.verify_token === "string") {
    return updated.verify_token.toLowerCase();
  }

  const { data: again } = await supabase
    .from("observations")
    .select("verify_token")
    .eq("id", observationId)
    .eq("user_id", user.id)
    .maybeSingle();

  return typeof again?.verify_token === "string" ? again.verify_token.toLowerCase() : null;
}
