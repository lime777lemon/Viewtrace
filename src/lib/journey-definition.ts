import type { Locale } from "@/lib/i18n";
import { journeyMeasurementLines } from "@/lib/journey-measurement";
import { formatResourceRequest, selectResourceRequests, type ResourceRequestV1 } from "@/lib/resource-request";
import { journeyRuntimeObservedLines } from "@/lib/runtime-observation";
import { visualEvidenceLines, type StepVisualEvidence } from "@/lib/visual-evidence";
import { downloadObservedLines, journeyEvidenceLabel, type JourneyEvidenceItem } from "@/lib/journey-step-evidence";
import { journeyRecipe, journeyRecipeReady } from "@/lib/journey-verifiers";
import { parseUploadCustom, parseUploadSample, type JourneyTestFile, type UploadSampleId } from "@/lib/journey-sample-files";
import { countryCodeDisplayName } from "@/lib/observation-geo-readout";
import { resolveBrowserlessResidentialTarget, usStateDisplayName } from "@/lib/regions";
import { normalizeUserUrlInput } from "@/lib/url-preview";

export const JOURNEY_STEP_KINDS = [
  "open_url",
  "click",
  "fill",
  "select",
  "hover",
  "key",
  "drag",
  "wait",
  "assert_visible",
  "assert_present",
  "assert_text",
  "assert_page_text",
  "assert_attribute",
  "assert_url",
  "login",
  "signup",
  "add_to_cart",
  "checkout",
  "search",
  "navigation",
  "contact",
  "lead",
  "newsletter",
  "booking",
  "password_reset",
  "logout",
  "download",
  "language_switch",
  "region_switch",
  "currency_switch",
  "upload",
] as const;

export type JourneyStepKind = (typeof JOURNEY_STEP_KINDS)[number];

/** Authenticated flows need login, a capture, and the result page in one session. */
export const JOURNEY_STEP_LIMIT = 12;

/** A capture started from a Journey can take longer than a click. */
export const JOURNEY_WAIT_MS_MAX = 120_000;

/** Keys a Journey step may press. Other keys are not sent. */
export const JOURNEY_KEYS = ["Enter", "Escape", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Backspace"] as const;

export type JourneyDeviceClass = "desktop" | "mobile";

export type JourneyGeoStage = "city" | "state" | "country" | "no_proxy" | "direct";

/** open_url がページを表示したか。about:blank は未表示。 */
export function journeyOpenPageState(
  step: { status: string; url_after: string | null; detail: string | null },
  locale: Locale,
): { displayed: boolean; headline: string; reason: string | null } {
  const landed = step.url_after?.trim() || "";
  const http = /^https?:\/\//i.test(landed);
  const displayed = http && step.status === "pass";
  const reason = step.detail && step.detail !== landed && !/^https?:\/\//i.test(step.detail)
    ? (step.detail === "url_mismatch"
      ? (locale === "ja" ? "指定したページのホストに着いていない" : "Did not reach the requested host")
      : step.detail)
    : null;
  const headline = displayed
    ? (locale === "ja" ? "ページは表示された" : "Page displayed")
    : http
      ? (locale === "ja" ? "ページは開いたが、指定した URL ではない" : "A page opened, on a different URL")
      : (locale === "ja" ? "ページは表示されていない" : "Page not displayed");
  return { displayed, headline, reason };
}

/** Requests observed during the step. JS, CSS, images, fonts, XHR, fetch, API, and third-party stay. */
export function journeyNetworkEvidence(events: unknown): ResourceRequestV1[] {
  return selectResourceRequests(events);
}

function journeyGeoPair(region: string, stage: string | null | undefined, locale: Locale): { requested: string; observed: string } | null {
  if (stage !== "city" && stage !== "state" && stage !== "country" && stage !== "no_proxy" && stage !== "direct") return null;
  const target = resolveBrowserlessResidentialTarget(region);
  const requested = region === "JP-13"
    ? (locale === "ja" ? "日本 · 東京" : "Japan · Tokyo")
    : target?.stateCode
      ? `${countryCodeDisplayName(target.country, locale)} · ${usStateDisplayName(target.stateCode) ?? target.stateCode}`
      : target
        ? countryCodeDisplayName(target.country, locale)
        : region;
  const observed = stage === "no_proxy" || stage === "direct"
    ? (locale === "ja" ? "地域プロキシなし" : "No regional proxy")
    : stage === "country"
      ? countryCodeDisplayName(target?.country ?? "", locale)
      : stage === "city" && region === "JP-13"
        ? (locale === "ja" ? "日本 · 東京" : "Japan · Tokyo")
        : requested;
  return { requested, observed };
}

/** Same residential outcome as an Observation capture. A country fallback is not the requested state. */
export function journeyCaptureLine(region: string, stage: string | null | undefined, locale: Locale): string | null {
  const pair = journeyGeoPair(region, stage, locale);
  if (!pair) return null;
  return locale === "ja"
    ? `リクエスト ${pair.requested} · 観測 ${pair.observed}`
    : `Requested ${pair.requested} · Observed ${pair.observed}`;
}

/** List cell in the same shape as an Observation: country headline when the state was not the exit. */
export function journeyRunGeoReadout(input: {
  region: string;
  stage: string | null | undefined;
  requestedLabel: string;
  locale: Locale;
  requestedObserved: string;
}): { headline: string; detailLine: string | null } {
  const requested = input.requestedLabel.trim() || input.region;
  const stage = input.stage;
  if (stage !== "city" && stage !== "state" && stage !== "country" && stage !== "no_proxy" && stage !== "direct") {
    return { headline: requested, detailLine: null };
  }
  if (stage === "no_proxy" || stage === "direct") {
    const observed = input.locale === "ja" ? "確認できていない" : "Not verified";
    return {
      headline: requested,
      detailLine: input.requestedObserved.replace("{requested}", requested).replace("{observed}", observed),
    };
  }
  if (stage === "city" || stage === "state") return { headline: requested, detailLine: null };
  const pair = journeyGeoPair(input.region, stage, input.locale);
  const observed = pair?.observed || requested;
  const target = resolveBrowserlessResidentialTarget(input.region);
  const moreSpecific = Boolean(target?.stateCode) || input.region === "JP-13";
  if (!moreSpecific || observed === requested) return { headline: requested, detailLine: null };
  return {
    headline: observed,
    detailLine: input.requestedObserved.replace("{requested}", requested).replace("{observed}", observed),
  };
}

export type JourneyInputRole = "username" | "password" | "name" | "email" | "field";

export type JourneyInput = {
  role: JourneyInputRole;
  selector: string;
  value: string;
};

export const JOURNEY_COMMERCE_KINDS = ["login", "signup", "add_to_cart", "checkout"] as const;
export type JourneyCommerceKind = (typeof JOURNEY_COMMERCE_KINDS)[number];

export function isJourneyCommerceKind(kind: string): kind is JourneyCommerceKind {
  return (JOURNEY_COMMERCE_KINDS as readonly string[]).includes(kind);
}

export const JOURNEY_PURPOSE_KINDS = [
  "search",
  "navigation",
  "contact",
  "lead",
  "newsletter",
  "booking",
  "password_reset",
  "logout",
  "download",
  "language_switch",
  "region_switch",
  "currency_switch",
  "upload",
] as const;

export type JourneyPurposeKind = (typeof JOURNEY_PURPOSE_KINDS)[number];

export function isJourneyPurposeKind(kind: string): kind is JourneyPurposeKind {
  return (JOURNEY_PURPOSE_KINDS as readonly string[]).includes(kind);
}

export type JourneyStepDefinition = {
  id: string;
  kind: JourneyStepKind;
  selector: string;
  value: string;
  url: string;
  wait_ms: number;
  /** Exact side effect this step is allowed to perform. Checkout navigation is not a side effect. */
  permitted_side_effect: JourneySideEffect | null;
  expect_selector: string;
  expect_text: string;
  expect_visible: boolean;
  expect_url: string;
  /** Attribute name for assert_attribute, such as href or aria-expanded. */
  expect_attribute?: string;
  /** HTML lang a language switch must reach, such as en. */
  expect_lang?: string;
  /** Login, signup, and checkout fields. Password values stay {{password}}. */
  inputs?: JourneyInput[];
  /** Checkout confirm control. Place order and payment still require permission. */
  confirm_selector?: string;
  /** Element JPEG before and after this step. Off unless the step turns it on. */
  evidence_screenshot?: boolean;
  /** Video currentTime and paused on this step. Off unless the step turns it on. */
  evidence_video?: boolean;
  /** ViewTrace sample placed on the file input. */
  upload_sample?: UploadSampleId | "";
  /** User-provided test file. Sent only when upload_submit is set. */
  upload_custom?: JourneyTestFile | null;
  /** When true, the step may click the confirm control after the file is selected. */
  upload_submit?: boolean;
  /** When true, the step may drop the test file. A drop can send the file. */
  upload_drop?: boolean;
};

export type JourneySideEffect = "payment" | "place_order" | "delete" | "external_send";

const SIDE_EFFECTS: Array<{ kind: JourneySideEffect; pattern: RegExp }> = [
  { kind: "place_order", pattern: /place\s*order|complete\s*(purchase|order)|注文(を)?確定|購入を確定/i },
  { kind: "payment", pattern: /\b(pay\s*now|submit\s*payment|complete\s*payment|buy\s*now)\b|決済|支払いを完了/i },
  { kind: "delete", pattern: /delete\s*(account|data)?|remove\s*account|アカウント削除|データを削除|削除する/i },
  { kind: "external_send", pattern: /send\s*(email|message)|subscribe|メールを送|外部へ送信|送信する/i },
];

export function journeySideEffectName(value: unknown): JourneySideEffect | null {
  if (value === "payment" || value === "place_order" || value === "delete" || value === "external_send") return value;
  return null;
}

export function journeySideEffectPermitted(detected: JourneySideEffect | null, permitted: JourneySideEffect | null): boolean {
  if (!detected) return true;
  return permitted === detected;
}

export function journeySideEffect(text: string): JourneySideEffect | null {
  const sample = text.slice(0, 240);
  for (const row of SIDE_EFFECTS) {
    if (row.pattern.test(sample)) return row.kind;
  }
  return null;
}

/** Host-only values such as viewtrace.net become https://viewtrace.net/. Paths resolve against the start URL. */
export function resolveJourneyOpenUrl(startUrl: string, stepUrl: string): string | null {
  const start = normalizeUserUrlInput(startUrl);
  if (!start) return null;
  const raw = stepUrl.trim();
  if (!raw || raw === "https://" || raw === "http://") return start;
  const absolute = normalizeUserUrlInput(raw);
  if (absolute && journeyStepHostAllowed(start, absolute)) return absolute;
  try {
    const next = new URL(raw, start);
    if (next.protocol !== "http:" && next.protocol !== "https:") return null;
    if (next.hostname !== new URL(start).hostname) return null;
    next.hash = "";
    return next.href;
  } catch {
    return null;
  }
}

export function resolveJourneySteps(startUrl: string, steps: JourneyStepDefinition[]): JourneyStepDefinition[] {
  return steps.map((step) => {
    if (step.kind !== "open_url") return step;
    return { ...step, url: resolveJourneyOpenUrl(startUrl, step.url) ?? step.url };
  });
}

export function journeyStepHostAllowed(startUrl: string, nextUrl: string): boolean {
  try {
    const start = new URL(startUrl);
    const next = new URL(nextUrl, start);
    if (next.protocol !== "https:" && next.protocol !== "http:") return false;
    return next.hostname === start.hostname;
  } catch {
    return false;
  }
}

const INPUT_ROLES = new Set<JourneyInputRole>(["username", "password", "name", "email", "field"]);

export function commerceJourneyInputs(kind: JourneyCommerceKind): JourneyInput[] {
  if (kind === "login") {
    return [
      { role: "username", selector: "", value: "{{username}}" },
      { role: "password", selector: "", value: "{{password}}" },
    ];
  }
  if (kind === "signup") {
    return [
      { role: "name", selector: "", value: "" },
      { role: "email", selector: "", value: "" },
      { role: "password", selector: "", value: "{{password}}" },
    ];
  }
  return [];
}

function parseJourneyInputs(raw: unknown): JourneyInput[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 4).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const role = INPUT_ROLES.has(row.role as JourneyInputRole) ? row.role as JourneyInputRole : "field";
    const selector = typeof row.selector === "string" ? row.selector.trim().slice(0, 180) : "";
    if (!selector) return [];
    const value = role === "password"
      ? "{{password}}"
      : typeof row.value === "string" ? row.value.slice(0, 240) : "";
    return [{ role, selector, value }];
  });
}

export function parseJourneySteps(raw: unknown): JourneyStepDefinition[] {
  if (!Array.isArray(raw)) return [];
  const steps: JourneyStepDefinition[] = [];
  for (const item of raw.slice(0, JOURNEY_STEP_LIMIT)) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const kind = JOURNEY_STEP_KINDS.find((value) => value === row.kind);
    if (!kind) continue;
    const wait = typeof row.wait_ms === "number" && Number.isFinite(row.wait_ms) ? Math.round(row.wait_ms) : 1000;
    steps.push({
      id: typeof row.id === "string" && row.id.trim() ? row.id.trim().slice(0, 40) : `s${steps.length + 1}`,
      kind,
      selector: typeof row.selector === "string" ? row.selector.trim().slice(0, 180) : "",
      value: typeof row.value === "string" ? row.value.slice(0, 240) : "",
      url: typeof row.url === "string" ? row.url.trim().slice(0, 500) : "",
      wait_ms: Math.min(JOURNEY_WAIT_MS_MAX, Math.max(200, wait)),
      permitted_side_effect: journeySideEffectName(row.permitted_side_effect),
      expect_selector: typeof row.expect_selector === "string" ? row.expect_selector.trim().slice(0, 180) : "",
      expect_text: typeof row.expect_text === "string" ? row.expect_text.slice(0, 180) : "",
      expect_visible: row.expect_visible === true,
      expect_url: typeof row.expect_url === "string" ? row.expect_url.trim().slice(0, 240) : "",
      expect_attribute: typeof row.expect_attribute === "string" ? row.expect_attribute.trim().slice(0, 80) : "",
      expect_lang: typeof row.expect_lang === "string" ? row.expect_lang.trim().slice(0, 32) : "",
      inputs: parseJourneyInputs(row.inputs),
      confirm_selector: typeof row.confirm_selector === "string" ? row.confirm_selector.trim().slice(0, 180) : "",
      evidence_screenshot: row.evidence_screenshot === true,
      evidence_video: row.evidence_video === true,
      upload_sample: parseUploadSample(row.upload_sample),
      upload_custom: parseUploadCustom(row.upload_custom),
      upload_submit: row.upload_submit === true,
      upload_drop: row.upload_drop === true,
    });
  }
  return steps;
}

export function journeyStepNeedsSelector(kind: JourneyStepKind): boolean {
  return kind === "click" || kind === "fill" || kind === "select" || kind === "hover" || kind === "drag" || kind === "assert_visible" || kind === "assert_present" || kind === "assert_text" || kind === "assert_attribute" || isJourneyCommerceKind(kind) || isJourneyPurposeKind(kind);
}

function journeyExpectsOutcome(step: JourneyStepDefinition): boolean {
  if (step.kind === "upload") return true;
  if (journeyRecipeReady(step)) return true;
  if (journeyRecipe(step.kind)) return false;
  return Boolean(step.expect_text || step.expect_visible || step.expect_url);
}

function journeyInputSelector(step: JourneyStepDefinition, role: JourneyInputRole): string {
  return step.inputs?.find((input) => input.role === role)?.selector ?? "";
}

export function validateJourneySteps(startUrl: string, steps: JourneyStepDefinition[]): string | null {
  if (!steps.length) return "steps_required";
  if (steps[0]?.kind !== "open_url") return "open_url_first";
  for (const step of steps) {
    if (step.kind === "open_url" && !resolveJourneyOpenUrl(startUrl, step.url || startUrl)) return "url_host";
    if (journeyStepNeedsSelector(step.kind) && !step.selector) return "selector_required";
    if (step.kind === "drag" && !step.expect_selector.trim()) return "selector_required";
    if ((step.kind === "assert_text" || step.kind === "assert_url" || step.kind === "assert_page_text" || step.kind === "select" || step.kind === "key") && !step.value.trim()) {
      return "value_required";
    }
    if (step.kind === "assert_attribute" && !step.expect_attribute?.trim()) return "attribute_required";
    if (step.kind === "key" && !(JOURNEY_KEYS as readonly string[]).includes(step.value.trim())) return "key_not_allowed";
    if (step.kind === "login" && (!journeyInputSelector(step, "username") || !journeyInputSelector(step, "password"))) {
      return "selector_required";
    }
    if (step.kind === "signup" && (!journeyInputSelector(step, "email") || !journeyInputSelector(step, "password"))) {
      return "selector_required";
    }
    if ((isJourneyCommerceKind(step.kind) || isJourneyPurposeKind(step.kind)) && !journeyExpectsOutcome(step)) return "outcome_required";
    if (step.kind === "upload" && (step.upload_submit || step.upload_drop)) {
      if (!step.upload_sample && !step.upload_custom) return "upload_file_required";
      if (step.upload_submit && !step.confirm_selector) return "upload_confirm_required";
      if (!step.expect_text && !step.expect_visible && !step.expect_url) return "outcome_required";
    }
  }
  return null;
}

export function publicJourneySteps(steps: JourneyStepDefinition[]): JourneyStepDefinition[] {
  return steps.map((step) => ({
    ...step,
    value: step.value.includes("{{password}}") ? "{{password}}" : step.value,
    inputs: (step.inputs ?? []).map((input) => ({
      ...input,
      value: input.role === "password" ? "{{password}}" : input.value,
    })),
  }));
}

const STEP_KIND_LABEL: Record<Locale, Record<JourneyStepKind, string>> = {
  ja: {
    open_url: "URLを開く",
    click: "クリック",
    fill: "入力",
    select: "選択",
    hover: "ホバー",
    key: "キー入力",
    drag: "ドラッグ",
    wait: "待機",
    assert_visible: "表示されている",
    assert_present: "要素がある",
    assert_text: "要素の文字が一致",
    assert_page_text: "ページに文字列がある",
    assert_attribute: "属性値が一致",
    assert_url: "URLが期待値",
    login: "ログイン",
    signup: "アカウント作成",
    add_to_cart: "カートに追加",
    checkout: "チェックアウト",
    search: "検索",
    navigation: "移動",
    contact: "問い合わせ",
    lead: "リード送信",
    newsletter: "ニュースレター",
    booking: "予約",
    password_reset: "パスワード再設定",
    logout: "ログアウト",
    download: "ダウンロード",
    language_switch: "言語の切替",
    region_switch: "地域の切替",
    currency_switch: "通貨の切替",
    upload: "アップロード",
  },
  en: {
    open_url: "Open URL",
    click: "Click",
    fill: "Fill",
    select: "Select",
    hover: "Hover",
    key: "Key press",
    drag: "Drag and drop",
    wait: "Wait",
    assert_visible: "Element is visible",
    assert_present: "Element is present",
    assert_text: "Element text matches",
    assert_page_text: "Page contains text",
    assert_attribute: "Attribute matches",
    assert_url: "URL matches",
    login: "Login",
    signup: "Signup",
    add_to_cart: "Add to cart",
    checkout: "Checkout",
    search: "Search",
    navigation: "Navigation",
    contact: "Contact",
    lead: "Lead form",
    newsletter: "Newsletter",
    booking: "Booking",
    password_reset: "Password reset",
    logout: "Logout",
    download: "Download",
    language_switch: "Language switch",
    region_switch: "Region switch",
    currency_switch: "Currency switch",
    upload: "Upload",
  },
};

const STEP_STATUS_LABEL: Record<Locale, Record<string, string>> = {
  ja: {
    pass: "成功",
    fail: "失敗",
    blocked_for_safety: "未実行",
    not_run: "未実行",
    incomplete: "未完了",
    not_measured: "未測定",
    passed: "成功",
    failed: "失敗",
    blocked: "未実行",
  },
  en: {
    pass: "Passed",
    fail: "Failed",
    blocked_for_safety: "Blocked",
    not_run: "Not run",
    incomplete: "Incomplete",
    not_measured: "Not measured",
    passed: "Passed",
    failed: "Failed",
    blocked: "Blocked",
  },
};

export type JourneyPurpose = "production" | "test" | "fixture";

export function parseJourneyPurpose(value: unknown): JourneyPurpose {
  return value === "test" || value === "fixture" ? value : "production";
}

export function journeyPurposeLabel(purpose: JourneyPurpose, locale: Locale): string {
  if (locale === "ja") {
    if (purpose === "test") return "テスト";
    if (purpose === "fixture") return "Fixture";
    return "本番";
  }
  if (purpose === "test") return "Test";
  if (purpose === "fixture") return "Fixture";
  return "Production";
}

export function journeyStatusLabel(status: string, locale: Locale): string {
  return STEP_STATUS_LABEL[locale][status] ?? status;
}

export function journeyKindLabel(kind: string, locale: Locale): string {
  if (kind in STEP_KIND_LABEL.en) return STEP_KIND_LABEL[locale][kind as JourneyStepKind];
  return kind;
}

function journeyFailureReason(detail: string | null, locale: Locale): string | null {
  if (!detail) return null;
  if (/invalid url/i.test(detail)) return locale === "ja" ? "無効な URL" : "Invalid URL";
  if (detail === "url_mismatch") return locale === "ja" ? "指定したホストに着いていない" : "Did not reach the requested host";
  if (detail === "url_not_expected") return locale === "ja" ? "URL が期待と一致しない" : "URL did not match";
  if (detail === "text_mismatch") return locale === "ja" ? "要素の文字が期待と一致しない" : "Element text did not match";
  if (detail === "page_text_mismatch") return locale === "ja" ? "ページにその文字列は含まれない" : "The page did not contain that text";
  if (detail === "attribute_mismatch") return locale === "ja" ? "属性値が期待と一致しない" : "Attribute value did not match";
  if (detail === "attribute_missing") return locale === "ja" ? "属性名がない" : "Attribute name is missing";
  if (detail === "absent") return locale === "ja" ? "要素が存在しない" : "Element is absent";
  if (detail === "not_visible") return locale === "ja" ? "要素は表示されていない" : "Element is not visible";
  if (detail === "key_not_allowed") return locale === "ja" ? "そのキーは送れない" : "That key is not sent";
  if (detail === "outcome_mismatch") return locale === "ja" ? "期待した変化がなかった" : "Expected change was not observed";
  if (detail === "outcome_not_defined") return locale === "ja" ? "期待する結果が未定義" : "Expected outcome is not defined";
  if (detail === "value_not_set") return locale === "ja" ? "入力が残らなかった" : "Entered value did not stick";
  if (detail === "file_input" || detail === "file_input_missing") return locale === "ja" ? "ファイル入力が見つからない" : "The target is not a file input";
  if (detail === "download_not_started") return locale === "ja" ? "ファイルの取得は始まっていない" : "Download did not start";
  if (/^https?:\/\//i.test(detail)) return null;
  return null;
}

export type JourneyStepReportLine = { label: string; value: string };

/** Run card copy. The question is whether the defined step ran, with expected outcome and measured evidence. */
export function journeyStepReport(
  step: {
    kind: string;
    status: string;
    selector?: string;
    detail: string | null;
    url_after: string | null;
    rendered_text?: string | null;
    before_text?: string | null;
    after_text?: string | null;
    before_visible?: boolean | null;
    after_visible?: boolean | null;
    duration_ms?: number | null;
    network?: Array<{
      method: string;
      path: string;
      status: number | null;
      type?: string;
      duration_ms?: number | null;
      transfer_bytes?: number | null;
      failure?: string | null;
      third_party?: boolean;
      api?: boolean;
    }>;
    runtime?: Array<{ kind: string; message: string }>;
    runtime_observed?: boolean;
    visual?: StepVisualEvidence | null;
    evidence?: JourneyEvidenceItem[];
  },
  defined: (Pick<JourneyStepDefinition, "selector" | "url" | "value" | "expect_text" | "expect_visible" | "expect_url" | "expect_attribute" | "permitted_side_effect"> & {
    expect_selector?: string;
    evidence_screenshot?: boolean;
    evidence_video?: boolean;
  }) | null,
  index: number,
  locale: Locale,
): { title: string; lines: JourneyStepReportLine[] } {
  const ja = locale === "ja";
  const title = `${ja ? "手順" : "Step"} ${index + 1} · ${journeyKindLabel(step.kind, locale)} — ${journeyStatusLabel(step.status, locale)}`;
  const lines: JourneyStepReportLine[] = [];
  const selector = defined?.selector || step.selector || "";
  const target = defined?.url || "";

  if (step.kind === "open_url") {
    if (target) lines.push({ label: ja ? "対象" : "Target", value: target });
    lines.push({ label: ja ? "現在の URL" : "Current URL", value: step.url_after || "about:blank" });
  } else if (isJourneyCommerceKind(step.kind) || isJourneyPurposeKind(step.kind) || step.kind === "click" || step.kind === "fill" || step.kind === "select") {
    const action = isJourneyCommerceKind(step.kind) || isJourneyPurposeKind(step.kind)
      ? journeyKindLabel(step.kind, locale)
      : step.kind === "click"
        ? (ja ? "クリック" : "Click")
        : step.kind === "fill"
          ? (ja ? "入力" : "Fill")
          : (ja ? "選択" : "Select");
    lines.push({ label: ja ? "操作" : "Action", value: selector ? `${action} \`${selector}\`` : action });
  } else if (step.kind === "hover" || step.kind === "key" || step.kind === "drag") {
    const action = step.kind === "hover" ? (ja ? "ホバー" : "Hover") : step.kind === "key" ? (ja ? "キー" : "Key") : (ja ? "ドラッグ" : "Drag");
    const extra = step.kind === "key" ? (defined?.value || "") : step.kind === "drag" ? (defined?.expect_selector || "") : "";
    lines.push({ label: ja ? "操作" : "Action", value: [action, selector ? `\`${selector}\`` : "", extra ? `\`${extra}\`` : ""].filter(Boolean).join(" ") });
  }

  if (step.kind.startsWith("assert_")) {
    const expectedValue = defined?.value || defined?.expect_text || defined?.expect_url || "";
    if (selector && step.kind !== "assert_url" && step.kind !== "assert_page_text") {
      lines.push({ label: ja ? "対象" : "Target", value: selector });
    }
    if (step.kind === "assert_attribute" && defined?.expect_attribute) {
      lines.push({ label: ja ? "属性" : "Attribute", value: defined.expect_attribute });
    }
    if (expectedValue || step.kind === "assert_attribute") {
      lines.push({ label: ja ? "期待" : "Expected", value: expectedValue || (ja ? "（空）" : "(empty)") });
    }
    if (step.kind === "assert_url") {
      lines.push({ label: ja ? "観測した URL" : "Observed URL", value: step.url_after || (ja ? "なし" : "None") });
    } else if (step.kind === "assert_present") {
      lines.push({
        label: ja ? "観測" : "Observed",
        value: step.status === "pass"
          ? (ja ? `存在する（${step.detail || "element"}）` : `Present (${step.detail || "element"})`)
          : (ja ? "存在しない" : "Absent"),
      });
    } else if (step.kind === "assert_visible") {
      lines.push({
        label: ja ? "観測" : "Observed",
        value: step.status === "pass" ? (ja ? "表示されている" : "Visible") : (ja ? "表示されていない" : "Not visible"),
      });
    } else if (step.kind === "assert_attribute") {
      const observed = step.after_text
        ? step.after_text
        : step.status === "pass"
          ? (ja ? "（空）" : "(empty)")
          : (ja ? "なし" : "None");
      lines.push({ label: ja ? "観測した値" : "Observed value", value: observed });
    } else {
      lines.push({ label: ja ? "観測した文字" : "Observed text", value: step.after_text || (ja ? "なし" : "None") });
    }
  }

  if (step.status === "blocked_for_safety") {
    lines.push({
      label: ja ? "安全境界" : "Safety boundary",
      value: step.detail || defined?.permitted_side_effect || (ja ? "副作用" : "side effect"),
    });
    lines.push({ label: ja ? "許可" : "Permission", value: ja ? "付与されていない" : "Not granted" });
    lines.push({ label: ja ? "結果" : "Result", value: ja ? "クリックは実行していない" : "No click was executed" });
    lines.push(...journeyMeasurementLines({
      status: step.status,
      evidence: step.evidence,
      network: step.network,
      runtime: step.runtime,
      evidenceScreenshot: defined?.evidence_screenshot,
      evidenceVideo: defined?.evidence_video,
      locale,
    }));
  } else {
    const expected = defined?.expect_text
      ? (ja ? `文言が「${defined.expect_text}」になる` : `Text becomes “${defined.expect_text}”`)
      : defined?.expect_visible
        ? (ja ? "表示される" : "Becomes visible")
        : defined?.expect_url
          ? (ja ? `URL に ${defined.expect_url} を含む` : `URL contains ${defined.expect_url}`)
          : step.kind === "open_url"
            ? (ja ? "対象の URL を開く" : "Open the target URL")
            : "";
    if (expected && !step.kind.startsWith("assert_")) lines.push({ label: ja ? "期待" : "Expected", value: expected });
    lines.push(...journeyRuntimeObservedLines({
      kind: step.kind,
      status: step.status,
      afterText: step.after_text,
      afterVisible: step.after_visible,
      expectText: defined?.expect_text,
      expectVisible: defined?.expect_visible,
      expectUrl: defined?.expect_url,
      evidence: step.evidence,
      network: journeyNetworkEvidence(step.network ?? []),
      runtime: step.runtime,
      runtimeObserved: step.runtime_observed === true,
      locale,
    }));
    lines.push(...visualEvidenceLines(step.visual ?? null, locale));
    lines.push(...journeyMeasurementLines({
      status: step.status,
      evidence: step.evidence,
      network: step.network,
      runtime: step.runtime,
      evidenceScreenshot: defined?.evidence_screenshot,
      visual: step.visual,
      evidenceVideo: defined?.evidence_video,
      locale,
    }));

    const reason = journeyFailureReason(step.detail, locale);
    if (reason) lines.push({ label: ja ? "理由" : "Reason", value: reason });

    if (step.evidence?.length) {
      for (const item of step.evidence) {
        const playback = item.kind === "video_playing"
          ? (ja
            ? `再生が進んだ（${item.summary}）。画面への表示の正常さは測っていない`
            : `Playback progressed (${item.summary}). The picture was not judged.`)
          : item.summary;
        if (item.kind === "download") {
          const downloadLines = downloadObservedLines(item.summary, locale);
          if (downloadLines.length) {
            lines.push(...downloadLines);
            continue;
          }
        }
        lines.push({ label: journeyEvidenceLabel(item.kind, locale), value: playback });
      }
    } else if (step.before_text != null || step.after_text != null) {
      lines.push({ label: "Evidence", value: `${step.before_text ?? ""} → ${step.after_text ?? ""}` });
    } else if (step.before_visible != null || step.after_visible != null) {
      lines.push({ label: "Evidence", value: `${String(step.before_visible)} → ${String(step.after_visible)}` });
    } else if (step.kind === "open_url" && step.rendered_text) {
      lines.push({ label: "Evidence", value: step.rendered_text });
    }
    const uploadNote = step.detail === "file_not_provided" || step.detail === "file_input"
      ? (ja ? "未測定 — テストファイルを指定した場合だけアップロードを測る。" : "Not measured — file upload requires an explicitly provided test file.")
      : step.detail === "drop_not_permitted"
        ? (ja ? "未測定 — ファイルをドロップすると対象サイトへ送られることがある。測るにはドロップを許可する。" : "Not measured — dropping a file can send it to the target website. Permit drop to measure this.")
        : "";
    lines.push({ label: ja ? "結果" : "Result", value: uploadNote || journeyStatusLabel(step.status, locale) });
    const coded = step.detail === "url_mismatch" || step.detail === "url_not_expected" || step.detail === "text_mismatch" || step.detail === "page_text_mismatch" || step.detail === "attribute_mismatch" || step.detail === "attribute_missing" || step.detail === "absent" || step.detail === "not_visible" || step.detail === "key_not_allowed" || step.detail === "text_match" || step.detail === "page_text_match" || step.detail === "attribute_match" || step.detail === "hovered" || step.detail === "dragged" || step.detail === "outcome_mismatch" || step.detail === "outcome_not_defined" || step.detail === "value_not_set" || step.detail === "file_input" || step.detail === "file_input_missing" || step.detail === "file_not_provided" || step.detail === "file_selected" || step.detail === "file_dropped" || step.detail === "drop_not_permitted" || step.detail === "download_not_started";
    if (step.detail && !coded && step.detail !== reason && !/^https?:\/\//i.test(step.detail) && step.detail !== step.url_after) {
      lines.push({ label: "Evidence", value: step.detail });
    }
  }

  for (const event of journeyNetworkEvidence(step.network ?? [])) {
    lines.push({
      label: "Network",
      value: formatResourceRequest(event),
    });
  }
  if (step.duration_ms != null) {
    lines.push({ label: ja ? "時間" : "Duration", value: `${step.duration_ms} ms` });
  }
  return { title, lines };
}
