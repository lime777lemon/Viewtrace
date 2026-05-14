import { type NextFetchEvent, type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { getOpsSignalRouteSecret, isOpsMonitoringDisabled } from "@/lib/ops/alert-config";
import { isSuspiciousRequestUrl } from "@/lib/ops/suspicious-request";

/**
 * ダッシュボード配下のみ通す軽量ミドルウェア。
 *
 * Edge で `getUser()` してリフレッシュすると、同一リクエスト内で
 * `dashboard/layout` の `getSession()`（別ランタイム）がまだ古い Cookie を読み、
 * リフレッシュトークン競合で `getUser` が失敗 → `/login` に戻ることがある（本番で顕在化しやすい）。
 * セッション更新は `createSupabaseServerClient` + `getSession()` に任せる。
 *
 * `/api/*` では疑わしいパスを検知し、非同期で内部シグナル API に記録（異常リクエスト検知）。
 */
export function middleware(request: NextRequest, event: NextFetchEvent) {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!rawUrl || !anonKey) {
    if (request.nextUrl.pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  const res = NextResponse.next({ request });

  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    if (request.cookies.get(SESSION_COOKIE)) {
      res.cookies.delete(SESSION_COOKIE);
    }
  }

  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;

  if (
    pathname.startsWith("/api/") &&
    !isOpsMonitoringDisabled() &&
    isSuspiciousRequestUrl(pathname, search)
  ) {
    const secret = getOpsSignalRouteSecret();
    if (secret) {
      const url = new URL("/api/internal/ops-signal", request.url);
      const payload = JSON.stringify({
        signal_type: "suspicious_request",
        path: pathname,
        search,
      });
      event.waitUntil(
        fetch(url, {
          method: "POST",
          headers: {
            authorization: `Bearer ${secret}`,
            "content-type": "application/json",
          },
          body: payload,
        }).catch(() => undefined),
      );
    }
  }

  return res;
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/api/:path*"],
};
