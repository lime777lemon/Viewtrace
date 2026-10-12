import type { PlanId } from "@/lib/plans";
import type { Locale } from "@/lib/i18n";

export type RegionOption = { value: string; label: string };

const MAJOR_COUNTRY_EN: Record<string, string> = {
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
  JP: "Japan",
  AU: "Australia",
  CA: "Canada",
};

/** LP・UI で英語表示する際のラベル（米国州は既に英語） */
export function getRegionLabelForLocale(option: RegionOption, locale: Locale): string {
  if (locale === "ja") return option.label;
  if (option.value === "JP-13") return "Japan · Tokyo";
  if (option.value.startsWith("US-")) return option.label;
  return MAJOR_COUNTRY_EN[option.value] ?? option.label;
}

/** 主要国・地域（両プラン共通で選択可）— UI では米国より先に表示 */
const MAJOR_COUNTRIES: RegionOption[] = [
  { value: "GB", label: "英国" },
  { value: "DE", label: "ドイツ" },
  { value: "FR", label: "フランス" },
  { value: "JP", label: "日本" },
  { value: "JP-13", label: "日本 · 東京" },
  { value: "AU", label: "オーストラリア" },
  { value: "CA", label: "カナダ" },
];

/** 地域選択の初期値（主要国の先頭） */
export const DEFAULT_OBSERVATION_REGION = MAJOR_COUNTRIES[0]!.value;

/** Starter：米国の代表州 */
const STARTER_US: RegionOption[] = [
  { value: "US-CA", label: "US · California" },
  { value: "US-NY", label: "US · New York" },
  { value: "US-TX", label: "US · Texas" },
  { value: "US-WA", label: "US · Washington" },
  { value: "US-FL", label: "US · Florida" },
  { value: "US-IL", label: "US · Illinois" },
];

const US_STATES: [string, string][] = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
];

const PRO_US: RegionOption[] = US_STATES.map(([abbr, name]) => ({
  value: `US-${abbr}`,
  label: `US · ${name}`,
}));

export function getRegionOptions(planId: PlanId): RegionOption[] {
  if (planId === "pro") {
    return [...MAJOR_COUNTRIES, ...PRO_US];
  }
  /** Starter: 主要国 + 代表州（UI の地域欄と一致） */
  return [...MAJOR_COUNTRIES, ...STARTER_US];
}

const ALL_OBSERVATION_REGION_VALUES = new Set([
  ...getRegionOptions("starter").map((r) => r.value),
  ...getRegionOptions("pro").map((r) => r.value),
]);

/** フォーム・クエリから来た地域コードを正規化（大小・不可視文字）。 */
export function normalizeObservationRegionInput(value: string): string {
  const t = value
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
  const us = t.match(/^us-([a-z]{2})$/i);
  if (us) return `US-${us[1].toUpperCase()}`;
  const jpPref = t.match(/^jp-(\d{2})$/i);
  if (jpPref) return `JP-${jpPref[1]}`;
  if (/^[a-z]{2}$/i.test(t) && t.length === 2) return t.toUpperCase();
  return t;
}

/** ログイン中プランで選べる地域か（自動観測の保存など） */
export function isValidObservationRegionForPlan(planId: PlanId, value: string): boolean {
  const normalized = normalizeObservationRegionInput(value);
  return getRegionOptions(planId).some((o) => o.value === normalized);
}

/** API 等で渡される region 値（US-CA, GB など）が UI と一致するか */
export function isValidObservationRegion(value: string): boolean {
  return ALL_OBSERVATION_REGION_VALUES.has(normalizeObservationRegionInput(value));
}

const US_STATE_ABBR_TO_NAME: Record<string, string> = Object.fromEntries(US_STATES);

/** REST `/screenshot` は proxyState が通らないことがある。拒否時の proxyCity（小文字・空白なし）。 */
const US_STATE_PROXY_CITY: Record<string, string> = {
  AL: "birmingham",
  AK: "anchorage",
  AZ: "phoenix",
  AR: "littlerock",
  CA: "losangeles",
  CO: "denver",
  CT: "hartford",
  DE: "wilmington",
  FL: "miami",
  GA: "atlanta",
  HI: "honolulu",
  ID: "boise",
  IL: "chicago",
  IN: "indianapolis",
  IA: "desmoines",
  KS: "wichita",
  KY: "louisville",
  LA: "neworleans",
  ME: "bangor",
  MD: "baltimore",
  MA: "boston",
  MI: "detroit",
  MN: "minneapolis",
  MS: "jackson",
  MO: "kansascity",
  MT: "billings",
  NE: "omaha",
  NV: "lasvegas",
  NH: "manchester",
  NJ: "newark",
  NM: "albuquerque",
  NY: "newyork",
  NC: "charlotte",
  ND: "fargo",
  OH: "columbus",
  OK: "oklahomacity",
  OR: "portland",
  PA: "philadelphia",
  RI: "providence",
  SC: "columbia",
  SD: "siouxfalls",
  TN: "nashville",
  TX: "houston",
  UT: "saltlakecity",
  VT: "burlington",
  VA: "richmond",
  WA: "seattle",
  WV: "huntington",
  WI: "milwaukee",
  WY: "cheyenne",
};

export function usStateDisplayName(codeOrName: string): string | null {
  const raw = codeOrName.trim();
  if (!raw) return null;
  const abbr = raw.toUpperCase();
  if (US_STATE_ABBR_TO_NAME[abbr]) return US_STATE_ABBR_TO_NAME[abbr];
  const compact = raw.toLowerCase().replace(/[\s_-]+/g, "");
  for (const [, name] of US_STATES) {
    if (name.toLowerCase().replace(/\s+/g, "") === compact) return name;
  }
  return null;
}

/**
 * Browserless 内蔵 residential プロキシ向けの国・州ターゲット。
 * REST `/screenshot` は proxyCountry + proxyCity（Scale）。成功したら Observed に stateCode を書く。
 * @see https://docs.browserless.io/rest-apis/proxies
 */
export function resolveBrowserlessResidentialTarget(regionValue: string): {
  country: string;
  /** Browserless proxyState 用（california） */
  state?: string;
  /** Observed に書く USPS（FL） */
  stateCode?: string;
  /** REST proxyCity 用（miami） */
  city?: string;
} | null {
  const rv = normalizeObservationRegionInput(regionValue);
  if (!rv) return null;

  const us = rv.match(/^US-([A-Z]{2})$/);
  if (us) {
    const code = us[1]!;
    const name = US_STATE_ABBR_TO_NAME[code];
    if (!name) return null;
    return {
      country: "us",
      state: name.toLowerCase().replace(/\s+/g, "_"),
      stateCode: code,
      city: US_STATE_PROXY_CITY[code],
    };
  }

  if (rv === "JP-13") {
    return { country: "jp", city: "tokyo" };
  }

  if (/^[A-Z]{2}$/.test(rv)) {
    return { country: rv.toLowerCase() };
  }

  return null;
}
