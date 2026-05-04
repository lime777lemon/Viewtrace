import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isAdminSession } from "@/lib/admin";
import { runSql } from "@/lib/db/sql";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isAdminSession(session)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const query = typeof b.query === "string" ? b.query : "";
  const result = await runSql(query);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  // 返却サイズを抑える（巨大結果で落ちないように）
  const rows = result.rows.slice(0, 200);

  return NextResponse.json({
    ok: true,
    rowCount: result.rowCount,
    fields: result.fields,
    rows,
    truncated: result.rows.length > rows.length,
  });
}

