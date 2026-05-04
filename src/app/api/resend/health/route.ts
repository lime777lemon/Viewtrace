import { NextResponse } from "next/server";
import { getResendClient, isResendConfigured } from "@/lib/resend";

export const runtime = "nodejs";

/**
 * Resend API キーが設定されているかだけ返します（キー値は含めません）。
 */
export async function GET() {
  if (!isResendConfigured()) {
    return NextResponse.json(
      { ok: false, configured: false, error: "RESEND_API_KEY is not set" },
      { status: 503 },
    );
  }

  const resend = getResendClient();
  if (!resend) {
    return NextResponse.json(
      { ok: false, configured: false, error: "Resend client unavailable" },
      { status: 503 },
    );
  }

  try {
    const { data, error } = await resend.domains.list();
    if (error) {
      return NextResponse.json(
        { ok: false, configured: true, error: error.message },
        { status: 502 },
      );
    }
    return NextResponse.json({
      ok: true,
      configured: true,
      domainCount: data?.data?.length ?? 0,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { ok: false, configured: true, error: message },
      { status: 502 },
    );
  }
}
