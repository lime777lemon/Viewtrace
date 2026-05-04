import Stripe from "stripe";
import type { PlanId } from "@/lib/plans";

let stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!stripe) {
    stripe = new Stripe(key, { apiVersion: Stripe.API_VERSION, typescript: true });
  }
  return stripe;
}

/** Starter / Pro の Price ID が揃い、Checkout Session を発行できる状態か */
export function isStripeCheckoutConfigured(): boolean {
  if (!getStripe()) return false;
  const starter = process.env.STRIPE_PRICE_ID_STARTER?.trim();
  const pro = process.env.STRIPE_PRICE_ID_PRO?.trim();
  return Boolean(starter && pro);
}

export function stripePriceIdForPlan(planId: PlanId): string | null {
  const id = planId === "pro" ? process.env.STRIPE_PRICE_ID_PRO : process.env.STRIPE_PRICE_ID_STARTER;
  const v = id?.trim();
  return v && v.length > 0 ? v : null;
}
