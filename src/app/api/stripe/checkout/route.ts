import { NextResponse } from "next/server";
import { siteOrigin } from "@/lib/site";
import { getStripe, isStripeCheckoutConfigured, stripePriceIdForPlan } from "@/lib/stripe";
import { parsePlanId } from "@/lib/plans";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Stripe Checkout（サブスクリプション）セッションを作成し、リダイレクト URL を返します。
 */
export async function POST(req: Request) {
  if (!isStripeCheckoutConfigured()) {
    return NextResponse.json({ ok: false, error: "stripe_not_configured" }, { status: 503 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ ok: false, error: "stripe_not_configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const b = body as { plan?: unknown; email?: unknown; locale?: unknown };
  const plan = parsePlanId(typeof b.plan === "string" ? b.plan : "");
  const email = typeof b.email === "string" ? b.email.trim() : "";
  const locale = typeof b.locale === "string" && b.locale === "en" ? "en" : "ja";

  if (!EMAIL_RE.test(email) || email.length > 320) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const priceId = stripePriceIdForPlan(plan);
  if (!priceId) {
    return NextResponse.json({ ok: false, error: "missing_price_id" }, { status: 503 });
  }

  const origin = siteOrigin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      locale: locale === "en" ? "en" : "ja",
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/checkout/success?plan=${plan}&session_id={CHECKOUT_SESSION_ID}&locale=${locale}`,
      cancel_url: `${origin}/checkout?plan=${plan}`,
      metadata: { plan_id: plan },
      subscription_data: {
        metadata: { plan_id: plan },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json({ ok: false, error: "no_checkout_url" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
