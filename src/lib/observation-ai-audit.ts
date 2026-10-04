import type { Observation } from "@/lib/demo/observations";
import type { Locale } from "@/lib/i18n";
import { classifyHtmlHeadSignals } from "@/lib/observation-html-signals-readout";
import { observationGeoCopyFrom, observationGeoReadout } from "@/lib/observation-geo-readout";
import { copy } from "@/lib/i18n";

export const PAGE_AUDIT_PROMPT_VERSION = "page-audit-v1";
export const PAGE_AUDIT_TYPE = "page_audit";

export type AiAuditNoteKind = "visible" | "region_time" | "page";
export type AiAuditSource = "record" | "ai";

export type AiAuditNote = {
  kind: AiAuditNoteKind;
  text: string;
};

export type ObservationAiAudit = {
  summary: string;
  notes: AiAuditNote[];
  source: AiAuditSource;
  model: string | null;
  promptVersion: string;
  createdAt: string;
};

const NOTE_KINDS = new Set<AiAuditNoteKind>(["visible", "region_time", "page"]);

export function isObservationUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
}

export function parseAiAuditNotes(raw: unknown): AiAuditNote[] {
  if (!Array.isArray(raw)) return [];
  const notes: AiAuditNote[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const kind = (item as { kind?: unknown }).kind;
    const text = (item as { text?: unknown }).text;
    if (typeof kind !== "string" || !NOTE_KINDS.has(kind as AiAuditNoteKind)) continue;
    if (typeof text !== "string" || !text.trim()) continue;
    notes.push({ kind: kind as AiAuditNoteKind, text: text.trim().slice(0, 400) });
    if (notes.length >= 12) break;
  }
  return notes;
}

export function parseObservationAiAudit(row: {
  summary?: unknown;
  notes?: unknown;
  source?: unknown;
  model?: unknown;
  prompt_version?: unknown;
  created_at?: unknown;
}): ObservationAiAudit | null {
  const notes = parseAiAuditNotes(row.notes);
  const summary = typeof row.summary === "string" ? row.summary.trim() : "";
  if (!summary && notes.length === 0) return null;
  const source = row.source === "ai" ? "ai" : "record";
  return {
    summary: summary.slice(0, 500) || (source === "ai" ? "AI audit" : "Record audit"),
    notes,
    source,
    model: typeof row.model === "string" && row.model.trim() ? row.model.trim() : null,
    promptVersion:
      typeof row.prompt_version === "string" && row.prompt_version.trim()
        ? row.prompt_version.trim()
        : PAGE_AUDIT_PROMPT_VERSION,
    createdAt:
      typeof row.created_at === "string" && row.created_at.trim()
        ? row.created_at
        : new Date().toISOString(),
  };
}

export function observationAuditFacts(obs: Observation): Record<string, unknown> {
  const signals = obs.captureConditions?.html_signals;
  const geo = obs.captureConditions?.geo;
  return {
    url: obs.url,
    requested_region: obs.regionValue ?? null,
    requested_label: obs.regionLabel,
    captured_at: obs.capturedAt,
    status: obs.status,
    page_title: obs.pageTitle ?? null,
    has_snapshot: Boolean(obs.snapshotImageUrl),
    observed_country: geo?.country ?? null,
    observed_state: geo?.state ?? null,
    proxy_mode: geo?.proxy_mode ?? null,
    html_lang: signals?.html_lang ?? null,
    document_title: signals?.document_title ?? null,
    meta_description: signals?.meta_description ?? null,
    canonical_url: signals?.canonical_url ?? null,
    canonical_mismatch: signals?.canonical_mismatch ?? null,
    robots_meta: signals?.robots_meta ?? null,
    noindex: signals?.noindex ?? null,
    og_title: signals?.og_title ?? null,
    http_status: signals?.http_status ?? null,
    final_url: signals?.final_url ?? null,
  };
}

export function buildRecordPageAudit(obs: Observation, locale: Locale): ObservationAiAudit {
  const ja = locale === "ja";
  const notes: AiAuditNote[] = [];
  const signals = obs.captureConditions?.html_signals;

  if (obs.status === "failure") {
    notes.push({
      kind: "page",
      text: ja
        ? "この地域では取得に失敗しています。画面の指摘はできません。"
        : "Capture failed in this region. There is no page to review.",
    });
  } else if (!obs.snapshotImageUrl) {
    notes.push({
      kind: "page",
      text: ja
        ? "スクリーンショットが残っていません。見えるものについての指摘はできません。"
        : "No screenshot is stored. Visual notes cannot be made.",
    });
  }

  if (signals) {
    const classified = classifyHtmlHeadSignals(signals);
    const factText: Record<string, string> = ja
      ? {
          noindex: "noindex があります。検索に出さない指定です。",
          http_error: `HTTP ${signals.http_status ?? "—"} が記録されています。`,
          canonical_mismatch: "canonical が最終 URL と一致しません。",
          title_missing: "title が空です。",
          description_missing: "meta description が空です。",
          og_missing: "Open Graph の title / description / image がありません。",
        }
      : {
          noindex: "noindex is present. The page asks not to be indexed.",
          http_error: `HTTP ${signals.http_status ?? "—"} was recorded.`,
          canonical_mismatch: "canonical differs from the final URL.",
          title_missing: "title is empty.",
          description_missing: "meta description is empty.",
          og_missing: "Open Graph title, description, and image are missing.",
        };
    for (const id of [...classified.blockers, ...classified.gaps]) {
      const text = factText[id];
      if (text) notes.push({ kind: "page", text });
    }

    const lang = signals.html_lang?.trim().toLowerCase() ?? "";
    const region = (obs.regionValue ?? "").toUpperCase();
    if (lang && (region === "JP" || region.startsWith("JP-")) && lang.startsWith("en")) {
      notes.push({
        kind: "page",
        text: ja
          ? `html lang は ${signals.html_lang} です。指定地域は日本です。`
          : `html lang is ${signals.html_lang}. The requested region is Japan.`,
      });
    }
    if (lang && region.startsWith("US") && lang.startsWith("ja")) {
      notes.push({
        kind: "page",
        text: ja
          ? `html lang は ${signals.html_lang} です。指定地域は米国です。`
          : `html lang is ${signals.html_lang}. The requested region is the United States.`,
      });
    }
  }

  const geo = observationGeoReadout({
    requestedLabel: obs.regionLabel,
    regionValue: obs.regionValue,
    captureConditions: obs.captureConditions,
    copy: observationGeoCopyFrom(copy[locale].observationDetail),
    locale,
  });
  if (geo.distinguish && geo.detailLine) {
    notes.push({ kind: "region_time", text: geo.detailLine });
  }

  const unique = dedupeNotes(notes);
  const summary = unique.length
    ? ja
      ? `この記録から ${unique.length} 件の指摘です。Observed ではありません。`
      : `${unique.length} note(s) from this record. This is not Observed.`
    : ja
      ? "この記録から指摘できる差は見つかりませんでした。画面の読みは AI 設定後です。"
      : "No record-based notes. Visual reading needs AI configuration.";

  return {
    summary,
    notes: unique,
    source: "record",
    model: null,
    promptVersion: PAGE_AUDIT_PROMPT_VERSION,
    createdAt: new Date().toISOString(),
  };
}

export function mergeAiAuditNotes(
  record: ObservationAiAudit,
  ai: { summary: string; notes: AiAuditNote[]; model: string },
): ObservationAiAudit {
  return {
    summary: ai.summary.trim().slice(0, 500) || record.summary,
    notes: dedupeNotes([...record.notes, ...ai.notes]).slice(0, 12),
    source: "ai",
    model: ai.model,
    promptVersion: PAGE_AUDIT_PROMPT_VERSION,
    createdAt: new Date().toISOString(),
  };
}

function dedupeNotes(notes: AiAuditNote[]): AiAuditNote[] {
  const seen = new Set<string>();
  const out: AiAuditNote[] = [];
  for (const note of notes) {
    const key = `${note.kind}:${note.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(note);
  }
  return out;
}
