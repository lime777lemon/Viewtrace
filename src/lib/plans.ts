export type PlanId = "starter" | "pro";

export type LocationsKey = "us_major_countries" | "all_us_states_major_countries";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  priceLabel: string;
  priceMonthlyUsd: number;
  monthlyObservations: number;
  retentionDays: number;
  locationsKey: LocationsKey;
  coverageLabel: string;
  audienceLabel: string;
  csvExport: boolean;
  allUsStates: boolean;
  /** Microlink でフルページスクリーンショット（Pro） */
  snapshotFullPage: boolean;
};

/** 無料トライアル（LP・請求設計と一致） */
export const TRIAL_CONFIG = {
  freeObservations: 20,
  trialDays: 14,
  creditCardRequired: false,
} as const;

export const PLANS: Record<PlanId, PlanDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceLabel: "$49/月",
    priceMonthlyUsd: 49,
    monthlyObservations: 80,
    retentionDays: 7,
    locationsKey: "us_major_countries",
    coverageLabel: "米国＋主要国",
    audienceLabel: "試す・軽い検証用途向け",
    csvExport: false,
    allUsStates: false,
    snapshotFullPage: false,
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceLabel: "$99/月",
    priceMonthlyUsd: 99,
    monthlyObservations: 250,
    retentionDays: 60,
    locationsKey: "all_us_states_major_countries",
    coverageLabel: "米国全州＋主要国",
    audienceLabel: "本番運用・代理店・報告・記録整理向け",
    csvExport: true,
    allUsStates: true,
    snapshotFullPage: true,
  },
};

function parseOverageUsdFromEnv(): number | null {
  const raw =
    process.env.NEXT_PUBLIC_OVERAGE_PER_OBSERVATION_USD ?? process.env.OVERAGE_PER_OBSERVATION_USD;
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(String(raw).trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * 枠超過時の従量単価（USD / 回）。
 * `NEXT_PUBLIC_OVERAGE_PER_OBSERVATION_USD` または `OVERAGE_PER_OBSERVATION_USD` に正の数を設定したときだけ返す。
 * 未設定・空・0 以下は null（LP・FAQ・プラン表記では従量を出さない）。
 */
export function getOveragePerObservationUsd(): number | null {
  return parseOverageUsdFromEnv();
}

const overageUsdSnapshot = parseOverageUsdFromEnv();

/** Stripe メタデータ／アプリ制限と揃えた設定スナップショット */
export const billingConfig = {
  plans: {
    starter: {
      name: PLANS.starter.name,
      price_monthly_usd: PLANS.starter.priceMonthlyUsd,
      monthly_observation_limit: PLANS.starter.monthlyObservations,
      retention_days: PLANS.starter.retentionDays,
      locations: PLANS.starter.locationsKey,
      csv_export: PLANS.starter.csvExport,
      snapshot_full_page: PLANS.starter.snapshotFullPage,
      ...(overageUsdSnapshot != null ? { overage_price_usd: overageUsdSnapshot } : {}),
    },
    pro: {
      name: PLANS.pro.name,
      price_monthly_usd: PLANS.pro.priceMonthlyUsd,
      monthly_observation_limit: PLANS.pro.monthlyObservations,
      retention_days: PLANS.pro.retentionDays,
      locations: PLANS.pro.locationsKey,
      csv_export: PLANS.pro.csvExport,
      snapshot_full_page: PLANS.pro.snapshotFullPage,
      ...(overageUsdSnapshot != null ? { overage_price_usd: overageUsdSnapshot } : {}),
    },
  },
  trial: {
    free_observations: TRIAL_CONFIG.freeObservations,
    trial_days: TRIAL_CONFIG.trialDays,
    credit_card_required: TRIAL_CONFIG.creditCardRequired,
  },
} as const;

export function parsePlanId(value: string | undefined | null): PlanId {
  if (value === "pro") return "pro";
  return "starter";
}

export function getPlan(planId: PlanId): PlanDefinition {
  return PLANS[planId];
}
