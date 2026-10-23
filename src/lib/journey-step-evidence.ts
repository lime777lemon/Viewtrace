import type { Locale } from "@/lib/i18n";

export const JOURNEY_EVIDENCE_KINDS = [
  "url_changed",
  "element_visible",
  "element_hidden",
  "rendered_heading",
  "rendered_navigation",
  "rendered_control",
  "rendered_image",
  "text_exists",
  "input_value",
  "attribute_changed",
  "dom_changed",
  "screenshot_region_changed",
  "http_request",
  "http_status",
  "resource_loaded",
  "download",
  "file_selected",
  "file_dropped",
  "html_lang",
  "currency_display",
  "region_display",
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
    rendered_heading: "見出し",
    rendered_navigation: "ナビゲーション",
    rendered_control: "操作できる要素",
    rendered_image: "画像",
    text_exists: "文言がある",
    input_value: "入力値",
    attribute_changed: "属性が変わった",
    dom_changed: "DOMが変わった",
    screenshot_region_changed: "領域のスクリーンショットが変わった",
    http_request: "HTTPリクエスト",
    http_status: "HTTPステータス",
    resource_loaded: "リソースが読めた",
    download: "ダウンロード",
    file_selected: "ファイルを選択した",
    file_dropped: "ファイルをドロップした",
    html_lang: "HTML lang",
    currency_display: "通貨表示",
    region_display: "地域表示",
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
    rendered_heading: "Heading",
    rendered_navigation: "Navigation",
    rendered_control: "Control",
    rendered_image: "Image",
    text_exists: "Text exists",
    input_value: "Input value",
    attribute_changed: "Attribute changed",
    dom_changed: "DOM changed",
    screenshot_region_changed: "Screenshot region changed",
    http_request: "HTTP request occurred",
    http_status: "HTTP response status",
    resource_loaded: "Resource loaded",
    download: "Download occurred",
    file_selected: "File selected",
    file_dropped: "File dropped",
    html_lang: "HTML lang",
    currency_display: "Currency display",
    region_display: "Region display",
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

/** Download facts recorded on the step. A missing HTTP field stays not measured. */
export function downloadObservedLines(summary: string, locale: Locale): Array<{ label: string; value: string }> {
  const ja = locale === "ja";
  const fields = new Map<string, string>();
  for (const part of summary.split("|")) {
    const row = part.trim();
    const split = row.indexOf("=");
    if (split <= 0) continue;
    fields.set(row.slice(0, split).trim(), row.slice(split + 1).trim());
  }
  if (!fields.has("download")) return [];
  const missing = ja ? "測っていない" : "not measured";
  return [
    { label: "Content-Disposition", value: fields.get("disposition") || missing },
    { label: "Content-Type", value: fields.get("type") || missing },
    { label: ja ? "ファイル名" : "filename", value: fields.get("filename") || missing },
    { label: ja ? "レスポンスステータス" : "response status", value: fields.get("status") || missing },
    { label: ja ? "ダウンロード" : "download", value: fields.get("download") === "started" ? (ja ? "開始した" : "started") : (fields.get("download") || missing) },
  ];
}

export function parseJourneyEvidence(raw: unknown): JourneyEvidenceItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<JourneyEvidenceKind>();
  return raw.slice(0, JOURNEY_EVIDENCE_KINDS.length).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const kind = JOURNEY_EVIDENCE_KINDS.find((value) => value === row.kind);
    const summary = typeof row.summary === "string" ? row.summary.replace(/\s+/g, " ").trim().slice(0, 180) : "";
    if (!kind || !summary || seen.has(kind)) return [];
    seen.add(kind);
    return [{ kind, summary }];
  });
}
