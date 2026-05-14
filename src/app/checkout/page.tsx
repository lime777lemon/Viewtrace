import type { Metadata } from "next";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { getOveragePerObservationUsd, parsePlanId } from "@/lib/plans";
import { getStripeMode, isStripeCheckoutConfigured } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "お支払い | Viewtrace",
  description: "Viewtrace 月額プランのお申し込み（Stripe）。",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ plan?: string; reason?: string }>;
};

export default async function CheckoutPage({ searchParams }: Props) {
  const { plan: raw, reason: reasonRaw } = await searchParams;
  const planId = parsePlanId(raw);
  const trialBlockReason =
    reasonRaw === "trial_expired" || reasonRaw === "trial_observation_limit" ? reasonRaw : undefined;
  const stripeConfigured = isStripeCheckoutConfigured();
  const stripeMode = stripeConfigured ? getStripeMode() : "none";
  const initialLocale = await getRequestLocale();
  const overagePerObservationUsd = getOveragePerObservationUsd();

  return (
    <CheckoutClient
      planId={planId}
      stripeMode={stripeMode}
      trialBlockReason={trialBlockReason}
      initialLocale={initialLocale}
      overagePerObservationUsd={overagePerObservationUsd}
    />
  );
}
