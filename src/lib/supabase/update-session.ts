import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { authCookieContextFromNextRequest } from "@/lib/supabase/auth-request-context";
import { supabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { normalizeSupabaseUrl } from "@/lib/supabase/url";

/**
 * 各リクエストの先頭で Auth トークンを更新し、Cookie を request / response 両方に書く。
 * Server Component 側の getUser が古い refresh token で再更新し、ローテーション競合で
 * `/login` に戻るのを防ぐ（@supabase/ssr の Next.js 推奨パターン）。
 */
export async function updateSupabaseSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!rawUrl || !anonKey) {
    return supabaseResponse;
  }

  const url = normalizeSupabaseUrl(rawUrl);
  const cookieCtx = authCookieContextFromNextRequest(request);

  const supabase = createServerClient(url, anonKey, {
    cookieOptions: supabaseCookieOptions(cookieCtx.host, cookieCtx.isHttps),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value);
          });
        }
      },
    },
  });

  await supabase.auth.getUser();

  return supabaseResponse;
}
