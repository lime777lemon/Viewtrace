import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSession } from "@/lib/auth/session";
import { siteOrigin } from "@/lib/site";

export const runtime = "nodejs";

function trimTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

function isAllowedRedirectOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.host;
    if (host === "viewtrace.net" || host.endsWith(".viewtrace.net")) return true;
    if (host === "localhost" || host.startsWith("localhost:")) return true;
    if (host.startsWith("127.0.0.1:")) return true;
    if (host.endsWith(".vercel.app")) return true;
    return false;
  } catch {
    return false;
  }
}

function resolveRequestOrigin(req: Request): string {
  const origin = req.headers.get("origin");
  if (origin && isAllowedRedirectOrigin(origin)) return trimTrailingSlash(origin);

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const o = new URL(referer).origin;
      if (isAllowedRedirectOrigin(o)) return trimTrailingSlash(o);
    } catch {
      /* ignore */
    }
  }

  return siteOrigin;
}

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ ok: false, error: "stripe_not_configured" }, { status: 503 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "login_required" }, { status: 401 });
  }
  if (!session.stripeCustomerId) {
    return NextResponse.json({ ok: false, error: "customer_not_found" }, { status: 409 });
  }

  const origin = resolveRequestOrigin(req);
  const portal = await stripe.billingPortal.sessions.create({
    customer: session.stripeCustomerId,
    return_url: `${origin}/dashboard/settings`,
  });

  return NextResponse.json({ ok: true, url: portal.url });
}

