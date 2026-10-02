import { copy, type Locale } from "@/lib/i18n";
import type { PlanId } from "@/lib/plans";

export type LandingPlanCopy = {
  name: string;
  badge: string | null;
  price: string;
  period: string;
  description: string;
  subdescription?: string;
  usageExample?: string;
  features: readonly string[];
  cta: string;
};

export function getLandingPlanCopy(
  locale: Locale,
  planId: Extract<PlanId, "starter" | "pro">,
): LandingPlanCopy | undefined {
  const name = planId === "pro" ? "Pro" : "Starter";
  return copy[locale].plans.find((p) => p.name === name);
}
