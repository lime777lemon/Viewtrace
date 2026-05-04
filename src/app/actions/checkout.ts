"use server";

import { redirect } from "next/navigation";
import { parsePlanId } from "@/lib/plans";

function validEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function demoCheckoutAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const plan = parsePlanId(String(formData.get("plan") ?? ""));
  const email = String(formData.get("email") ?? "").trim();
  const cardNumber = String(formData.get("cardNumber") ?? "").replace(/\s/g, "");
  const expiry = String(formData.get("expiry") ?? "").trim();
  const cvc = String(formData.get("cvc") ?? "").trim();

  if (!validEmail(email)) {
    return { error: "email" };
  }

  if (!/^\d{16}$/.test(cardNumber)) {
    return { error: "card" };
  }

  if (!/^\d{2}\s*\/\s*\d{2}$/.test(expiry)) {
    return { error: "expiry" };
  }

  if (!/^\d{3,4}$/.test(cvc)) {
    return { error: "cvc" };
  }

  redirect(`/checkout/success?plan=${plan}`);
}
