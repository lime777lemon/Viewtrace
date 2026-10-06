import { type NextFetchEvent, type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { getOpsSignalRouteSecret, isOpsMonitoringDisabled } from "@/lib/ops/alert-config";
import { isSuspiciousRequestUrl } from "@/lib/ops/suspicious-request";
import { hasSupabaseAuthSessionCookie } from "@/lib/supabase/auth-session-cookie";
import { updateSupabaseSession } from "@/lib/supabase/update-session";

const PAGE_SAFE_METHODS = new Set(["GET", "HEAD"]);

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const pathname = request.nextUrl.pathname;
  // 秘密ファイル・スキャナ経路は受け口を作らず、関数まで通さず 404。
  if (isSuspiciousRequestUrl(pathname, "")) {
    return new NextResponse(null, { status: 404 });
  }
  // トップは静的ランディングのみ。スキャナの POST / を関数まで通さず 405 にする。
  // Next.js Server Action（Next-Action）だけは例外。
  if (
    pathname === "/" &&
    !PAGE_SAFE_METHODS.has(request.method) &&
    !request.headers.get("next-action")
  ) {
    return new NextResponse(null, {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  }

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let res: NextResponse;
  if (rawUrl && anonKey && hasSupabaseAuthSessionCookie(request.cookies.getAll())) {
    res = await updateSupabaseSession(request);
  } else {
    res = NextResponse.next({ request });
    if (request.nextUrl.pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    if (request.cookies.get(SESSION_COOKIE)) {
      res.cookies.delete(SESSION_COOKIE);
    }
  }

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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
