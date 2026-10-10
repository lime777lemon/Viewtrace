"use client";

import { useOnboardingCopy } from "@/components/dashboard/useOnboardingCopy";

export function DashboardOnboardingRegionHint() {
  const { lang, t } = useOnboardingCopy();

  return (
    <p
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="mt-3 rounded-xl border border-accent/25 bg-accent-soft/50 px-3 py-2 text-sm text-ink"
    >
      {t.regionHint}
    </p>
  );
}
