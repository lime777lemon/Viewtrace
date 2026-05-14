import { NextResponse } from "next/server";

/** Lightweight target for ops latency probes (`/api/cron/ops-monitoring`). */
export async function GET() {
  return NextResponse.json({ ok: true, t: Date.now() }, { status: 200 });
}
