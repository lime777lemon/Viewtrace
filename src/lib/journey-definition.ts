import type { Locale } from "@/lib/i18n";
import { countryCodeDisplayName } from "@/lib/observation-geo-readout";
import { resolveBrowserlessResidentialTarget, usStateDisplayName } from "@/lib/regions";
import { normalizeUserUrlInput } from "@/lib/url-preview";

export const JOURNEY_STEP_KINDS = [
  "open_url",
  "click",
  "fill",
  "select",
  "wait",
  "assert_visible",
  "assert_text",
  "assert_url",
] as const;

export type JourneyStepKind = (typeof JOURNEY_STEP_KINDS)[number];

export type JourneyDeviceClass = "desktop" | "mobile";

export type JourneyGeoStage = "city" | "state" | "country" | "no_proxy" | "direct";

const JOURNEY_ASSET_PATH = /\/_next\/(?:static|image)|\.(?:css|js|map|woff2?|png|jpe?g|gif|svg|ico|webp)$/i;
const JOURNEY_NOISE_PATH = /analytics|beacon|collect|gtm|googletagmanager|doubleclick|hotjar|segment|mixpanel|favicon/i;

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

export function journeyNetworkEvidence(
  events: Array<{ method: string; path: string; status: number | null }>,
): Array<{ method: string; path: string; status: number | null }> {
  return events
    .filter((event) => event.path && !JOURNEY_ASSET_PATH.test(event.path) && !JOURNEY_NOISE_PATH.test(event.path))
    .slice(0, 4);
}

/** Same residential outcome as an Observation capture. A country fallback is not the requested state. */
export function journeyCaptureLine(region: string, stage: string | null | undefined, locale: Locale): string | null {
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
  return locale === "ja"
    ? `リクエスト ${requested} · 観測 ${observed}`
    : `Requested ${requested} · Observed ${observed}`;
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

export function parseJourneySteps(raw: unknown): JourneyStepDefinition[] {
  if (!Array.isArray(raw)) return [];
  const steps: JourneyStepDefinition[] = [];
  for (const item of raw.slice(0, 8)) {
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
      wait_ms: Math.min(15000, Math.max(200, wait)),
      permitted_side_effect: journeySideEffectName(row.permitted_side_effect),
      expect_selector: typeof row.expect_selector === "string" ? row.expect_selector.trim().slice(0, 180) : "",
      expect_text: typeof row.expect_text === "string" ? row.expect_text.slice(0, 180) : "",
      expect_visible: row.expect_visible === true,
      expect_url: typeof row.expect_url === "string" ? row.expect_url.trim().slice(0, 240) : "",
    });
  }
  return steps;
}

export function journeyStepNeedsSelector(kind: JourneyStepKind): boolean {
  return kind === "click" || kind === "fill" || kind === "select" || kind === "assert_visible" || kind === "assert_text";
}

export function validateJourneySteps(startUrl: string, steps: JourneyStepDefinition[]): string | null {
  if (!steps.length) return "steps_required";
  if (steps[0]?.kind !== "open_url") return "open_url_first";
  for (const step of steps) {
    if (step.kind === "open_url" && !resolveJourneyOpenUrl(startUrl, step.url || startUrl)) return "url_host";
    if (journeyStepNeedsSelector(step.kind) && !step.selector) return "selector_required";
    if ((step.kind === "assert_text" || step.kind === "assert_url" || step.kind === "select") && !step.value) {
      return "value_required";
    }
  }
  return null;
}

export function publicJourneySteps(steps: JourneyStepDefinition[]): JourneyStepDefinition[] {
  return steps.map((step) => ({
    ...step,
    value: step.value.includes("{{password}}") ? "{{password}}" : step.value,
  }));
}

const STEP_KIND_LABEL: Record<Locale, Record<JourneyStepKind, string>> = {
  ja: {
    open_url: "URLを開く",
    click: "クリック",
    fill: "入力",
    select: "選択",
    wait: "待機",
    assert_visible: "表示を確認",
    assert_text: "文言を確認",
    assert_url: "URLを確認",
  },
  en: {
    open_url: "Open URL",
    click: "Click",
    fill: "Fill",
    select: "Select",
    wait: "Wait",
    assert_visible: "Assert visible",
    assert_text: "Assert text",
    assert_url: "Assert URL",
  },
};

const STEP_STATUS_LABEL: Record<Locale, Record<string, string>> = {
  ja: {
    pass: "成功",
    fail: "失敗",
    blocked_for_safety: "未実行",
    not_run: "未実行",
    incomplete: "未完了",
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
    passed: "Passed",
    failed: "Failed",
    blocked: "Blocked",
  },
};

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
  if (detail === "outcome_mismatch") return locale === "ja" ? "期待した変化がなかった" : "Expected change was not observed";
  if (detail === "outcome_not_defined") return locale === "ja" ? "期待する結果が未定義" : "Expected outcome is not defined";
  if (detail === "value_not_set") return locale === "ja" ? "入力が残らなかった" : "Entered value did not stick";
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
    network?: Array<{ method: string; path: string; status: number | null }>;
  },
  defined: Pick<JourneyStepDefinition, "selector" | "url" | "value" | "expect_text" | "expect_visible" | "expect_url" | "permitted_side_effect"> | null,
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
  } else if (step.kind === "click" || step.kind === "fill" || step.kind === "select") {
    const action = step.kind === "click"
      ? (ja ? "クリック" : "Click")
      : step.kind === "fill"
        ? (ja ? "入力" : "Fill")
        : (ja ? "選択" : "Select");
    lines.push({ label: ja ? "操作" : "Action", value: selector ? `${action} \`${selector}\`` : action });
  }

  if (step.status === "blocked_for_safety") {
    lines.push({
      label: ja ? "安全境界" : "Safety boundary",
      value: step.detail || defined?.permitted_side_effect || (ja ? "副作用" : "side effect"),
    });
    lines.push({ label: ja ? "許可" : "Permission", value: ja ? "付与されていない" : "Not granted" });
    lines.push({ label: ja ? "結果" : "Result", value: ja ? "クリックは実行していない" : "No click was executed" });
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
    if (expected) lines.push({ label: ja ? "期待" : "Expected", value: expected });

    const reason = journeyFailureReason(step.detail, locale);
    if (reason) lines.push({ label: ja ? "理由" : "Reason", value: reason });

    if (step.before_text != null || step.after_text != null) {
      lines.push({ label: "Evidence", value: `${step.before_text ?? ""} → ${step.after_text ?? ""}` });
    } else if (step.before_visible != null || step.after_visible != null) {
      lines.push({ label: "Evidence", value: `${String(step.before_visible)} → ${String(step.after_visible)}` });
    } else if (step.kind === "open_url" && step.rendered_text) {
      lines.push({ label: "Evidence", value: step.rendered_text });
    }
    const coded = step.detail === "url_mismatch" || step.detail === "outcome_mismatch" || step.detail === "outcome_not_defined" || step.detail === "value_not_set";
    if (step.detail && !coded && step.detail !== reason && !/^https?:\/\//i.test(step.detail) && step.detail !== step.url_after) {
      lines.push({ label: "Evidence", value: step.detail });
    }
  }

  for (const event of journeyNetworkEvidence(step.network ?? []).slice(0, 4)) {
    lines.push({
      label: "Network",
      value: `${event.method} ${event.path} · ${event.status ?? "failed"}`,
    });
  }
  if (step.duration_ms != null) {
    lines.push({ label: ja ? "時間" : "Duration", value: `${step.duration_ms} ms` });
  }
  return { title, lines };
}
