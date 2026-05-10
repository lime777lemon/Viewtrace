import type { AuthError } from "@supabase/supabase-js";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TRIAL_CONFIG, parsePlanId, type PlanId } from "@/lib/plans";

function authErrorStatus(error: AuthError): number | undefined {
  const s = (error as AuthError & { status?: number }).status;
  return typeof s === "number" ? s : undefined;
}

/**
 * 開発: 詳細。本番: message は出さず分類用フィールドのみ（ログ漏えい対策）。
 * 「セッション Cookie が無い」系は /login の初回表示でも毎回起きうるため既定ではログしない。
 * 追うときだけ `VIEWTRACE_AUTH_DEBUG_GET_SESSION=1`（.env.local）を付与。
 */
function isBenignMissingSessionError(error: AuthError): boolean {
  if (error.name === "AuthSessionMissingError") return true;
  const m = error.message?.toLowerCase() ?? "";
  return m.includes("auth session missing");
}

function logGetSessionNull(error: AuthError | null, user: { id: string; email?: string | null } | null) {
  const isDev = process.env.NODE_ENV === "development";
  const verboseAuth = process.env.VIEWTRACE_AUTH_DEBUG_GET_SESSION === "1";

  if (error) {
    if (isBenignMissingSessionError(error)) {
      if (isDev && verboseAuth) {
        console.debug("[Viewtrace auth] getSession → null (no session cookie)", {
          name: error.name,
          message: error.message,
          status: authErrorStatus(error),
        });
      }
      return;
    }
    if (isDev) {
      console.warn("[Viewtrace auth] getSession → null", error.message, {
        name: error.name,
        status: authErrorStatus(error),
      });
    } else {
      console.warn("[Viewtrace auth] getSession → null (getUser error)", {
        name: error.name,
        status: authErrorStatus(error),
      });
    }
    return;
  }

  if (!isDev) return;

  if (!user) {
    console.warn("[Viewtrace auth] getSession → null (no user / unauthenticated)");
  } else if (!user.email) {
    console.warn("[Viewtrace auth] getSession → null (user without email)", { sub: user.id });
  }
}

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
  if (error || !user?.email) {
    logGetSessionNull(error, user);
    return null;
  }
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
