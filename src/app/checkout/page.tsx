import type { Metadata } from "next";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import { parsePlanId } from "@/lib/plans";

export const metadata: Metadata = {
  title: "お支払い | Viewtrace",
  description: "Viewtrace 月額プランのお申し込み（デモ決済）。",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ plan?: string }>;
};

export default async function CheckoutPage({ searchParams }: Props) {
  const { plan: raw } = await searchParams;
  const planId = parsePlanId(raw);

  return <CheckoutClient planId={planId} />;
}
