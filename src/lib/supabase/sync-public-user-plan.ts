import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlan, parsePlanId, type PlanId } from "@/lib/plans";

/**
 * Table Editor 用の `public.users` を、課金プランと同じ値に揃える（ベストエフォート）。
 * 正のソースは Supabase Auth の `user_metadata.plan` と `src/lib/plans.ts` の枠。
 *
 * 想定列: `id` (uuid, auth と同一), `plan` (text), `observations_limit` (int)。
 * スキーマが違う場合はこの関数はログを出して終了するだけ（決済フローを壊さない）。
 */
export async function syncPublicUserPlanMirror(
  admin: SupabaseClient,
  userId: string,
  planRaw: string,
): Promise<void> {
  const planId: PlanId = parsePlanId(planRaw);
  const observationsLimit = getPlan(planId).monthlyObservations;
  const patch = { plan: planId, observations_limit: observationsLimit };

  const { data: updated, error: upErr } = await admin
    .from("users")
    .update(patch)
    .eq("id", userId)
    .select("id");

  if (!upErr && updated && updated.length > 0) {
    return;
  }

  if (upErr) {
    console.warn("[syncPublicUserPlanMirror] update failed", {
      code: upErr.code,
      message: upErr.message,
    });
  }

  const { error: insErr } = await admin.from("users").insert({
    id: userId,
    ...patch,
  });
  if (insErr && insErr.code !== "23505") {
    console.warn("[syncPublicUserPlanMirror] insert failed", {
      code: insErr.code,
      message: insErr.message,
    });
  }
}
