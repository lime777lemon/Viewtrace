import { NextResponse } from "next/server";
import { runScheduledEvidenceReports } from "@/lib/scheduled-evidence-report-run";

export const runtime = "nodejs";
export const maxDuration = 300;

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

function getBearer(req: Request): string | null {
  const header = req.headers.get("authorization")?.trim() ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function authorizeCronRequest(req: Request, secret: string): boolean {
  if (getBearer(req) === secret) return true;
  if (req.headers.get("x-vercel-cron") === "1" && process.env.VERCEL === "1") return true;
  return false;
}

export async function GET(req: Request) {
  return POST(req);
}

/** Monday 00:00 UTC (09:00 JST). Sends last JST week's Evidence Report. Not a Watch alert. */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ ok: false, error: "cron_secret_missing" }, { status: 503 });
  }
  if (!authorizeCronRequest(req, secret)) return unauthorized();
  const result = await runScheduledEvidenceReports();
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
