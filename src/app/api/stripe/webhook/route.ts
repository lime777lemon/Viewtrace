import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Stripe Webhook（例: checkout.session.completed）。
 * Dashboard → Developers → Webhooks に `https://<本番ドメイン>/api/stripe/webhook` を登録し、
 * `STRIPE_WEBHOOK_SECRET` に Signing secret を設定してください。
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) {
    return NextResponse.json({ ok: false, error: "webhook_not_configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ ok: false, error: "missing_signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (e) {
    const message = e instanceof Error ? e.message : "invalid signature";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const planId = session.metadata?.plan_id ?? "";
      const customerEmail = session.customer_email ?? session.customer_details?.email ?? "";
      console.info("[stripe webhook] checkout.session.completed", {
        id: session.id,
        plan_id: planId,
        customer_email: customerEmail,
        subscription: session.subscription,
      });
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
