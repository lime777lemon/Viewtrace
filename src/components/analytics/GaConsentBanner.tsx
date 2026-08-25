"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GA_CONSENT_COOKIE, GA_CONSENT_MAX_AGE_SECONDS } from "@/lib/analytics/ga";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function readConsentCookie(): "granted" | "denied" | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${GA_CONSENT_COOKIE}=([^;]+)`));
  if (!match) return null;
  const value = decodeURIComponent(match[1]);
  return value === "granted" || value === "denied" ? value : null;
}

function writeConsentCookie(value: "granted" | "denied") {
  document.cookie = `${GA_CONSENT_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${GA_CONSENT_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function updateGaConsent(value: "granted" | "denied") {
  window.gtag?.("consent", "update", {
    analytics_storage: value,
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
  });
}

export function GaConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readConsentCookie() === null);
  }, []);

  function accept() {
    writeConsentCookie("granted");
    updateGaConsent("granted");
    setVisible(false);
  }

  function reject() {
    writeConsentCookie("denied");
    updateGaConsent("denied");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="ga-consent-title"
      aria-describedby="ga-consent-desc"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface-elevated/95 p-4 shadow-lg backdrop-blur-sm sm:p-5"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-sm text-ink">
          <p id="ga-consent-title" className="font-semibold">
            Analytics &amp; advertising cookies / 分析・広告 Cookie
          </p>
          <p id="ga-consent-desc" className="text-ink-muted">
            We use Google Analytics and Google Ads to improve the site and measure ad performance. You
            can accept or decline these optional cookies.{" "}
            <Link href="/privacy" className="font-medium text-accent hover:text-accent-hover">
              Privacy Policy
            </Link>
            {" · "}
            Google Analytics と Google 広告で利用状況の把握と広告効果測定を行います。任意の分析・広告 Cookie は拒否できます。
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={reject}
            className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-ink transition hover:border-ink-muted/40"
          >
            Decline / 拒否
          </button>
          <button
            type="button"
            onClick={accept}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover"
          >
            Accept / 許可
          </button>
        </div>
      </div>
    </div>
  );
}
