import type { Metadata } from "next";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import { parsePlanId } from "@/lib/plans";
import { getStripeMode, isStripeCheckoutConfigured } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "お支払い | Viewtrace",
  description: "Viewtrace 月額プランのお申し込み（Stripe / デモ）。",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ plan?: string }>;
};

export default async function CheckoutPage({ searchParams }: Props) {
  const { plan: raw } = await searchParams;
  const planId = parsePlanId(raw);
  const stripeConfigured = isStripeCheckoutConfigured();
  const stripeMode = stripeConfigured ? getStripeMode() : "none";

  return <CheckoutClient planId={planId} stripeMode={stripeMode} />;
}
