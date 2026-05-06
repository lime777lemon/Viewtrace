import { createBrowserClient } from "@supabase/ssr";
import { supabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { normalizeSupabaseUrl } from "@/lib/supabase/url";

/**
 * ブラウザ（Client Component）用。`NEXT_PUBLIC_*` はビルド時に埋め込まれます。
 */
export function createSupabaseBrowserClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!rawUrl || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local.",
    );
  }

  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";

  return createBrowserClient(normalizeSupabaseUrl(rawUrl), anonKey, {
    cookieOptions: supabaseCookieOptions(host, isHttps),
  });
}
