/** 一括は地域ごとに 1 Observation。サーバレス時間と誤操作を抑える。 */
export const MULTI_REGION_RUN_MAX = 6;

/** プランで選べるときだけ出す推奨セット。 */
export const MULTI_REGION_SUGGESTED = ["JP-13", "JP", "US-CA", "GB", "AU"] as const;

export function clampRegionSelection(
  values: readonly string[],
  allowed: ReadonlySet<string>,
  max = MULTI_REGION_RUN_MAX,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value || !allowed.has(value) || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
}

export function suggestedRegionsForPlan(allowed: ReadonlySet<string>): string[] {
  return MULTI_REGION_SUGGESTED.filter((value) => allowed.has(value));
}
