import { NextResponse } from "next/server";
import { appendAuditEvent, AUDIT_ACTION } from "@/lib/audit-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let method = "unknown";
  try {
    const body = (await req.json()) as { method?: unknown };
    if (typeof body.method === "string" && body.method.length > 0 && body.method.length <= 80) {
      method = body.method;
    }
  } catch {
    // ignore invalid body
  }

  await appendAuditEvent(supabase, {
    scope: "system",
    action: AUDIT_ACTION.AUTH_SIGN_IN,
    meta: { method },
  });

  return NextResponse.json({ ok: true });
}
