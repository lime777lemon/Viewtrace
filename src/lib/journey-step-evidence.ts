import type { Locale } from "@/lib/i18n";

export const JOURNEY_EVIDENCE_KINDS = [
  "url_changed",
  "element_visible",
  "element_hidden",
  "text_exists",
  "input_value",
  "attribute_changed",
  "dom_changed",
  "screenshot_region_changed",
  "http_request",
  "http_status",
  "resource_loaded",
  "download",
  "video_playing",
  "error_appeared",
  "console_error",
  "request_failed",
  "new_tab",
  "redirect",
] as const;

export type JourneyEvidenceKind = (typeof JOURNEY_EVIDENCE_KINDS)[number];

export type JourneyEvidenceItem = {
  kind: JourneyEvidenceKind;
  summary: string;
};

const LABELS: Record<Locale, Record<JourneyEvidenceKind, string>> = {
  ja: {
    url_changed: "URLが変わった",
    element_visible: "要素が表示された",
    element_hidden: "要素が隠れた",
    text_exists: "文言がある",
    input_value: "入力値",
    attribute_changed: "属性が変わった",
    dom_changed: "DOMが変わった",
    screenshot_region_changed: "領域のスクリーンショットが変わった",
    http_request: "HTTPリクエスト",
    http_status: "HTTPステータス",
    resource_loaded: "リソースが読めた",
    download: "ダウンロード",
    video_playing: "動画が再生された",
    error_appeared: "エラーが出た",
    console_error: "console error",
    request_failed: "リクエストが失敗した",
    new_tab: "新しいタブ",
    redirect: "リダイレクト",
  },
  en: {
    url_changed: "URL changed",
    element_visible: "Element visible",
    element_hidden: "Element hidden",
    text_exists: "Text exists",
    input_value: "Input value",
    attribute_changed: "Attribute changed",
    dom_changed: "DOM changed",
    screenshot_region_changed: "Screenshot region changed",
    http_request: "HTTP request occurred",
    http_status: "HTTP response status",
    resource_loaded: "Resource loaded",
    download: "Download occurred",
    video_playing: "Video actually playing",
    error_appeared: "Error appeared",
    console_error: "Console error occurred",
    request_failed: "Network request failed",
    new_tab: "New tab opened",
    redirect: "Redirect occurred",
  },
};

export function journeyEvidenceLabel(kind: JourneyEvidenceKind, locale: Locale): string {
  return LABELS[locale][kind];
}

export function parseJourneyEvidence(raw: unknown): JourneyEvidenceItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<JourneyEvidenceKind>();
  return raw.slice(0, 18).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const kind = JOURNEY_EVIDENCE_KINDS.find((value) => value === row.kind);
    const summary = typeof row.summary === "string" ? row.summary.replace(/\s+/g, " ").trim().slice(0, 180) : "";
    if (!kind || !summary || seen.has(kind)) return [];
    seen.add(kind);
    return [{ kind, summary }];
  });
}
