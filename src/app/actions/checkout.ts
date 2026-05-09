"use server";

import { redirect } from "next/navigation";
import { checkoutProfileHasAnyInput, mergeNonEmptyProfileFromRequestBody } from "@/lib/auth/profile-meta";
import { getSession } from "@/lib/auth/session";
import { parsePlanId } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const profileBody = {
    fullName: formData.get("fullName"),
    companyName: formData.get("companyName"),
    phone: formData.get("phone"),
  };

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

  const session = await getSession();
  if (session && checkoutProfileHasAnyInput(profileBody)) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const nextMeta = mergeNonEmptyProfileFromRequestBody(
        user.user_metadata as Record<string, unknown>,
        profileBody,
      );
      await supabase.auth.updateUser({ data: nextMeta });
    }
  }

  redirect(`/checkout/success?plan=${plan}`);
}
