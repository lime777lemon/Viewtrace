import { createBrowserClient } from "@supabase/ssr";
import { supabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { missingSupabasePublicEnvMessage, readSupabasePublicEnv } from "@/lib/supabase/public-env";

/**
 * ブラウザ（Client Component）用。`NEXT_PUBLIC_*` はビルド時に埋め込まれます。
 */
export function createSupabaseBrowserClient() {
  const env = readSupabasePublicEnv();
  if (!env) {
    throw new Error(missingSupabasePublicEnvMessage());
  }

  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";

  return createBrowserClient(env.url, env.anonKey, {
    cookieOptions: supabaseCookieOptions(host, isHttps),
  });
}
