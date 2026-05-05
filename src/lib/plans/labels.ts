import type { Locale } from "@/lib/i18n";
import type { PlanId } from "@/lib/plans";
import { TRIAL_CONFIG } from "@/lib/plans";

export function getTrialPlanUi(locale: Locale): { name: string; priceLabel: string } {
  if (locale === "en") {
    return {
      name: "Free trial",
      priceLabel: `Up to ${TRIAL_CONFIG.freeObservations} observations · ${TRIAL_CONFIG.trialDays} days`,
    };
  }
  return {
    name: "無料トライアル",
    priceLabel: `最大${TRIAL_CONFIG.freeObservations}回・${TRIAL_CONFIG.trialDays}日間`,
  };
}

export function getPlanLabels(planId: PlanId, locale: Locale): {
  audienceLabel: string;
  coverageLabel: string;
  priceLabel: string;
} {
  if (locale === "en") {
    if (planId === "pro") {
      return {
        priceLabel: "$99/mo",
        audienceLabel: "Production, agencies & audit use",
        coverageLabel: "All US states + major countries",
      };
    }
    return {
      priceLabel: "$49/mo",
      audienceLabel: "Try-it-out & light validation",
      coverageLabel: "US + major countries",
    };
  }
  if (planId === "pro") {
    return {
      priceLabel: "$99/月",
      audienceLabel: "本番運用・代理店・監査用途向け",
      coverageLabel: "米国全州＋主要国",
    };
  }
  return {
    priceLabel: "$49/月",
    audienceLabel: "試す・軽い検証用途向け",
    coverageLabel: "米国＋主要国",
  };
}

