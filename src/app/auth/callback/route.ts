import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { appendAuditEvent, AUDIT_ACTION } from "@/lib/audit-log";
import { insertTrialSignupRow } from "@/lib/auth/trial-signup-server";
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
      action: AUDIT_ACTION.AUTH_SIGN_IN,
      meta: { method: "oauth" },
    });
  }
}

/**
 * メール確認・OAuth の戻り。
 * PKCE の `code` はブラウザの Cookie に保存された code verifier と突き合わせる必要があるため、
 * サーバーでは交換せず `/auth/oauth-complete` へ渡してクライアントで exchange する。
 * `token_hash`（または Supabase 標準リンクの `token`）+ `verifyOtp` はサーバーで処理可能（PKCE verifier 不要）。
 *
 * 別端末のメールアプリだけで確認したい場合:
 * Supabase Dashboard → Authentication → Email Templates → Confirm signup で、
 * リンクを `{{ .ConfirmationURL }}` ではなく次の形にする（RedirectTo には既に query があるので & で連結）:
 *   <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">...</a>
 * `type` はプロジェクトによって `signup` の場合あり。公式の ConfirmationURL 例は `type=email`。
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

  if (code) {
    const u = new URL("/auth/oauth-complete", request.url);
    u.searchParams.set("code", code);
    u.searchParams.set("next", nextPath);
    return NextResponse.redirect(u);
  }

  // サーバーからは URL の #fragment が見えない。クライアント用に内部パスへ渡す。
  if (!tokenHash || !type) {
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

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as "signup" | "email" | "recovery" | "invite" | "magiclink" | "email_change",
  });
  if (error) {
    const u = new URL("/auth/auth-code-error", request.url);
    u.searchParams.set("reason", error.message);
    return NextResponse.redirect(u);
  }

  await finishSessionSideEffects(supabase, request);

  return redirectResponse;
}
