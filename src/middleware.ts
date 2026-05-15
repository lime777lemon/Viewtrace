import { type NextFetchEvent, type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { getOpsSignalRouteSecret, isOpsMonitoringDisabled } from "@/lib/ops/alert-config";
import { isSuspiciousRequestUrl } from "@/lib/ops/suspicious-request";
import { updateSupabaseSession } from "@/lib/supabase/update-session";

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let res: NextResponse;
  if (rawUrl && anonKey) {
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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
