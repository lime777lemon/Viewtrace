import type { CaptureConditionsV1 } from "@/lib/capture-conditions";
import { formatJaDateTime } from "@/lib/format";
import type { Locale } from "@/lib/i18n";

export type RegionalVerification = "verified" | "not_verified";

const COPY = {
  ja: {
    region: "地域",
    environment: "環境",
    viewport: "ビューポート",
    capture: "取得",
    measured: "取得日時",
    regionalVerification: "地域の確認",
    verified: "確認できた",
    notVerified: "確認できていない",
    notVerifiedNote: "リクエストした地域からの取得としては確認できていません。",
    technical: "技術的な詳細",
    browser: "ブラウザ",
    userAgent: "User-Agent",
    wait: "待機条件",
    engine: "測定エンジン",
    fullPage: "フルページ",
    viewportScope: "ビューポート",
    browserDefault: "ブラウザの既定",
    desktop: "Desktop",
    mobile: "Mobile",
    internalTitle: "内部原価",
    internalHint: "顧客向けの記録には出しません。原価の計算用です。",
  },
  en: {
    region: "Region",
    environment: "Environment",
    viewport: "Viewport",
    capture: "Capture",
    measured: "Measured",
    regionalVerification: "Regional verification",
    verified: "Verified",
    notVerified: "Not verified",
    notVerifiedNote: "This capture was not verified from the requested region.",
    technical: "Technical details",
    browser: "Browser",
    userAgent: "User-Agent",
    wait: "Wait condition",
    engine: "Measurement engine",
    fullPage: "Full page",
    viewportScope: "Viewport",
    browserDefault: "Browser default",
    desktop: "Desktop",
    mobile: "Mobile",
    internalTitle: "Internal cost",
    internalHint: "Kept for cost analysis. Not part of the customer record.",
  },
} as const;

export function captureConditionsPresentationCopy(locale: Locale) {
  return COPY[locale];
}

function usStateRequest(regionInput: string): boolean {
  return /^US-[A-Z]{2}$/i.test(regionInput);
}

function usStateVerificationLabel(
  conditions: CaptureConditionsV1,
  locale: Locale,
  verification: RegionalVerification,
  copy: (typeof COPY)[Locale],
): string {
  if (!usStateRequest(conditions.region_input)) return verification === "verified" ? copy.verified : copy.notVerified;
  if (conditions.geo.state_verified === true) {
    return locale === "ja" ? "Screenshot を州単位で確認済み" : "Screenshot verified from this state";
  }
  if (conditions.geo.state_targeting_rejected === true) return locale === "ja" ? "未確認" : "Not verified";
  return copy.notVerified;
}

function usStateVerificationNote(
  conditions: CaptureConditionsV1,
  locale: Locale,
  verification: RegionalVerification,
  copy: (typeof COPY)[Locale],
): string | null {
  if (!usStateRequest(conditions.region_input)) return verification === "verified" ? null : copy.notVerifiedNote;
  if (conditions.geo.state_verified === true) {
    const names = conditions.geo.verified_measurements?.length
      ? conditions.geo.verified_measurements
      : ["screenshot" as const];
    const confirmed = names
      .map((name) =>
        name === "screenshot" ? "Screenshot"
          : name === "interaction" ? "Interaction Check"
            : name === "journey" ? "Journey"
              : "Lab CWV",
      )
      .join(locale === "ja" ? "、" : ", ");
    return locale === "ja"
      ? `この session で州を確認して測ったもの: ${confirmed}。それ以外は同じ session の測定ではありません。`
      : `Measured in the state-verified session: ${confirmed}. Anything else was not measured in that session.`;
  }
  if (conditions.geo.state_targeting_rejected === true) {
    return "State-level proxying unavailable on current provider plan";
  }
  return copy.notVerifiedNote;
}

function requestedSubdivision(regionInput: string): boolean {
  return /^US-[A-Z]{2}$/i.test(regionInput) || /^JP-\d{2}$/i.test(regionInput);
}

/** A proxy fallback, or a country hit when a state was requested, is not that region. */
export function regionalVerification(conditions: CaptureConditionsV1): RegionalVerification {
  const mode = conditions.geo?.proxy_mode;
  if (mode !== "browserless_residential" && mode !== "external_proxy" && mode !== "external_residential") {
    return "not_verified";
  }
  if (!conditions.geo.country) return "not_verified";
  if (/^US-[A-Z]{2}$/i.test(conditions.region_input)) {
    if (conditions.geo.state_verified !== true || !conditions.geo.state) return "not_verified";
  } else if (requestedSubdivision(conditions.region_input) && !conditions.geo.state) {
    return "not_verified";
  }
  return "verified";
}

function engineName(conditions: CaptureConditionsV1): string {
  switch (conditions.engine?.name) {
    case "browserless":
      return "Browserless";
    case "playwright_worker":
      return "Playwright";
    case "microlink":
      return "Microlink";
    case "direct_fetch":
      return "Direct fetch";
    case "form_upload":
      return "Uploaded image";
    default:
      return "—";
  }
}

function waitCondition(conditions: CaptureConditionsV1): string {
  return conditions.engine?.browserless?.wait_until
    ?? conditions.engine?.playwright_worker?.wait_until
    ?? "—";
}

export function presentCaptureConditions(conditions: CaptureConditionsV1, locale: Locale) {
  const copy = COPY[locale];
  const verification = regionalVerification(conditions);
  const device = conditions.device_class === "mobile"
    ? copy.mobile
    : conditions.device_class === "desktop"
      ? copy.desktop
      : null;
  const width = conditions.viewport?.width;
  const height = conditions.viewport?.height;
  const explicitViewport = width != null && height != null;
  const imageWidth = conditions.result?.image_width_px;
  const imageHeight = conditions.result?.image_height_px;
  const imageSize = imageWidth != null && imageHeight != null ? `${imageWidth} × ${imageHeight} px` : null;
  const scope = conditions.full_page_requested ? copy.fullPage : copy.viewportScope;
  return {
    copy,
    customer: {
      region: conditions.region_label || conditions.region_input || "—",
      environment: device ? `${device} · Chromium` : "Chromium",
      viewport: explicitViewport ? `${width}×${height}` : copy.browserDefault,
      capture: scope,
      measured: formatJaDateTime(conditions.captured_at, locale),
      regionalVerification: verification,
      regionalVerificationLabel: usStateVerificationLabel(conditions, locale, verification, copy),
      regionalNote: usStateVerificationNote(conditions, locale, verification, copy),
    },
    technical: {
      browser: "Chromium · Headless",
      userAgent: conditions.browser?.user_agent || "—",
      viewport: explicitViewport ? `${width}×${height}` : copy.browserDefault,
      capture: imageSize ? `${scope} · ${imageSize}` : scope,
      wait: waitCondition(conditions),
      api: conditions.engine?.browserless?.api_surface ?? null,
      engine: engineName(conditions),
      durationMs: conditions.cost_signals?.duration_ms ?? null,
    },
  };
}
