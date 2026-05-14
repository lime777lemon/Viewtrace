import { NextResponse } from "next/server";
import { getOpsSignalRouteSecret, isOpsMonitoringDisabled } from "@/lib/ops/alert-config";
import { insertOpsSignal } from "@/lib/ops/insert-signal";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

export async function POST(req: Request) {
  if (isOpsMonitoringDisabled()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const secret = getOpsSignalRouteSecret();
  if (!secret) return NextResponse.json({ ok: false, error: "secret_not_configured" }, { status: 503 });

  const auth = req.headers.get("authorization")?.trim() ?? "";
  if (auth !== `Bearer ${secret}`) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const signalType = o.signal_type;
  const path = typeof o.path === "string" ? o.path.slice(0, 2000) : "";
  const search = typeof o.search === "string" ? o.search.slice(0, 2000) : "";

  if (signalType !== "suspicious_request") {
    return NextResponse.json({ ok: false, error: "unsupported_signal" }, { status: 400 });
  }

  await insertOpsSignal("suspicious_request", { path, search });
  return NextResponse.json({ ok: true });
}
