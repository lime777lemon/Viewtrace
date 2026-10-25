import { NextResponse } from "next/server";
import { runDueStateCoverage } from "@/lib/state-coverage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

function authorizeCronRequest(req: Request, secret: string): boolean {
  const header = req.headers.get("authorization")?.trim() ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (match?.[1] === secret) return true;
  return req.headers.get("x-vercel-cron") === "1" && process.env.VERCEL === "1";
}

export async function GET(req: Request) {
  return POST(req);
}

/** Daily. Retries a pending US state once. A match saves one verified Observation. */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ ok: false, error: "cron_secret_missing" }, { status: 503 });
  if (!authorizeCronRequest(req, secret)) return unauthorized();
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "supabase_admin_not_configured" }, { status: 503 });
  const result = await runDueStateCoverage(admin);
  return NextResponse.json({ ok: true, ...result });
}
