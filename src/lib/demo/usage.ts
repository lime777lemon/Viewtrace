import type { PlanId } from "@/lib/plans";
import { getPlan } from "@/lib/plans";
import { countUserObservationsThisUtcMonth, readUserObservations } from "@/lib/demo/user-observations";

/** 当月のユーザー記録回数とプラン上限（請求連携前のデモ表示） */
export async function getDemoUsageThisMonth(planId: PlanId): Promise<{ used: number; limit: number }> {
  const limit = getPlan(planId).monthlyObservations;
  const user = await readUserObservations();
  const used = countUserObservationsThisUtcMonth(user);
  return { used, limit };
}
