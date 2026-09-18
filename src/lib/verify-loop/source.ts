import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sanitizeVerifyTokenParam } from "@/lib/observation-verify-token";

export type VerifyLoopSource = {
  observationId: string;
  sourceUserId: string | null;
  verifyToken: string;
};

export async function resolveVerifyLoopSource(
  tokenRaw: string,
): Promise<VerifyLoopSource | null> {
  const token = sanitizeVerifyTokenParam(tokenRaw);
  if (!token) return null;
  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("observations")
    .select("id,user_id,verify_token")
    .eq("verify_token", token)
    .maybeSingle();

  if (error || !data) return null;
  const observationId = typeof data.id === "string" ? data.id : "";
  if (!observationId) return null;
  return {
    observationId,
    sourceUserId: typeof data.user_id === "string" ? data.user_id : null,
    verifyToken: token,
  };
}
