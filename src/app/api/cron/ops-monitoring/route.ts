import { NextResponse } from "next/server";
import { runOpsMonitoringCheck } from "@/lib/ops/run-ops-monitoring-check";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

function getBearer(req: Request): string | null {
  const h = req.headers.get("authorization")?.trim() ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

function authorizeCronRequest(req: Request, secret: string): boolean {
  if (getBearer(req) === secret) return true;
  if (req.headers.get("x-vercel-cron") === "1" && process.env.VERCEL === "1") return true;
  return false;
}

export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ ok: false, error: "cron_secret_missing" }, { status: 503 });
  }
  if (!authorizeCronRequest(req, secret)) return unauthorized();

  const result = await runOpsMonitoringCheck();
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false as const,
        reason: result.reason,
        lines: result.lines,
      },
      { status: 500 },
    );
  }
  return NextResponse.json({
    ok: true as const,
    skipped: result.skipped,
    reason: result.reason,
    emailSent: result.emailSent,
    lines: result.lines,
  });
}
