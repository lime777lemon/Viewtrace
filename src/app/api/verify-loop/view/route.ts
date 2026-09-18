import { NextResponse } from "next/server";
import { getOrCreateVerifyLoopSessionId, persistVerifyLoopAttribution } from "@/lib/verify-loop/cookies";
import { recordVerifyLoopEvent } from "@/lib/verify-loop/record";
import { sanitizeVerifyTokenParam } from "@/lib/observation-verify-token";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let tokenRaw = "";
  try {
    const body = (await req.json()) as { token?: unknown };
    tokenRaw = typeof body.token === "string" ? body.token : "";
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const token = sanitizeVerifyTokenParam(tokenRaw);
  if (!token) return NextResponse.json({ ok: false }, { status: 400 });

  const sessionId = await getOrCreateVerifyLoopSessionId();
  await persistVerifyLoopAttribution({ verifyToken: token });
  const result = await recordVerifyLoopEvent({
    eventType: "verify_view",
    verifyToken: token,
    anonymousSessionId: sessionId,
  });
  if (!result.ok && result.error === "invalid_token") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  return NextResponse.json({ ok: true, recorded: result.ok ? result.recorded : false });
}
