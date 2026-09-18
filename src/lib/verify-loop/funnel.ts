import type { SupabaseClient } from "@supabase/supabase-js";
import type { VerifyLoopEventType } from "@/lib/verify-loop/constants";

export type VerifyFunnelCounts = {
  verify_view: number;
  verify_cta_click: number;
  url_submitted: number;
  signup_started: number;
  signup_completed: number;
  first_observation_created: number;
};

export type VerifyFunnelRates = {
  ctaClickRate: number | null;
  urlSubmissionRate: number | null;
  signupConversionRate: number | null;
  firstObservationConversionRate: number | null;
};

export type VerifyLoopChainRow = {
  sourceObservationId: string | null;
  verifyToken: string;
  anonymousSessionId: string;
  userId: string | null;
  resultObservationId: string | null;
  createdAt: string;
};

function uniqueSessions(
  rows: { anonymous_session_id: string; event_type: string }[],
  type: VerifyLoopEventType,
): number {
  const set = new Set<string>();
  for (const row of rows) {
    if (row.event_type === type) set.add(row.anonymous_session_id);
  }
  return set.size;
}

function ratio(num: number, den: number): number | null {
  if (den <= 0) return null;
  return num / den;
}

export function computeVerifyFunnel(
  rows: { anonymous_session_id: string; event_type: string }[],
): { counts: VerifyFunnelCounts; rates: VerifyFunnelRates } {
  const counts: VerifyFunnelCounts = {
    verify_view: uniqueSessions(rows, "verify_view"),
    verify_cta_click: uniqueSessions(rows, "verify_cta_click"),
    url_submitted: uniqueSessions(rows, "url_submitted"),
    signup_started: uniqueSessions(rows, "signup_started"),
    signup_completed: uniqueSessions(rows, "signup_completed"),
    first_observation_created: uniqueSessions(rows, "first_observation_created"),
  };
  const rates: VerifyFunnelRates = {
    ctaClickRate: ratio(counts.verify_cta_click, counts.verify_view),
    urlSubmissionRate: ratio(counts.url_submitted, counts.verify_cta_click),
    signupConversionRate: ratio(counts.signup_completed, counts.url_submitted),
    firstObservationConversionRate: ratio(
      counts.first_observation_created,
      counts.url_submitted,
    ),
  };
  return { counts, rates };
}

export async function loadVerifyFunnelRows(
  admin: SupabaseClient,
  sinceIso: string,
): Promise<{ anonymous_session_id: string; event_type: string }[]> {
  const { data, error } = await admin
    .from("verify_events")
    .select("anonymous_session_id,event_type")
    .gte("created_at", sinceIso)
    .limit(20000);
  if (error || !data) return [];
  return data as { anonymous_session_id: string; event_type: string }[];
}

export async function loadRecentVerifyLoopChains(
  admin: SupabaseClient,
  limit = 25,
): Promise<VerifyLoopChainRow[]> {
  const { data, error } = await admin
    .from("verify_events")
    .select(
      "source_observation_id,verify_token,anonymous_session_id,user_id,result_observation_id,created_at",
    )
    .eq("event_type", "first_observation_created")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row) => ({
    sourceObservationId:
      typeof row.source_observation_id === "string" ? row.source_observation_id : null,
    verifyToken: typeof row.verify_token === "string" ? row.verify_token : "",
    anonymousSessionId:
      typeof row.anonymous_session_id === "string" ? row.anonymous_session_id : "",
    userId: typeof row.user_id === "string" ? row.user_id : null,
    resultObservationId:
      typeof row.result_observation_id === "string" ? row.result_observation_id : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : "",
  }));
}
