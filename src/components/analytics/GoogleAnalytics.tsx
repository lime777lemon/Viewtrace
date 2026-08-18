import Script from "next/script";
import { GA_CONSENT_COOKIE, getGaMeasurementId } from "@/lib/analytics/ga";
import { GaConsentBanner } from "@/components/analytics/GaConsentBanner";

/**
 * GA4 via gtag.js (Google's manual tag), with Consent Mode v2 defaults for EEA.
 * Loads only when NEXT_PUBLIC_GA_MEASUREMENT_ID is set. Vercel Analytics is unchanged.
 */
export function GoogleAnalytics() {
  const gaId = getGaMeasurementId();
  if (!gaId) return null;

  return (
    <>
      <Script id="google-consent-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            analytics_storage: 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            wait_for_update: 500
          });
          var _gaConsent = document.cookie.match(/(?:^|; )${GA_CONSENT_COOKIE}=([^;]+)/);
          if (_gaConsent && decodeURIComponent(_gaConsent[1]) === 'granted') {
            gtag('consent', 'update', {
              analytics_storage: 'granted',
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied'
            });
          }
        `}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics-config" strategy="afterInteractive">
        {`
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
      <GaConsentBanner />
    </>
  );
}
