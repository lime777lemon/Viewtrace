import { copy, type Locale } from "@/lib/i18n";
import type { PlanId } from "@/lib/plans";

/** 料金表・設定・チェックアウトで共通利用するスナップショット説明（マーケ表記 / 技術表記） */
export type SnapshotCapabilityCopy = { marketing: string; technical: string };

export function getSnapshotCapabilityCopy(locale: Locale, planId: PlanId): SnapshotCapabilityCopy {
  const t = copy[locale].dashboardSettings;
  if (planId === "pro") {
    return { marketing: t.snapshotMarketingPro, technical: t.snapshotTechnicalPro };
  }
  if (planId === "starter") {
    return { marketing: t.snapshotMarketingStarter, technical: t.snapshotTechnicalStarter };
  }
  return { marketing: t.snapshotMarketingTrial, technical: t.snapshotTechnicalTrial };
}
