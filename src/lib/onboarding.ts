import {
  DEFAULT_ONBOARDING_LANG,
  isOnboardingLang,
  type OnboardingLang,
} from "@/lib/onboarding-copy";

export const ONBOARDING_STORAGE_PREFIX = "viewtrace_onboarding_v1:";
export const ONBOARDING_FORCE_KEY = "viewtrace_onboarding_force";
export const ONBOARDING_LANG_KEY = "viewtrace_onboarding_lang";
export const ONBOARDING_QUERY = "onboarding";

export const ONBOARDING_STEP_IDS = ["observe", "observeAgain", "compare", "share"] as const;
export type OnboardingStepId = (typeof ONBOARDING_STEP_IDS)[number];

export function onboardingStorageKey(userId: string): string {
  return `${ONBOARDING_STORAGE_PREFIX}${userId}`;
}

export function readOnboardingWelcomeSeen(userId: string): boolean {
  try {
    const raw = localStorage.getItem(onboardingStorageKey(userId));
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { welcomeSeen?: unknown };
    return parsed.welcomeSeen === true;
  } catch {
    return false;
  }
}

export function writeOnboardingWelcomeSeen(userId: string): void {
  try {
    localStorage.setItem(onboardingStorageKey(userId), JSON.stringify({ welcomeSeen: true }));
  } catch {
    /* private mode */
  }
}

export function requestOnboardingReplay(): void {
  try {
    sessionStorage.setItem(ONBOARDING_FORCE_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function consumeOnboardingForce(): boolean {
  try {
    const forced = sessionStorage.getItem(ONBOARDING_FORCE_KEY) === "1";
    if (forced) sessionStorage.removeItem(ONBOARDING_FORCE_KEY);
    return forced;
  } catch {
    return false;
  }
}

export function readOnboardingLang(): OnboardingLang {
  try {
    const raw = localStorage.getItem(ONBOARDING_LANG_KEY);
    if (raw && isOnboardingLang(raw)) return raw;
  } catch {
    /* private mode */
  }
  return DEFAULT_ONBOARDING_LANG;
}

export function writeOnboardingLang(lang: OnboardingLang): void {
  try {
    localStorage.setItem(ONBOARDING_LANG_KEY, lang);
  } catch {
    /* private mode */
  }
}
