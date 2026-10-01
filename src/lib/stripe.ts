import Stripe from "stripe";
import type { PlanId } from "@/lib/plans";

let stripe: Stripe | null = null;

export type StripeMode = "none" | "test" | "live";

export function getStripeMode(): StripeMode {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return "none";
  if (key.startsWith("sk_test_")) return "test";
  if (key.startsWith("sk_live_")) return "live";
  return "test";
}

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
  if (planId === "freeplan") return null;
  const id = planId === "pro" ? process.env.STRIPE_PRICE_ID_PRO : process.env.STRIPE_PRICE_ID_STARTER;
  const v = id?.trim();
  return v && v.length > 0 ? v : null;
}

export type StripeMonthlyInvoice = {
  id: string;
  paidAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  amountCents: number;
  currency: string;
  status: string | null;
  hostedInvoiceUrl: string | null;
};

export async function listMonthlyInvoicesForCustomer(
  customerId: string,
): Promise<StripeMonthlyInvoice[]> {
  const stripe = getStripe();
  if (!stripe) return [];
  try {
    const res = await stripe.invoices.list({
      customer: customerId,
      limit: 24,
    });
    return res.data
      .filter((inv) => inv.status && inv.status !== "draft")
      .map((inv) => {
        const paidUnix = inv.status_transitions?.paid_at ?? inv.created;
        return {
          id: inv.id,
          paidAt: new Date(paidUnix * 1000).toISOString(),
          periodStart: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
          periodEnd: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
          amountCents: inv.status === "paid" ? inv.amount_paid : inv.amount_due,
          currency: (inv.currency ?? "usd").toLowerCase(),
          status: inv.status,
          hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
        };
      });
  } catch (err) {
    console.warn(
      "[stripe] list invoices failed",
      err instanceof Error ? err.message.slice(0, 300) : String(err).slice(0, 300),
    );
    return [];
  }
}
