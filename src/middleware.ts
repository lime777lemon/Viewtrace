import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { supabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { normalizeSupabaseUrl } from "@/lib/supabase/url";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const url = rawUrl ? normalizeSupabaseUrl(rawUrl) : "";
  if (!url || !anonKey) {
    if (request.nextUrl.pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookieOptions: supabaseCookieOptions(
      request.nextUrl.hostname,
      request.nextUrl.protocol === "https:",
    ),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        if (headers) {
          Object.entries(headers).forEach(([key, value]) => supabaseResponse.headers.set(key, value));
        }
      },
    },
  });

  // セッションの更新・Cookie 反映のため getUser を呼ぶ（公式推奨の直後に置く）。
  await supabase.auth.getUser();

  if (request.cookies.get(SESSION_COOKIE)) {
    supabaseResponse.cookies.delete(SESSION_COOKIE);
  }

  // 未ログインのリダイレクトは dashboard/layout.tsx の getSession() に任せる。
  // Edge の getUser が一時的に user を返さない・Link プリフェッチのタイミングで
  // 誤って /login へ飛ばすことがある（サイドナビ押下でログイン画面になる現象）。

  return supabaseResponse;
}

/**
 * ダッシュボードだけで getUser を呼ぶ。全ページ・全 API で走らせると開発時の連続リクエストで
 * Supabase Auth の over_request_rate_limit (429) に当たりやすい。
 */
export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
