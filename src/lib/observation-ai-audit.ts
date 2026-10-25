import type { Observation } from "@/lib/demo/observations";
import type { Locale } from "@/lib/i18n";
import { classifyHtmlHeadSignals } from "@/lib/observation-html-signals-readout";
import { compareObservations, type ObservationCompareFieldKey } from "@/lib/observation-compare";
import { observationGeoCopyFrom, observationGeoReadout } from "@/lib/observation-geo-readout";
import {
  behaviorStatusLabel,
  behaviorTypeLabel,
  type BehaviorMapDiffV1,
  type BehaviorTransitionV1,
} from "@/lib/observation-behavior-diff";
import { copy } from "@/lib/i18n";

export const PAGE_AUDIT_PROMPT_VERSION = "page-audit-v2";
export const PAGE_AUDIT_TYPE = "page_audit";

export type AiAuditNoteKind = "visible" | "region_time" | "page";
export type AiAuditSource = "record" | "ai";
export type AiAuditImpact = "high" | "medium" | "low";
export const AI_AUDIT_EVIDENCE_IDS = [
  "screenshot",
  "detected_facts",
  "title",
  "description",
  "canonical",
  "noindex",
  "robots",
  "og",
  "http_status",
  "html_lang",
  "geo",
  "final_url",
  "interaction",
] as const;
export type AiAuditEvidenceId = (typeof AI_AUDIT_EVIDENCE_IDS)[number];

/**
 * Watch の Behavior Diff から渡す操作検証の差。Change Audit はこれを読むだけで、再計測はしない。
 * `transitions` は regression / alert_candidate のみ（unchanged は渡さない）。
 */
export type AuditBehaviorContext = {
  transitions: BehaviorTransitionV1[];
  mapDiffs: BehaviorMapDiffV1[];
};

export type AiAuditNote = {
  kind: AiAuditNoteKind;
  text: string;
  impact?: AiAuditImpact;
  evidence?: AiAuditEvidenceId;
  check?: string;
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
const IMPACTS = new Set<AiAuditImpact>(["high", "medium", "low"]);
const EVIDENCE_IDS = new Set<string>(AI_AUDIT_EVIDENCE_IDS);

export function auditEvidenceDomId(id: AiAuditEvidenceId): string {
  return `audit-evidence-${id}`;
}

export function auditEvidenceHref(id: AiAuditEvidenceId): string {
  return `#${auditEvidenceDomId(id)}`;
}

export function isStructuredFinding(note: AiAuditNote): boolean {
  return Boolean(note.impact && note.evidence && note.check);
}

export function isObservationUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
}

function parseImpact(raw: unknown): AiAuditImpact | undefined {
  return typeof raw === "string" && IMPACTS.has(raw as AiAuditImpact)
    ? (raw as AiAuditImpact)
    : undefined;
}

function parseEvidence(raw: unknown): AiAuditEvidenceId | undefined {
  return typeof raw === "string" && EVIDENCE_IDS.has(raw)
    ? (raw as AiAuditEvidenceId)
    : undefined;
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
    const checkRaw = (item as { check?: unknown }).check;
    const note: AiAuditNote = {
      kind: kind as AiAuditNoteKind,
      text: text.trim().slice(0, 400),
      impact: parseImpact((item as { impact?: unknown }).impact),
      evidence: parseEvidence((item as { evidence?: unknown }).evidence),
    };
    if (typeof checkRaw === "string" && checkRaw.trim()) {
      note.check = checkRaw.trim().slice(0, 400);
    }
    notes.push(note);
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

function compareChangedKeys(previous: Observation | null | undefined, obs: Observation): {
  screenshot: "changed" | "same" | "incomparable" | "unknown" | null;
  screenshotReason: string | null;
  fields: ObservationCompareFieldKey[];
} {
  if (!previous) {
    return { screenshot: null, screenshotReason: null, fields: [] };
  }
  const rows = compareObservations(previous, obs);
  const shot = rows.find((row) => row.key === "screenshot");
  const fields = rows
    .filter((row) => row.key !== "screenshot" && row.verdict === "changed")
    .map((row) => row.key);
  return {
    screenshot: shot?.verdict ?? null,
    screenshotReason: shot?.incomparableReason ?? null,
    fields,
  };
}

export function observationAuditFacts(
  obs: Observation,
  previous?: Observation | null,
  behavior?: AuditBehaviorContext | null,
): Record<string, unknown> {
  const signals = obs.captureConditions?.html_signals;
  const geo = obs.captureConditions?.geo;
  const compare = compareChangedKeys(previous, obs);
  const behaviorFacts = behavior
    ? {
        behavior_transitions: behavior.transitions.map((row) => ({
          interaction: behaviorTypeLabel(row.type),
          previous: behaviorStatusLabel(row.previous),
          current: behaviorStatusLabel(row.current),
          kind: row.kind,
        })),
        behavior_map_diffs: behavior.mapDiffs.map((row) => ({
          section: row.section,
          label: row.label,
          detail: row.detail,
          interaction: row.type ? behaviorTypeLabel(row.type) : null,
        })),
        behavior_note:
          "Working means a rendered/runtime state change was measured. No rendered state change observed means the trigger was executed but nothing measurable changed. It does not by itself prove JavaScript is broken.",
      }
    : {};
  return {
    ...behaviorFacts,
    web_http_status: obs.captureConditions?.web_facts?.http.status ?? null,
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
    compare_screenshot: compare.screenshot,
    compare_changed_fields: compare.fields,
    allowed_evidence: [...AI_AUDIT_EVIDENCE_IDS],
  };
}

function finding(
  kind: AiAuditNoteKind,
  text: string,
  impact: AiAuditImpact,
  evidence: AiAuditEvidenceId,
  check: string,
): AiAuditNote {
  return { kind, text, impact, evidence, check };
}

function compareFieldEvidence(key: ObservationCompareFieldKey): AiAuditEvidenceId {
  switch (key) {
    case "screenshot":
      return "screenshot";
    case "finalUrl":
      return "final_url";
    case "title":
      return "title";
    case "description":
      return "description";
    case "canonical":
      return "canonical";
    case "robots":
      return "robots";
    case "noindex":
      return "noindex";
    case "ogImage":
      return "og";
  }
}

export function buildRecordPageAudit(
  obs: Observation,
  locale: Locale,
  previous?: Observation | null,
  behavior?: AuditBehaviorContext | null,
): ObservationAiAudit {
  const ja = locale === "ja";
  const notes: AiAuditNote[] = [];
  const signals = obs.captureConditions?.html_signals;

  // 操作検証の差（Behavior Diff）。測った結果の遷移だけを書き、原因は書かない。
  for (const row of behavior?.transitions ?? []) {
    const type = behaviorTypeLabel(row.type);
    const prev = behaviorStatusLabel(row.previous);
    const curr = behaviorStatusLabel(row.current);
    notes.push(
      finding(
        "page",
        ja
          ? `${type}: 前回 ${prev} → 今回 ${curr}`
          : `${type}: ${prev} → ${curr}`,
        row.kind === "regression" ? "high" : "medium",
        "interaction",
        ja
          ? `記録の Interaction evidence で ${type} の対象要素と状態の変化を確認する。`
          : `Open the Interaction evidence on the record and check the ${type} target and its state change.`,
      ),
    );
  }
  for (const row of behavior?.mapDiffs ?? []) {
    if (row.section === "unchanged") continue;
    const head = row.section === "new" ? (ja ? "新しく検出" : "Newly detected") : row.section === "changed" ? (ja ? "検証結果が変化" : "Verification changed") : (ja ? "前回あった対象が検出されない" : "Previously present, not detected now");
    notes.push(
      finding(
        "page",
        `${head}: ${row.label}${row.detail ? ` — ${row.detail}` : ""}`,
        row.section === "changed" ? "high" : row.section === "missing" ? "medium" : "low",
        "interaction",
        ja
          ? "記録の Behavior Map で対象要素（selector）と前回の状態を確認する。"
          : "Open the Behavior Map on the record and compare the target selector with the previous state.",
      ),
    );
  }

  if (obs.status === "failure") {
    notes.push(
      finding(
        "page",
        ja
          ? "この地域では取得に失敗しています。画面の指摘はできません。"
          : "Capture failed in this region. There is no page to review.",
        "high",
        "http_status",
        ja
          ? "取得結果と HTTP ステータスを記録で確認する。"
          : "Check the capture outcome and HTTP status on the record.",
      ),
    );
  } else if (!obs.snapshotImageUrl) {
    notes.push(
      finding(
        "page",
        ja
          ? "スクリーンショットが残っていません。見えるものについての指摘はできません。"
          : "No screenshot is stored. Visual notes cannot be made.",
        "medium",
        "screenshot",
        ja
          ? "スクリーンショット欄を確認する。期限切れならメタだけが残っています。"
          : "Check the screenshot section. If retention ended, only metadata remains.",
      ),
    );
  }

  if (signals) {
    const classified = classifyHtmlHeadSignals(signals);
    const templates: Record<
      string,
      { text: string; impact: AiAuditImpact; evidence: AiAuditEvidenceId; check: string }
    > = ja
      ? {
          noindex: {
            text: "noindex があります。検索に出さない指定です。",
            impact: "high",
            evidence: "noindex",
            check: "noindex が意図した設定か、記録の robots / noindex を確認する。",
          },
          http_error: {
            text: `HTTP ${signals.http_status ?? "—"} が記録されています。`,
            impact: "high",
            evidence: "http_status",
            check: "記録の HTTP ステータスと最終 URL を確認する。",
          },
          canonical_mismatch: {
            text: "canonical が最終 URL と一致しません。",
            impact: "high",
            evidence: "canonical",
            check: "記録の canonical と最終 URL を見比べる。",
          },
          title_missing: {
            text: "title が空です。",
            impact: "high",
            evidence: "title",
            check: "記録の document title が空のままか確認する。",
          },
          description_missing: {
            text: "meta description が空です。",
            impact: "medium",
            evidence: "description",
            check: "記録の meta description を確認する。",
          },
          og_missing: {
            text: "Open Graph の title / description / image がありません。",
            impact: "medium",
            evidence: "og",
            check: "記録の Open Graph 欄を確認する。",
          },
        }
      : {
          noindex: {
            text: "noindex is present. The page asks not to be indexed.",
            impact: "high",
            evidence: "noindex",
            check: "Check robots / noindex on the record to see if this was intended.",
          },
          http_error: {
            text: `HTTP ${signals.http_status ?? "—"} was recorded.`,
            impact: "high",
            evidence: "http_status",
            check: "Check HTTP status and the final URL on the record.",
          },
          canonical_mismatch: {
            text: "canonical differs from the final URL.",
            impact: "high",
            evidence: "canonical",
            check: "Compare canonical and final URL on the record.",
          },
          title_missing: {
            text: "title is empty.",
            impact: "high",
            evidence: "title",
            check: "Check document title on the record.",
          },
          description_missing: {
            text: "meta description is empty.",
            impact: "medium",
            evidence: "description",
            check: "Check the recorded meta description.",
          },
          og_missing: {
            text: "Open Graph title, description, and image are missing.",
            impact: "medium",
            evidence: "og",
            check: "Check Open Graph fields on the record.",
          },
        };
    for (const id of [...classified.blockers, ...classified.gaps]) {
      const row = templates[id];
      if (row) notes.push(finding("page", row.text, row.impact, row.evidence, row.check));
    }

    const lang = signals.html_lang?.trim().toLowerCase() ?? "";
    const region = (obs.regionValue ?? "").toUpperCase();
    if (lang && (region === "JP" || region.startsWith("JP-")) && lang.startsWith("en")) {
      notes.push(
        finding(
          "page",
          ja
            ? `html lang は ${signals.html_lang} です。指定地域は日本です。`
            : `html lang is ${signals.html_lang}. The requested region is Japan.`,
          "medium",
          "html_lang",
          ja
            ? "記録の html lang と指定地域を見比べる。"
            : "Compare html lang with the requested region on the record.",
        ),
      );
    }
    if (lang && region.startsWith("US") && lang.startsWith("ja")) {
      notes.push(
        finding(
          "page",
          ja
            ? `html lang は ${signals.html_lang} です。指定地域は米国です。`
            : `html lang is ${signals.html_lang}. The requested region is the United States.`,
          "medium",
          "html_lang",
          ja
            ? "記録の html lang と指定地域を見比べる。"
            : "Compare html lang with the requested region on the record.",
        ),
      );
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
    notes.push(
      finding(
        "region_time",
        geo.detailLine,
        "low",
        "geo",
        ja
          ? "指定と実際の取得を記録の地域欄で確認する。Requested を Observed にコピーしない。"
          : "Check requested vs observed on the region field. Do not copy Requested into Observed.",
      ),
    );
  }

  if (previous) {
    const compare = compareChangedKeys(previous, obs);
    if (compare.screenshot === "changed") {
      notes.push(
        finding(
          "visible",
          ja
            ? "スクリーンショットの内容が違います（Changed）。何が違うかの読みは推定です。"
            : "Screenshot content differs (Changed). What differs on screen is inference.",
          "medium",
          "screenshot",
          ja
            ? "前後の画面を見比べ、ヒーロー・CTA・言語・通貨を確認する。"
            : "Compare the two screenshots and check hero, CTA, language, and currency.",
        ),
      );
    } else if (compare.screenshot === "incomparable") {
      notes.push(
        finding(
          "visible",
          ja
            ? "スクリーンショットは比べられません（撮影条件が違います）。"
            : "Screenshots are not comparable (capture conditions differ).",
          "low",
          "screenshot",
          ja
            ? "検出した事実の Not comparable 理由を確認する。"
            : "Check the Not comparable reason under Detected facts.",
        ),
      );
    }

    const fieldCopy: Record<Exclude<ObservationCompareFieldKey, "screenshot">, string> = ja
      ? {
          finalUrl: "最終 URL が違います。",
          title: "title が違います。",
          description: "meta description が違います。",
          canonical: "canonical が違います。",
          robots: "robots が違います。",
          noindex: "noindex の有無が違います。",
          ogImage: "og:image が違います。",
        }
      : {
          finalUrl: "Final URL differs.",
          title: "title differs.",
          description: "meta description differs.",
          canonical: "canonical differs.",
          robots: "robots differs.",
          noindex: "noindex presence differs.",
          ogImage: "og:image differs.",
        };
    const fieldImpact: Record<Exclude<ObservationCompareFieldKey, "screenshot">, AiAuditImpact> = {
      finalUrl: "medium",
      title: "medium",
      description: "medium",
      canonical: "high",
      robots: "medium",
      noindex: "high",
      ogImage: "medium",
    };
    const fieldCheck = ja
      ? "検出した事実の前後値を確認する。"
      : "Check previous vs this value under Detected facts.";
    for (const key of compare.fields) {
      if (key === "screenshot") continue;
      notes.push(
        finding(
          "page",
          fieldCopy[key],
          fieldImpact[key],
          compareFieldEvidence(key),
          fieldCheck,
        ),
      );
    }
  }

  const unique = dedupeNotes(notes);
  const summary = unique.length
    ? ja
      ? `この記録から ${unique.length} 件の指摘です。Observed ではありません。点数ではありません。`
      : `${unique.length} note(s) from this record. This is not Observed. Not a score.`
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

const AUDIT_PHRASES: Array<[string, string]> = [
  ["この地域では取得に失敗しています。画面の指摘はできません。", "Capture failed in this region. There is no page to review."],
  ["取得結果と HTTP ステータスを記録で確認する。", "Check the capture outcome and HTTP status on the record."],
  ["スクリーンショットが残っていません。見えるものについての指摘はできません。", "No screenshot is stored. Visual notes cannot be made."],
  ["スクリーンショット欄を確認する。期限切れならメタだけが残っています。", "Check the screenshot section. If retention ended, only metadata remains."],
  ["noindex があります。検索に出さない指定です。", "noindex is present. The page asks not to be indexed."],
  ["noindex が意図した設定か、記録の robots / noindex を確認する。", "Check robots / noindex on the record to see if this was intended."],
  ["記録の HTTP ステータスと最終 URL を確認する。", "Check HTTP status and the final URL on the record."],
  ["canonical が最終 URL と一致しません。", "canonical differs from the final URL."],
  ["記録の canonical と最終 URL を見比べる。", "Compare canonical and final URL on the record."],
  ["title が空です。", "title is empty."],
  ["記録の document title が空のままか確認する。", "Check document title on the record."],
  ["meta description が空です。", "meta description is empty."],
  ["記録の meta description を確認する。", "Check the recorded meta description."],
  ["Open Graph の title / description / image がありません。", "Open Graph title, description, and image are missing."],
  ["記録の Open Graph 欄を確認する。", "Check Open Graph fields on the record."],
  ["記録の html lang と指定地域を見比べる。", "Compare html lang with the requested region on the record."],
  ["指定と実際の取得を記録の地域欄で確認する。Requested を Observed にコピーしない。", "Check requested vs observed on the region field. Do not copy Requested into Observed."],
  ["スクリーンショットの内容が違います（Changed）。何が違うかの読みは推定です。", "Screenshot content differs (Changed). What differs on screen is inference."],
  ["前後の画面を見比べ、ヒーロー・CTA・言語・通貨を確認する。", "Compare the two screenshots and check hero, CTA, language, and currency."],
  ["スクリーンショットは比べられません（撮影条件が違います）。", "Screenshots are not comparable (capture conditions differ)."],
  ["検出した事実の Not comparable 理由を確認する。", "Check the Not comparable reason under Detected facts."],
  ["最終 URL が違います。", "Final URL differs."],
  ["title が違います。", "title differs."],
  ["meta description が違います。", "meta description differs."],
  ["canonical が違います。", "canonical differs."],
  ["robots が違います。", "robots differs."],
  ["noindex の有無が違います。", "noindex presence differs."],
  ["og:image が違います。", "og:image differs."],
  ["検出した事実の前後値を確認する。", "Check previous vs this value under Detected facts."],
  ["この記録から指摘できる差は見つかりませんでした。画面の読みは AI 設定後です。", "No record-based notes. Visual reading needs AI configuration."],
  ["ページタイトルに変更はありませんが、キャノニカルURLが異なります。", "The page title is unchanged, but the canonical URL differs."],
  ["キャノニカルURLの設定を確認すること。", "Check the canonical URL setting."],
  ["OGタイトルは以前と変わらず、ページタイトルと同じです。", "The OG title is unchanged and matches the page title."],
  ["OGタイトルの適切性を確認すること。", "Check whether the OG title is appropriate."],
];

function exactAuditPhrase(text: string, locale: Locale): string | null {
  for (const [ja, en] of AUDIT_PHRASES) {
    if (locale === "en" && text === ja) return en;
    if (locale === "ja" && text === en) return ja;
  }
  return null;
}

function hasJapanese(text: string): boolean {
  return /[\u3040-\u30ff\u4e00-\u9faf]/.test(text);
}

/** Stored audits keep the language they were written in. English view reads them in English. */
function japaneseAuditToEnglish(text: string): string {
  if (!hasJapanese(text)) return text;
  let next = text;
  next = next.replace(
    /ウェブサイトのタイトルが ("[^"]*") から ("[^"]*") に変更されておらず、/g,
    "The page title is unchanged ($1 to $2). ",
  );
  next = next.replace(
    /オリジナルと比較してコンテンツは一貫していますが、/g,
    "The content is consistent with the earlier record, but ",
  );
  next = next.replace(
    /キャノニカルURLが ("[^"]*") から ("[^"]*") に異なります。?/g,
    "the canonical URL differs from $1 to $2.",
  );
  next = next.replace(/ページタイトルに変更はありませんが、/g, "The page title is unchanged, but ");
  next = next.replace(/キャノニカルURLが異なります。?/g, "the canonical URL differs.");
  next = next.replace(/キャノニカルURLの設定を確認すること。?/g, "Check the canonical URL setting.");
  next = next.replace(/OGタイトルは以前と変わらず、/g, "The OG title is unchanged, ");
  next = next.replace(/ページタイトルと同じです。?/g, "and it matches the page title.");
  next = next.replace(/OGタイトルの適切性を確認すること。?/g, "Check whether the OG title is appropriate.");
  next = next.replace(/html lang は ([^。]+) です。指定地域は日本です。/g, "html lang is $1. The requested region is Japan.");
  next = next.replace(/html lang は ([^。]+) です。指定地域は米国です。/g, "html lang is $1. The requested region is the United States.");
  next = next.replace(/HTTP ([^。]+) が記録されています。/g, "HTTP $1 was recorded.");
  next = next.replace(
    /この記録から (\d+) 件の指摘です。Observed ではありません。点数ではありません。/g,
    "$1 note(s) from this record. This is not Observed. Not a score.",
  );
  next = next.replace(/。/g, ".").replace(/、/g, ", ").replace(/\s+/g, " ").trim();
  return hasJapanese(next) ? text : next;
}

function auditSentence(text: string, locale: Locale): string {
  return exactAuditPhrase(text, locale) ?? (locale === "en" ? japaneseAuditToEnglish(text) : text);
}

export function presentObservationAiAudit(audit: ObservationAiAudit, locale: Locale): ObservationAiAudit {
  return {
    ...audit,
    summary: auditSentence(audit.summary, locale),
    notes: audit.notes.map((note) => ({
      ...note,
      text: auditSentence(note.text, locale),
      check: note.check ? auditSentence(note.check, locale) : note.check,
    })),
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
    const key = `${note.kind}:${note.evidence ?? ""}:${note.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(note);
  }
  return out;
}
