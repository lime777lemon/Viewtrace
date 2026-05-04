import { NextResponse } from "next/server";
import { sendResendEmail } from "@/lib/resend";

export const runtime = "nodejs";

/**
 * Resend 経由でメールを 1 通送信します。
 * 悪用防止のため、`Authorization: Bearer <RESEND_SEND_SECRET>` が一致する場合のみ動作します。
 *
 * Body JSON: `{ "to": string | string[], "subject": string, "html"?: string, "text"?: string, "from"?: string }`
 * `html` と `text` のどちらか一方以上が必要です。
 */
export async function POST(req: Request) {
  const secret = process.env.RESEND_SEND_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "RESEND_SEND_SECRET is not configured on the server" },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization")?.trim() ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!bearer || bearer !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const subject = typeof b.subject === "string" ? b.subject.trim() : "";
  const html = typeof b.html === "string" ? b.html : undefined;
  const text = typeof b.text === "string" ? b.text : undefined;
  const from = typeof b.from === "string" ? b.from.trim() : undefined;
  const to = b.to;

  if (!subject) {
    return NextResponse.json({ ok: false, error: "subject is required" }, { status: 400 });
  }
  if (typeof to !== "string" && !Array.isArray(to)) {
    return NextResponse.json(
      { ok: false, error: "to must be a non-empty string or an array of strings" },
      { status: 400 },
    );
  }
  if (typeof to === "string" && !to.trim()) {
    return NextResponse.json({ ok: false, error: "to is empty" }, { status: 400 });
  }
  if (Array.isArray(to) && (!to.length || !to.every((x) => typeof x === "string" && x.trim()))) {
    return NextResponse.json({ ok: false, error: "to array must contain non-empty strings" }, { status: 400 });
  }

  const result = await sendResendEmail({
    to: typeof to === "string" ? to.trim() : (to as string[]).map((s) => s.trim()),
    subject,
    html,
    text,
    from: from || undefined,
  });

  if (!result.ok) {
    const status = result.error === "RESEND_API_KEY is not set" ? 503 : 502;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, id: result.id });
}
