import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { pipedreamServerClient } from "@/lib/pipedream";

export const runtime = "nodejs";

/** Short-lived Connect token for the signed-in user. The body cannot choose another user. */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const client = pipedreamServerClient();
  if (!client) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  try {
    const created = await client.tokens.create({ externalUserId: session.userId });
    const expiresAt = created.expiresAt instanceof Date ? created.expiresAt.toISOString() : String(created.expiresAt);
    return NextResponse.json({
      token: created.token,
      expiresAt,
      connectLinkUrl: created.connectLinkUrl,
    });
  } catch (error) {
    console.warn("[pipedream] connect token failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
