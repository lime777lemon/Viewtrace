"use client";

import { ONBOARDING_LANGS, type OnboardingLang } from "@/lib/onboarding-copy";

export function OnboardingLanguageSelect({
  lang,
  label,
  onChange,
}: {
  lang: OnboardingLang;
  label: string;
  onChange: (lang: OnboardingLang) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
      <span>{label}</span>
      <select
        value={lang}
        onChange={(event) => onChange(event.target.value as OnboardingLang)}
        className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-ink outline-none ring-accent/25 focus:border-accent/40 focus:ring-2"
      >
        {ONBOARDING_LANGS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
