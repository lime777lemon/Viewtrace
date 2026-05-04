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
  if (option.value.startsWith("US-")) return option.label;
  return MAJOR_COUNTRY_EN[option.value] ?? option.label;
}

/** 主要国・地域（両プラン共通で選択可） */
const MAJOR_COUNTRIES: RegionOption[] = [
  { value: "GB", label: "英国" },
  { value: "DE", label: "ドイツ" },
  { value: "FR", label: "フランス" },
  { value: "JP", label: "日本" },
  { value: "AU", label: "オーストラリア" },
  { value: "CA", label: "カナダ" },
];

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
    return [...PRO_US, ...MAJOR_COUNTRIES];
  }
  return [...STARTER_US, ...MAJOR_COUNTRIES];
}
