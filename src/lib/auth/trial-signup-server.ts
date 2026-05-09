import type { SupabaseClient } from "@supabase/supabase-js";
import { profileMetaFromUserMetadata } from "@/lib/auth/profile-meta";

/** メール確認・OAuth 後に trial_signups へ追記（重複メールは無視） */
export async function insertTrialSignupRow(
  supabase: SupabaseClient,
  email: string,
  locale: "ja" | "en",
  meta: Record<string, unknown> | undefined,
): Promise<void> {
  const p = profileMetaFromUserMetadata(meta);
  const { error } = await supabase.from("trial_signups").insert({
    email,
    locale,
    source: "auth",
    full_name: p.full_name,
    company_name: p.company_name,
    phone: p.phone,
  });
  if (error && error.code !== "23505") {
    console.warn("[auth] trial_signups insert failed", error.code, error.message);
  }
}
