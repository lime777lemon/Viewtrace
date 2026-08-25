import { getGoogleAdsId, getGoogleAdsSignupLabel } from "@/lib/analytics/ga";

type GtagFn = (...args: unknown[]) => void;

function getGtag(): GtagFn | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { gtag?: GtagFn }).gtag;
}

/**
 * Fire the sign-up conversion once on client-side signup success.
 *
 * - Always sends the GA4 `sign_up` event (mark it as a key event in GA4 and it
 *   can be imported into Google Ads without a separate tag).
 * - Additionally sends a Google Ads conversion event when both the Ads id and a
 *   sign-up conversion label are configured.
 *
 * No PII is sent. Consent Mode gates whether the data is actually used.
 */
export function trackSignupConversion(): void {
  const gtag = getGtag();
  if (!gtag) return;

  gtag("event", "sign_up", { method: "email" });

  const adsId = getGoogleAdsId();
  const label = getGoogleAdsSignupLabel();
  if (adsId && label) {
    gtag("event", "conversion", { send_to: `${adsId}/${label}` });
  }
}
