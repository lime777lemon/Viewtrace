import { createBrowserClient } from "@supabase/ssr";

/**
 * ブラウザ（Client Component）用。`NEXT_PUBLIC_*` はビルド時に埋め込まれます。
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local.",
    );
  }

  return createBrowserClient(url, anonKey);
}
