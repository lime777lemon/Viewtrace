import type { Locale } from "@/lib/i18n";
import { journeyKindLabel, journeyNetworkEvidence, type JourneyGeoStage } from "@/lib/journey-definition";
import { countryCodeDisplayName } from "@/lib/observation-geo-readout";
import type { ResourceRequestV1 } from "@/lib/resource-request";
import { normalizeRuntimeEvents } from "@/lib/runtime-observation";
import { resolveBrowserlessResidentialTarget, usStateDisplayName } from "@/lib/regions";

export type JourneyConclusionStep = {
  id?: string;
  kind: string;
  status: string;
  url_after?: string | null;
  before_text?: string | null;
  after_text?: string | null;
  network?: unknown;
  runtime?: unknown;
  runtime_observed?: boolean;
};

export type JourneyConclusionDefined = {
  id?: string;
  expect_url?: string;
};

const STAGES = new Set<JourneyGeoStage>(["city", "state", "country", "no_proxy", "direct"]);

export function parseJourneyGeoStage(environment: unknown): JourneyGeoStage | null {
  if (!environment || typeof environment !== "object") return null;
  const geo = (environment as { geo?: { stage?: unknown } }).geo;
  const stage = geo && typeof geo === "object" ? geo.stage : null;
  return typeof stage === "string" && STAGES.has(stage as JourneyGeoStage) ? stage as JourneyGeoStage : null;
}

export function journeyObservedPlace(region: string, stage: JourneyGeoStage | null, locale: Locale): string | null {
  if (stage !== "city" && stage !== "state" && stage !== "country") return null;
  const target = resolveBrowserlessResidentialTarget(region);
  if (stage === "country") {
    const country = countryCodeDisplayName(target?.country ?? "", locale);
    return country || null;
  }
  if (region === "JP-13") return locale === "ja" ? "東京" : "Tokyo";
  if (target?.stateCode) return usStateDisplayName(target.stateCode);
  return target ? countryCodeDisplayName(target.country, locale) : null;
}

function deviceWord(device: "mobile" | "desktop", locale: Locale): string {
  if (locale === "ja") return device === "mobile" ? "モバイル" : "デスクトップ";
  return device;
}

function actionWord(kind: string, locale: Locale): string {
  const label = journeyKindLabel(kind, locale);
  return locale === "ja" ? label : label.toLowerCase();
}

function placePhrase(place: string, locale: Locale): string {
  if (locale === "en" && place === "United States") return "the United States";
  return place;
}

/** What this run measured about a customer finishing the journey. A missing region is not named. */
export function journeyCustomerConclusion(input: {
  region: string;
  stage: JourneyGeoStage | null;
  device: "mobile" | "desktop";
  steps: JourneyConclusionStep[];
  locale: Locale;
}): string | null {
  if (!input.steps.length) return null;
  const place = journeyObservedPlace(input.region, input.stage, input.locale);
  const named = place ? placePhrase(place, input.locale) : null;
  const device = deviceWord(input.device, input.locale);
  const measured = input.steps.filter((step) => step.status !== "not_measured");
  const failed = measured.find((step) => step.status === "fail");
  const blocked = measured.find((step) => step.status === "blocked_for_safety");
  const unfinished = measured.some((step) => step.status === "incomplete" || step.status === "not_run");
  const ja = input.locale === "ja";

  if (failed) {
    const action = actionWord(failed.kind, input.locale);
    if (!named) {
      return ja
        ? `${device}では、${action}を完了できなかった。地域は確認できていない。`
        : `On ${device}, ${action} could not be completed. The region was not verified.`;
    }
    return ja
      ? `${named}の${device}では、${action}を完了できない。`
      : `A customer in ${named} using ${device} cannot complete ${action}.`;
  }
  if (blocked) {
    const action = actionWord(blocked.kind, input.locale);
    return ja ? `${action}は実行していない。` : `${journeyKindLabel(blocked.kind, "en")} was not executed.`;
  }
  if (unfinished) {
    return ja ? "この Journey は最後まで実行していない。" : "This journey did not finish.";
  }
  if (!measured.length || !measured.every((step) => step.status === "pass")) return null;
  if (!named) {
    return ja
      ? `${device}では、この Journey を完了できた。地域は確認できていない。`
      : `On ${device}, this journey completed. The region was not verified.`;
  }
  return ja
    ? `${named}の${device}では、この Journey を完了できた。`
    : `A customer in ${named} using ${device} completed this journey.`;
}

function proofRequest(row: ResourceRequestV1): boolean {
  if (row.failure || row.status == null || row.status >= 400) return true;
  if (row.api || row.type === "xhr" || row.type === "fetch") return true;
  return row.method !== "GET" && row.method !== "HEAD";
}

function requestLine(row: ResourceRequestV1): string {
  const status = row.status == null ? "failed" : String(row.status);
  const extra = row.failure && row.failure !== "failed" ? ` · ${row.failure}` : "";
  return `${row.method} ${row.path} · ${status}${extra}`;
}

function loadedPath(step: JourneyConclusionStep, expectUrl: string): string | null {
  if (step.status !== "pass") return null;
  const landed = step.url_after?.trim() || "";
  if (!/^https?:\/\//i.test(landed)) return null;
  let path = "";
  try { path = new URL(landed).pathname || "/"; } catch { return null; }
  const expected = expectUrl.trim();
  if (expected && landed.includes(expected)) return expected.startsWith("/") ? expected : path;
  return path || null;
}

function definedFor(step: JourneyConclusionStep, index: number, defined: JourneyConclusionDefined[] | null | undefined): JourneyConclusionDefined | null {
  if (!defined?.length) return null;
  if (step.id) {
    const match = defined.find((item) => item?.id === step.id);
    if (match) return match;
  }
  return defined[index] ?? null;
}

/** Measured lines across the journey, in step order. Absent facts are omitted. */
export function journeyRunEvidence(input: {
  steps: JourneyConclusionStep[];
  defined?: JourneyConclusionDefined[] | null;
  locale: Locale;
}): Array<{ label: string; value: string }> {
  const ja = input.locale === "ja";
  const lines: Array<{ label: string; value: string }> = [];
  input.steps.forEach((step, index) => {
    const ran = step.status === "pass" || step.status === "fail";
    if (!ran && step.status !== "incomplete") return;
    const expectUrl = definedFor(step, index, input.defined)?.expect_url ?? "";
    if (ran && step.kind !== "open_url" && step.kind !== "wait" && !step.kind.startsWith("assert_")) {
      const value = step.kind === "search" || step.kind === "fill"
        ? (ja ? "入力した" : "entered")
        : step.kind === "hover"
          ? (ja ? "ホバーした" : "hovered")
          : step.kind === "key"
            ? (ja ? "キーを押した" : "pressed a key")
            : step.kind === "drag"
              ? (ja ? "ドラッグした" : "dragged")
              : (ja ? "クリックした" : "clicked");
      lines.push({
        label: journeyKindLabel(step.kind, input.locale),
        value,
      });
    }
    for (const row of journeyNetworkEvidence(step.network).filter(proofRequest)) {
      lines.push({ label: ja ? "リクエスト" : "Request", value: requestLine(row) });
    }
    const before = step.before_text?.trim() ?? "";
    const after = step.after_text?.trim() ?? "";
    if (before && after && before !== after && /^\d+$/.test(before) && /^\d+$/.test(after)) {
      lines.push({
        label: step.kind === "add_to_cart" ? (ja ? "カートの件数" : "Cart count") : (ja ? "件数" : "Count"),
        value: `${before} → ${after}`,
      });
    }
    const path = loadedPath(step, expectUrl);
    if (path) lines.push({ label: "URL", value: ja ? `${path} を表示` : `${path} loaded` });
    if (step.status === "fail" && expectUrl) {
      const page = step.kind === "checkout" ? (ja ? "期待したチェックアウト" : "Expected checkout page") : (ja ? "期待したページ" : "Expected page");
      lines.push({ label: page, value: ja ? "着いていない" : "not reached" });
    }
    if (step.runtime_observed && (step.status === "fail" || normalizeRuntimeEvents(step.runtime).some((row) => row.kind === "console_error"))) {
      const count = normalizeRuntimeEvents(step.runtime).filter((row) => row.kind === "console_error").length;
      if (step.status === "fail" || count > 0) lines.push({ label: "Console error", value: String(count) });
    }
  });
  return lines;
}
