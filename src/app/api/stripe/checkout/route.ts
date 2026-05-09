import { NextResponse } from "next/server";
import { checkoutProfileHasAnyInput, mergeNonEmptyProfileFromRequestBody } from "@/lib/auth/profile-meta";
import { siteOrigin } from "@/lib/site";
import { getStripe, isStripeCheckoutConfigured, stripePriceIdForPlan } from "@/lib/stripe";
import { parsePlanId } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  const b = body as {
    plan?: unknown;
    locale?: unknown;
    fullName?: unknown;
    companyName?: unknown;
    phone?: unknown;
  };
  const plan = parsePlanId(typeof b.plan === "string" ? b.plan : "");
  const locale = typeof b.locale === "string" && b.locale === "en" ? "en" : "ja";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !user.email) {
    return NextResponse.json({ ok: false, error: "login_required" }, { status: 401 });
  }

  if (checkoutProfileHasAnyInput(b)) {
    const nextMeta = mergeNonEmptyProfileFromRequestBody(
      user.user_metadata as Record<string, unknown>,
      b,
    );
    const { error: profileErr } = await supabase.auth.updateUser({ data: nextMeta });
    if (profileErr) {
      console.warn("[stripe checkout] profile metadata update failed", profileErr.message);
    }
  }

  const priceId = stripePriceIdForPlan(plan);
  if (!priceId) {
    return NextResponse.json({ ok: false, error: "missing_price_id" }, { status: 503 });
  }

  // Use the environment the user is currently on (local/preview/prod).
  // Avoid hard-binding to a stale Vercel deployment URL which can cause DEPLOYMENT_NOT_FOUND.
  const origin = resolveRequestOrigin(req);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      locale: locale === "en" ? "en" : "ja",
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/checkout/success?plan=${plan}&session_id={CHECKOUT_SESSION_ID}&locale=${locale}`,
      cancel_url: `${origin}/checkout?plan=${plan}`,
      metadata: { plan_id: plan, user_id: user.id },
      subscription_data: {
        metadata: { plan_id: plan, user_id: user.id },
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
