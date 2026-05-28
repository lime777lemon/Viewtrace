/** Client-readable cookie set when the visitor accepts analytics cookies. */
export const GA_CONSENT_COOKIE = "viewtrace_ga_consent";

export const GA_CONSENT_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export function getGaMeasurementId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  return id || undefined;
}
