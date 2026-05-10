import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * ダッシュボード配下のみ通す軽量ミドルウェア。
 *
 * Edge で `getUser()` してリフレッシュすると、同一リクエスト内で
 * `dashboard/layout` の `getSession()`（別ランタイム）がまだ古い Cookie を読み、
 * リフレッシュトークン競合で `getUser` が失敗 → `/login` に戻ることがある（本番で顕在化しやすい）。
 * セッション更新は `createSupabaseServerClient` + `getSession()` に任せる。
 */
export function middleware(request: NextRequest) {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!rawUrl || !anonKey) {
    if (request.nextUrl.pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  const res = NextResponse.next({ request });

  if (request.cookies.get(SESSION_COOKIE)) {
    res.cookies.delete(SESSION_COOKIE);
  }

  return res;
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
