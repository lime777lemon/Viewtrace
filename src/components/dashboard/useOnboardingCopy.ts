"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_ONBOARDING_LANG,
  getOnboardingCopy,
  isOnboardingLang,
  type OnboardingCopy,
  type OnboardingLang,
} from "@/lib/onboarding-copy";
import { readOnboardingLang, writeOnboardingLang } from "@/lib/onboarding";

export function useOnboardingCopy(): {
  lang: OnboardingLang;
  t: OnboardingCopy;
  setLang: (lang: OnboardingLang) => void;
} {
  const [lang, setLangState] = useState<OnboardingLang>(DEFAULT_ONBOARDING_LANG);

  useEffect(() => {
    setLangState(readOnboardingLang());
  }, []);

  function setLang(next: OnboardingLang) {
    if (!isOnboardingLang(next)) return;
    writeOnboardingLang(next);
    setLangState(next);
  }

  return { lang, t: getOnboardingCopy(lang), setLang };
}
