import { copy, type Locale } from "@/lib/i18n";
import type { PlanId } from "@/lib/plans";
import { getPlan } from "@/lib/plans";

/** 料金表・設定・チェックアウトで共通利用するスナップショット説明（マーケ表記 / 技術表記） */
export type SnapshotCapabilityCopy = { marketing: string; technical: string };

export function getSnapshotCapabilityCopy(locale: Locale, planId: PlanId): SnapshotCapabilityCopy {
  const t = copy[locale].dashboardSettings;
  if (getPlan(planId).snapshotFullPage) {
    return { marketing: t.snapshotMarketingPro, technical: t.snapshotTechnicalPro };
  }
  return { marketing: t.snapshotMarketingStarter, technical: t.snapshotTechnicalStarter };
}
