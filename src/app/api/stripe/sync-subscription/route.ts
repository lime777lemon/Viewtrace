import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function toIsoFromUnixSeconds(v: unknown): string | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return null;
  return new Date(v * 1000).toISOString();
}

/**
 * Best-effort backfill for public.subscriptions.
 * Useful when webhook deliveries happened before SUPABASE_SERVICE_ROLE_KEY was configured.
 */
export async function POST() {
  const stripe = getStripe();
  const admin = createSupabaseAdminClient();
  if (!stripe || !admin) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ ok: false, error: "login_required" }, { status: 401 });
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const subscriptionId = typeof meta.stripe_subscription_id === "string" ? meta.stripe_subscription_id : "";
  if (!subscriptionId) {
    return NextResponse.json({ ok: false, error: "missing_subscription_id" }, { status: 400 });
  }
  const planId = typeof meta.plan === "string" ? meta.plan : "starter";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub: any = await (stripe as Stripe).subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });

  const firstItem = sub.items?.data?.[0];
  const price = firstItem?.price as Stripe.Price | undefined;
  const stripePriceId = price?.id ?? "unknown";
  const billingPeriod = price?.recurring?.interval ?? "month";
  const status = typeof sub.status === "string" ? sub.status : "unknown";

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: user.id,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: stripePriceId,
      plan: planId,
      billing_period: billingPeriod,
      status,
      stripe_customer_id: typeof meta.stripe_customer_id === "string" ? meta.stripe_customer_id : null,
      stripe_checkout_session_id:
        typeof meta.stripe_checkout_session_id === "string" ? meta.stripe_checkout_session_id : null,
      current_period_start: toIsoFromUnixSeconds(sub.current_period_start),
      current_period_end: toIsoFromUnixSeconds(sub.current_period_end),
      cancel_at_period_end: typeof sub.cancel_at_period_end === "boolean" ? sub.cancel_at_period_end : null,
      mode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

