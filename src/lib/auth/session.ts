import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parsePlanId, type PlanId } from "@/lib/plans";

export type SessionPayload = {
  email: string;
  plan: PlanId;
  /** user_metadata.company_name（任意・ログイン後に入力） */
  companyName: string | null;
  /** user_metadata.use_case（任意） */
  useCase: string | null;
  /**
   * 無料トライアル枠の対象（サインアップ時に trial_started_at を付与したユーザー）。
   * trial_active === false または決済完了後のフラグでオフにできる想定。
   */
  trialEligible: boolean;
};

/** Supabase Auth のユーザー（JWT 検証は getUser 側で実施） */
export async function getSession(): Promise<SessionPayload | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user?.email) return null;
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const rawPlan = typeof meta?.plan === "string" ? meta.plan : undefined;
  const plan = parsePlanId(rawPlan);
  const companyName =
    typeof meta?.company_name === "string" && meta.company_name.trim()
      ? meta.company_name.trim()
      : null;
  const useCase =
    typeof meta?.use_case === "string" && meta.use_case.trim() ? meta.use_case.trim() : null;
  const trialStartedAt =
    typeof meta?.trial_started_at === "string" && meta.trial_started_at.trim().length > 0;
  const trialEnded = meta?.trial_active === false;
  const trialEligible = trialStartedAt && !trialEnded;

  return { email: user.email, plan, companyName, useCase, trialEligible };
}
