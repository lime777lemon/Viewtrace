import { cache } from "react";
import { getPlan, parsePlanId, type PlanId } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export function screenshotRetentionDaysForPlan(plan: PlanId): number {
  return getPlan(plan).retentionDays;
}

export function screenshotRetentionDaysFromStored(value: unknown, plan: PlanId): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.floor(value);
  return screenshotRetentionDaysForPlan(plan);
}

/** Logged-in account. Reads public.users.screenshot_retention_days. */
export const readScreenshotRetentionDays = cache(async (userId: string, plan: PlanId): Promise<number> => {
  const fallback = screenshotRetentionDaysForPlan(plan);
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("users")
      .select("screenshot_retention_days")
      .eq("id", userId)
      .maybeSingle();
    if (error || !data) return fallback;
    return screenshotRetentionDaysFromStored(
      (data as { screenshot_retention_days?: unknown }).screenshot_retention_days,
      plan,
    );
  } catch {
    return fallback;
  }
});

export function planIdFromUserRow(planRaw: unknown): PlanId {
  return parsePlanId(typeof planRaw === "string" ? planRaw : null);
}
