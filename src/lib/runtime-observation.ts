import type { Locale } from "@/lib/i18n";
import type { JourneyEvidenceItem } from "@/lib/journey-step-evidence";
import { formatResourceRequest, type ResourceRequestV1 } from "@/lib/resource-request";

/** Runtime facts collected beside an action. They do not decide the step result. */
export const RUNTIME_KINDS = ["console_error", "uncaught", "unhandled_rejection", "request_failed"] as const;

export type RuntimeKind = (typeof RUNTIME_KINDS)[number];

export type RuntimeEvent = {
  kind: RuntimeKind;
  message: string;
};

const ALIASES: Record<string, RuntimeKind> = {
  console_error: "console_error",
  pageerror: "uncaught",
  uncaught: "uncaught",
  unhandled_rejection: "unhandled_rejection",
  request_failed: "request_failed",
  requestfailed: "request_failed",
};

export function normalizeRuntimeEvents(raw: unknown): RuntimeEvent[] {
  if (!Array.isArray(raw)) return [];
  const rows = raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const kind = ALIASES[typeof row.kind === "string" ? row.kind : ""];
    const message = typeof row.message === "string" ? row.message.replace(/\s+/g, " ").trim().slice(0, 160) : "";
    if (!kind || !message) return [];
    return [{ kind, message }];
  });
  const exceptions = rows.filter((row) => row.kind === "uncaught" || row.kind === "unhandled_rejection");
  return rows.filter((row) => {
    if (row.kind !== "console_error" || !/^Uncaught\b/.test(row.message)) return true;
    return !exceptions.some((item) => item.message && row.message.includes(item.message));
  }).slice(0, 8);
}

export function countRuntime(events: RuntimeEvent[]): Record<RuntimeKind, number> {
  return {
    console_error: events.filter((row) => row.kind === "console_error").length,
    uncaught: events.filter((row) => row.kind === "uncaught").length,
    unhandled_rejection: events.filter((row) => row.kind === "unhandled_rejection").length,
    request_failed: events.filter((row) => row.kind === "request_failed").length,
  };
}

const LABEL = {
  ja: {
    click: "ボタン操作",
    dom: "DOMの変化",
    request: "リクエスト",
    console: "console error",
    uncaught: "捕捉されない例外",
    rejection: "未処理の rejection",
    failed: "失敗したリソース",
    expected: "期待した表示",
    expectedText: "期待した文言",
    expectedUrl: "期待した URL",
    ran: "✓",
    notObserved: "観測されていない",
    visible: "見えている",
    notVisible: "見えていない",
    textSeen: "出ている",
    textMissing: "出ていない",
  },
  en: {
    click: "Button click",
    dom: "DOM mutation",
    request: "Request",
    console: "Console error",
    uncaught: "Uncaught exception",
    rejection: "Unhandled rejection",
    failed: "Failed resource",
    expected: "Expected modal",
    expectedText: "Expected text",
    expectedUrl: "Expected URL",
    ran: "✓",
    notObserved: "Not observed",
    visible: "Visible",
    notVisible: "Not visible",
    textSeen: "Visible",
    textMissing: "Not visible",
  },
} as const;

/** Facts observed during one step. A console error does not change the step result. */
export function journeyRuntimeObservedLines(input: {
  kind: string;
  status: string;
  afterText?: string | null;
  afterVisible?: boolean | null;
  expectText?: string;
  expectVisible?: boolean;
  expectUrl?: string;
  evidence?: JourneyEvidenceItem[];
  network?: ResourceRequestV1[];
  runtime?: unknown;
  runtimeObserved?: boolean;
  locale: Locale;
}): Array<{ label: string; value: string }> {
  if (input.status === "not_run" || input.status === "blocked_for_safety") return [];
  const copy = LABEL[input.locale];
  const lines: Array<{ label: string; value: string }> = [];
  const ran = input.status === "pass" || input.status === "fail" || input.status === "incomplete";
  if (ran && input.kind !== "open_url" && input.kind !== "wait") {
    lines.push({ label: copy.click, value: copy.ran });
  }
  const dom = (input.evidence ?? []).some((item) => item.kind === "dom_changed");
  lines.push({ label: copy.dom, value: dom ? copy.ran : copy.notObserved });
  for (const row of input.network ?? []) {
    lines.push({ label: copy.request, value: formatResourceRequest(row) });
  }
  const events = normalizeRuntimeEvents(input.runtime);
  const counts = countRuntime(events);
  const failedInNetwork = (input.network ?? []).filter((row) => row.failure != null || row.status == null || row.status >= 400).length;
  const failedResources = Math.max(failedInNetwork, counts.request_failed);
  const show = (count: number) => input.runtimeObserved === true || count > 0;
  if (show(counts.console_error)) {
    const sample = events.find((row) => row.kind === "console_error");
    lines.push({ label: copy.console, value: sample ? `${counts.console_error} · ${sample.message}` : String(counts.console_error) });
  }
  if (show(counts.uncaught)) {
    const sample = events.find((row) => row.kind === "uncaught");
    lines.push({ label: copy.uncaught, value: sample ? `${counts.uncaught} · ${sample.message}` : String(counts.uncaught) });
  }
  if (show(counts.unhandled_rejection)) {
    const sample = events.find((row) => row.kind === "unhandled_rejection");
    lines.push({ label: copy.rejection, value: sample ? `${counts.unhandled_rejection} · ${sample.message}` : String(counts.unhandled_rejection) });
  }
  if (show(failedResources)) lines.push({ label: copy.failed, value: String(failedResources) });
  if (input.expectVisible) {
    lines.push({
      label: copy.expected,
      value: input.afterVisible === true ? copy.visible : input.afterVisible === false ? copy.notVisible : copy.notObserved,
    });
  } else if (input.expectText) {
    const seen = (input.afterText ?? "").includes(input.expectText);
    lines.push({ label: copy.expectedText, value: seen ? copy.textSeen : copy.textMissing });
  } else if (input.expectUrl) {
    lines.push({ label: copy.expectedUrl, value: input.status === "pass" ? copy.visible : copy.notVisible });
  }
  return lines;
}
