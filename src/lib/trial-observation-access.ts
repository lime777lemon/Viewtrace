import type { SessionPayload } from "@/lib/auth/session";
import type { Observation } from "@/lib/demo/observations";
import { countObservationsSinceTrialStart } from "@/lib/demo/user-observations";
import { TRIAL_CONFIG } from "@/lib/plans";

/** 無料トライアルで新規オブザベーションへ進めない／ボタンを出さないとき true */
export function shouldHideNewObservationForTrial(
  session: SessionPayload,
  userObservations: Observation[],
): boolean {
  if (!session.trialEligible) return false;
  if (session.trialExpired) return true;
  const trialUsed = session.trialStartedAt
    ? countObservationsSinceTrialStart(userObservations, session.trialStartedAt)
    : userObservations.length;
  return trialUsed >= TRIAL_CONFIG.freeObservations;
}
