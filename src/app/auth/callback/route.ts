import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { appendAuditEvent, AUDIT_ACTION } from "@/lib/audit-log";
import { supabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { normalizeSupabaseUrl } from "@/lib/supabase/url";

function resolveNextPath(searchParams: URLSearchParams): string {
  const nextRaw = searchParams.get("next")?.trim() ?? "/dashboard";
  return nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";
}

function localeFromRequest(request: NextRequest): "ja" | "en" {
  const accept = request.headers.get("accept-language")?.toLowerCase() ?? "";
  return accept.startsWith("ja") ? "ja" : "en";
}

async function recordTrialSignup(
  supabase: SupabaseClient,
  email: string,
  locale: "ja" | "en",
): Promise<void> {
  const { error } = await supabase.from("trial_signups").insert({
    email,
    locale,
    source: "auth",
  });
  if (error && error.code !== "23505") {
    console.warn("[auth] trial_signups insert failed", error.code, error.message);
  }
}

/**
 * メール確認・OAuth の戻り。PKCE の code はサーバーで Cookie と突き合わせて交換する
 * （クライアントだけだと code verifier が無く失敗することがある）。
 */
export async function GET(request: NextRequest) {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!rawUrl || !anonKey) {
    return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
  }

  const url = normalizeSupabaseUrl(rawUrl);
  const nextPath = resolveNextPath(request.nextUrl.searchParams);
  const redirectTarget = new URL(nextPath, request.url);

  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  // サーバーからは URL の #fragment が見えない。クライアント用に内部パスへ渡す。
  if (!code && !(tokenHash && type)) {
    const rewriteUrl = new URL("/auth/callback/fragment", request.url);
    rewriteUrl.searchParams.set("next", nextPath);
    return NextResponse.rewrite(rewriteUrl);
  }

  let redirectResponse = NextResponse.redirect(redirectTarget);

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
        redirectResponse = NextResponse.redirect(redirectTarget);
        cookiesToSet.forEach(({ name, value, options }) =>
          redirectResponse.cookies.set(name, value, options),
        );
        if (headers) {
          Object.entries(headers).forEach(([key, value]) => redirectResponse.headers.set(key, value));
        }
      },
    },
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const u = new URL("/auth/auth-code-error", request.url);
      u.searchParams.set("reason", error.message);
      return NextResponse.redirect(u);
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "recovery" | "invite" | "magiclink" | "email_change",
    });
    if (error) {
      const u = new URL("/auth/auth-code-error", request.url);
      u.searchParams.set("reason", error.message);
      return NextResponse.redirect(u);
    }
  }

  const locale = localeFromRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? null;
  if (email) {
    await recordTrialSignup(supabase, email, locale);
  }

  if (user?.id) {
    await appendAuditEvent(supabase, {
      action: AUDIT_ACTION.AUTH_SIGN_IN,
      meta: { method: "oauth" },
    });
  }

  return redirectResponse;
}
