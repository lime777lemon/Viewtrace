import { NextResponse } from "next/server";
import { appendAuditEvent, AUDIT_ACTION } from "@/lib/audit-log";
import { insertTrialSignupRow } from "@/lib/auth/trial-signup-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * ブラウザ側で exchangeCodeForSession 済みのあと、Cookie 付きで呼ぶ。
 * trial_signups 追記と監査ログ（ベストエフォート）。
 */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const accept = req.headers.get("accept-language")?.toLowerCase() ?? "";
  const locale = accept.startsWith("ja") ? "ja" : "en";

  await insertTrialSignupRow(
    supabase,
    user.email,
    locale,
    user.user_metadata as Record<string, unknown> | undefined,
  );
  await appendAuditEvent(supabase, {
    action: AUDIT_ACTION.AUTH_SIGN_IN,
    meta: { method: "pkce_browser_exchange" },
  });

  return NextResponse.json({ ok: true });
}
