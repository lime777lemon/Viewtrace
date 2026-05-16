import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType, SupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { appendAuditEvent, AUDIT_ACTION } from "@/lib/audit-log";
import { POST_EMAIL_VERIFY_PATH } from "@/lib/auth/email-verified-copy";
import { insertTrialSignupRow } from "@/lib/auth/trial-signup-server";
import { authCookieContextFromNextRequest } from "@/lib/supabase/auth-request-context";
import { supabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { normalizeSupabaseUrl } from "@/lib/supabase/url";
import { sanitizeDashboardObservationHrefPath } from "@/lib/observation-route-id";

/**
 * メール確認の redirect で `next` が落ちると `/dashboard` へ行き「認証完了」画面を踏めなくなる。
 * 未指定時はメール確認用の `/auth/email-verified` を既定にする。
 * ソーシャルログイン等でダッシュボードへ直行したい場合は `?next=/dashboard` を付ける。
 */
function resolveNextPath(searchParams: URLSearchParams): string {
  const nextRaw = searchParams.get("next")?.trim() ?? POST_EMAIL_VERIFY_PATH;
  const base =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : POST_EMAIL_VERIFY_PATH;
  return sanitizeDashboardObservationHrefPath(base);
}

function localeFromRequest(request: NextRequest): "ja" | "en" {
  const accept = request.headers.get("accept-language")?.toLowerCase() ?? "";
  return accept.startsWith("ja") ? "ja" : "en";
}

/** Confirm signup links should use `type=email` (signup/magiclink are deprecated in verifyOtp). */
function emailOtpTypesForVerify(rawType: string | null): EmailOtpType[] {
  const t = rawType?.trim();
  if (!t) return ["email"];
  if (t === "signup" || t === "magiclink") return ["email"];
  if (t === "email") return ["email"];
  return [t as EmailOtpType];
}

/**
 * Browser PKCE signUp emails use `pkce_…` in `token_hash`; try code exchange first (same browser),
 * then verifyOtp for server-issued signup links.
 */
async function completeEmailLinkSession(
  supabase: SupabaseClient,
  tokenHash: string,
  rawType: string | null,
): Promise<Error | null> {
  if (tokenHash.startsWith("pkce_")) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(tokenHash);
    if (!exchangeError) return null;
  }

  let verifyError: Error | null = null;
  for (const otpType of emailOtpTypesForVerify(rawType)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });
    if (!error) return null;
    verifyError = error;
  }
  return verifyError;
}

async function finishSessionSideEffects(
  supabase: SupabaseClient,
  request: NextRequest,
): Promise<void> {
  const locale = localeFromRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? null;
  if (email) {
    await insertTrialSignupRow(
      supabase,
      email,
      locale,
      user?.user_metadata as Record<string, unknown> | undefined,
    );
  }

  if (user?.id) {
    await appendAuditEvent(supabase, {
      scope: "system",
      action: AUDIT_ACTION.AUTH_SIGN_IN,
      meta: { method: "email_verify" },
    });
  }
}

/**
 * メール確認・OAuth の戻り。
 *
 * PKCE の `code`: リクエストに付いた Cookie から verifier を読み、この Route Handler 内で
 * `exchangeCodeForSession` する（@supabase/ssr の推奨）。クライアントの `/auth/oauth-complete`
 * より verifier を拾いやすい。
 *
 * `token_hash`（または `token`）+ `verifyOtp` は従来どおりサーバーで処理（別ブラウザ可）。
 *
 * メール確認は `supabase/templates/confirmation.html` の token_hash リンクも推奨。
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
  const tokenHash =
    request.nextUrl.searchParams.get("token_hash") ?? request.nextUrl.searchParams.get("token");
  const type = request.nextUrl.searchParams.get("type");

  const cookieCtx = authCookieContextFromNextRequest(request);

  if (code) {
    let redirectResponse = NextResponse.redirect(redirectTarget);

    const supabaseExchange = createServerClient(url, anonKey, {
      cookieOptions: supabaseCookieOptions(cookieCtx.host, cookieCtx.isHttps),
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

    const { error: exchangeError } = await supabaseExchange.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      const u = new URL("/auth/auth-code-error", request.url);
      u.searchParams.set("reason", exchangeError.message);
      return NextResponse.redirect(u);
    }

    await finishSessionSideEffects(supabaseExchange, request);

    return redirectResponse;
  }

  // サーバーからは URL の #fragment が見えない。クライアント用に内部パスへ渡す。
  if (!tokenHash || !type) {
    const rewriteUrl = new URL("/auth/callback/fragment", request.url);
    rewriteUrl.searchParams.set("next", nextPath);
    return NextResponse.rewrite(rewriteUrl);
  }

  let redirectResponse = NextResponse.redirect(redirectTarget);

  const supabase = createServerClient(url, anonKey, {
    cookieOptions: supabaseCookieOptions(cookieCtx.host, cookieCtx.isHttps),
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

  const verifyError = await completeEmailLinkSession(supabase, tokenHash, type);
  if (verifyError) {
    const u = new URL("/auth/auth-code-error", request.url);
    u.searchParams.set("reason", verifyError.message);
    return NextResponse.redirect(u);
  }

  await finishSessionSideEffects(supabase, request);

  return redirectResponse;
}
