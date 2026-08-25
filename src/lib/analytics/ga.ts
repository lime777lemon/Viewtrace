/** Client-readable cookie set when the visitor accepts analytics cookies. */
export const GA_CONSENT_COOKIE = "viewtrace_ga_consent";

export const GA_CONSENT_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export function getGaMeasurementId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  return id || undefined;
}

/** Google Ads account/tag id, e.g. "AW-18194078071". */
export function getGoogleAdsId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim();
  return id || undefined;
}

/**
 * Conversion label for the sign-up conversion action, e.g. "AbC-D_efG-h1i2j3".
 * Combined with the Ads id as `send_to: "AW-xxxx/label"`. Optional: when unset
 * we still fire the GA4 `sign_up` event (importable into Google Ads).
 */
export function getGoogleAdsSignupLabel(): string | undefined {
  const label = process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL?.trim();
  return label || undefined;
}
