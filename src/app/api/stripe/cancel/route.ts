import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST() {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ ok: false, error: "stripe_not_configured" }, { status: 503 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "login_required" }, { status: 401 });
  }
  if (!session.stripeSubscriptionId) {
    return NextResponse.json({ ok: false, error: "subscription_not_found" }, { status: 409 });
  }

  try {
    const sub = await stripe.subscriptions.update(session.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    const s = sub as unknown as { cancel_at_period_end?: boolean; status?: string };
    return NextResponse.json({
      ok: true,
      cancel_at_period_end: s.cancel_at_period_end ?? true,
      status: s.status ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

