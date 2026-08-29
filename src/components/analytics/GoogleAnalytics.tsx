import Script from "next/script";
import { GA_CONSENT_COOKIE, getGaMeasurementId, getGoogleAdsId } from "@/lib/analytics/ga";
import { GaConsentBanner } from "@/components/analytics/GaConsentBanner";

/**
 * GA4 (and optional Google Ads) via gtag.js, with Consent Mode v2 defaults for
 * EEA. Loads only when NEXT_PUBLIC_GA_MEASUREMENT_ID is set. When
 * NEXT_PUBLIC_GOOGLE_ADS_ID is also set we configure the Ads tag so consented
 * visitors are eligible for conversion tracking. Vercel Analytics is unchanged.
 */
export function GoogleAnalytics() {
  const gaId = getGaMeasurementId();
  if (!gaId) return null;
  const adsId = getGoogleAdsId();

  return (
    <>
      <Script id="google-consent-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          // EEA / UK / Switzerland require prior opt-in: default everything denied.
          gtag('consent', 'default', {
            analytics_storage: 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            wait_for_update: 500,
            region: ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH']
          });
          // Rest of the world (incl. US): opt-out model, measured by default.
          gtag('consent', 'default', {
            analytics_storage: 'granted',
            ad_storage: 'granted',
            ad_user_data: 'granted',
            ad_personalization: 'granted'
          });
          // A saved banner choice always wins for that visitor, on every load.
          var _gaConsent = document.cookie.match(/(?:^|; )${GA_CONSENT_COOKIE}=([^;]+)/);
          if (_gaConsent) {
            var _gaVal = decodeURIComponent(_gaConsent[1]);
            if (_gaVal === 'granted' || _gaVal === 'denied') {
              gtag('consent', 'update', {
                analytics_storage: _gaVal,
                ad_storage: _gaVal,
                ad_user_data: _gaVal,
                ad_personalization: _gaVal
              });
            }
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
          ${adsId ? `gtag('config', '${adsId}');` : ""}
        `}
      </Script>
      <GaConsentBanner />
    </>
  );
}
