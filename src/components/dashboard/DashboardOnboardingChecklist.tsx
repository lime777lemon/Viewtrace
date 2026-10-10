"use client";

import Link from "next/link";
import { OnboardingLanguageSelect } from "@/components/dashboard/OnboardingLanguageSelect";
import { useOnboardingCopy } from "@/components/dashboard/useOnboardingCopy";

export function DashboardOnboardingChecklist() {
  const { lang, t, setLang } = useOnboardingCopy();

  return (
    <section
      aria-labelledby="onboarding-checklist-title"
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="rounded-2xl border border-accent/25 bg-accent-soft/50 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          {t.kicker}
        </p>
        <OnboardingLanguageSelect lang={lang} label={t.languageLabel} onChange={setLang} />
      </div>
      <h2 id="onboarding-checklist-title" className="mt-1 font-display text-lg font-semibold text-ink">
        {t.checklistTitle}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t.checklistBody}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/region-search"
          className="inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          {t.checklistCta}
        </Link>
        <Link href="/dashboard/help" className="text-sm font-semibold text-accent hover:text-accent-hover">
          {t.helpLink}
        </Link>
      </div>
    </section>
  );
}
