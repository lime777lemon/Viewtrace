import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TRIAL_CONFIG, parsePlanId, type PlanId } from "@/lib/plans";

export type SessionPayload = {
  email: string;
  plan: PlanId;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  /** user_metadata.full_name（任意） */
  fullName: string | null;
  /** user_metadata.company_name（任意） */
  companyName: string | null;
  /** user_metadata.phone（任意） */
  phone: string | null;
  /** user_metadata.use_case（任意） */
  useCase: string | null;
  /**
   * 無料トライアル枠の対象（サインアップ時に trial_started_at を付与したユーザー）。
   * trial_active === false または決済完了後のフラグでオフにできる想定。
   */
  trialEligible: boolean;
  /** trial_started_at（ISO文字列）。無い場合は null */
  trialStartedAt: string | null;
  /** trial_started_at + TRIAL_CONFIG.trialDays（ISO文字列）。算出できない場合は null */
  trialEndsAt: string | null;
  /** 現在時刻で trialEndsAt を過ぎている（trialEligible のときのみ意味がある） */
  trialExpired: boolean;
};

/**
 * Supabase Auth のユーザー（JWT 検証は getUser 側で実施）。
 * React `cache` で同一リクエスト内の重複呼び出しをまとめる。layout と page が並列で
 * getSession すると getUser が二重に走り、リフレッシュトークンのローテーション競合で
 * 一瞬セッションが無い扱いになり /login に飛ぶことがある。
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user?.email) return null;
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const rawPlan = typeof meta?.plan === "string" ? meta.plan : undefined;
  const plan = parsePlanId(rawPlan);
  const stripeCustomerId =
    typeof meta?.stripe_customer_id === "string" && meta.stripe_customer_id.trim()
      ? meta.stripe_customer_id.trim()
      : null;
  const stripeSubscriptionId =
    typeof meta?.stripe_subscription_id === "string" && meta.stripe_subscription_id.trim()
      ? meta.stripe_subscription_id.trim()
      : null;
  const fullName =
    typeof meta?.full_name === "string" && meta.full_name.trim()
      ? meta.full_name.trim()
      : null;
  const companyName =
    typeof meta?.company_name === "string" && meta.company_name.trim()
      ? meta.company_name.trim()
      : null;
  const phone =
    typeof meta?.phone === "string" && meta.phone.trim() ? meta.phone.trim() : null;
  const useCase =
    typeof meta?.use_case === "string" && meta.use_case.trim() ? meta.use_case.trim() : null;
  const trialStartedAtRaw =
    typeof meta?.trial_started_at === "string" && meta.trial_started_at.trim().length > 0
      ? meta.trial_started_at.trim()
      : null;
  const trialEnded = meta?.trial_active === false;
  // If a user has an active Stripe subscription, they are not considered "in trial"
  // even if trial_started_at is present (the signup flow always stamps it).
  const trialEligible = !!trialStartedAtRaw && !trialEnded && !stripeSubscriptionId;

  let trialEndsAt: string | null = null;
  let trialExpired = false;
  if (trialEligible && trialStartedAtRaw) {
    const started = Date.parse(trialStartedAtRaw);
    if (!Number.isNaN(started)) {
      const endsMs = started + TRIAL_CONFIG.trialDays * 24 * 60 * 60 * 1000;
      trialEndsAt = new Date(endsMs).toISOString();
      trialExpired = Date.now() >= endsMs;
    }
  }

  return {
    email: user.email,
    plan,
    stripeCustomerId,
    stripeSubscriptionId,
    fullName,
    companyName,
    phone,
    useCase,
    trialEligible,
    trialStartedAt: trialStartedAtRaw,
    trialEndsAt,
    trialExpired,
  };
});
