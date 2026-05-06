import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { supabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { normalizeSupabaseUrl } from "@/lib/supabase/url";

async function hostAndHttpsFromHeaders(): Promise<{ host: string; isHttps: boolean }> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-host");
  const host = (forwarded?.split(",")[0]?.trim() || h.get("host") || "localhost").split(
    ":",
  )[0];
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const isHttps = proto === "https";
  return { host, isHttps };
}

/**
 * Server Component / Server Action / Route Handler 用。
 * Cookie 経由で Auth セッションをやり取りします。
 */
export async function createSupabaseServerClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!rawUrl || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local.",
    );
  }

  const url = normalizeSupabaseUrl(rawUrl);
  const cookieStore = await cookies();
  const { host, isHttps } = await hostAndHttpsFromHeaders();

  return createServerClient(url, anonKey, {
    cookieOptions: supabaseCookieOptions(host, isHttps),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headers) {
        void headers;
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component からの呼び出し時は set できない場合あり。Middleware で更新する運用可。
        }
      },
    },
  });
}
