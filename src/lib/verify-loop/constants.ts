export const VERIFY_LOOP_SESSION_COOKIE = "vt_vl_sid";
export const VERIFY_LOOP_TOKEN_COOKIE = "vt_vl_token";
export const VERIFY_LOOP_NEXT_COOKIE = "vt_vl_next";

export const VERIFY_LOOP_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 90;

export const VERIFY_VIEW_DEDUP_MS = 24 * 60 * 60 * 1000;
export const VERIFY_EVENT_RATE_WINDOW_MS = 10 * 60 * 1000;
export const VERIFY_EVENT_RATE_MAX = 40;

export const VERIFY_LOOP_EVENT_TYPES = [
  "verify_view",
  "verify_cta_click",
  "url_submitted",
  "signup_started",
  "signup_completed",
  "first_observation_created",
] as const;

export type VerifyLoopEventType = (typeof VERIFY_LOOP_EVENT_TYPES)[number];

export function isVerifyLoopEventType(value: string): value is VerifyLoopEventType {
  return (VERIFY_LOOP_EVENT_TYPES as readonly string[]).includes(value);
}
