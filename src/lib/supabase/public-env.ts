import { normalizeSupabaseUrl } from "@/lib/supabase/url";

export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

/** Preview に Production 専用の NEXT_PUBLIC_SUPABASE_* が無いとここは null */
export function readSupabasePublicEnv(): SupabasePublicEnv | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!rawUrl || !anonKey) return null;
  return { url: normalizeSupabaseUrl(rawUrl), anonKey };
}

export function missingSupabasePublicEnvMessage(): string {
  return "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY for this environment.";
}
