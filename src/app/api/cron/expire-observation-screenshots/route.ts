import { NextResponse } from "next/server";
import { expireDueObservationScreenshotsAllPlans } from "@/lib/expire-observation-screenshots";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

function getBearer(req: Request): string | null {
  const h = req.headers.get("authorization")?.trim() ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

/** Vercel Cron は GET + `x-vercel-cron: 1`。手動は Bearer CRON_SECRET。 */
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

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 503 });
  }

  const result = await expireDueObservationScreenshotsAllPlans(admin, { limit: 80 });
  return NextResponse.json({ ok: true, ...result });
}
