import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { Locale } from "@/lib/i18n";
import {
  AI_AUDIT_EVIDENCE_IDS,
  type AiAuditEvidenceId,
  type AiAuditNote,
} from "@/lib/observation-ai-audit";

const DEFAULT_MODEL_ID = "gpt-4o-mini";

function stripEnvQuotes(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "");
}

function openAiApiKey(): string | undefined {
  const fromProcess = process.env.OPENAI_API_KEY
    ? stripEnvQuotes(process.env.OPENAI_API_KEY)
    : undefined;
  return fromProcess || undefined;
}

function resolveAuditModel(): { model: ReturnType<ReturnType<typeof createOpenAI>>; label: string } | null {
  const apiKey = openAiApiKey();
  if (!apiKey) return null;
  const raw = process.env.VIEWTRACE_AI_AUDIT_MODEL?.trim() || DEFAULT_MODEL_ID;
  const id = raw.replace(/^openai\//, "");
  return { model: createOpenAI({ apiKey })(id), label: `openai/${id}` };
}

const auditSchema = z.object({
  summary: z.string().max(500),
  notes: z
    .array(
      z.object({
        kind: z.enum(["visible", "region_time", "page"]),
        text: z.string().min(1).max(400),
        impact: z.enum(["high", "medium", "low"]),
        evidence: z.enum(AI_AUDIT_EVIDENCE_IDS),
        check: z.string().min(1).max(400),
      }),
    )
    .max(12),
});

export function isAiAuditLlmConfigured(): boolean {
  if (process.env.VIEWTRACE_AI_AUDIT === "0") return false;
  return Boolean(openAiApiKey());
}

export async function tryLlmPageAudit(input: {
  facts: Record<string, unknown>;
  image?: { bytes: Uint8Array; mediaType: string };
  locale: Locale;
}): Promise<{ summary: string; notes: AiAuditNote[]; model: string } | null> {
  if (process.env.VIEWTRACE_AI_AUDIT === "0") return null;

  const resolved = resolveAuditModel();
  if (!resolved) {
    console.warn("[observation-ai-audit] OPENAI_API_KEY missing; skipped LLM");
    return null;
  }
  const { model, label } = resolved;
  const ja = input.locale === "ja";
  const system = ja
    ? [
        "あなたは ViewTrace の AI Change Audit です。今ある 1 Observation と、あれば直前 Compare だけを読む。",
        "観測事実（Observed）を名乗らない。スコア、円グラフ、Core Web Vitals、Performance / SEO 数字、要対応の優先度は出さない。",
        "見ていない下層ページやサイト全体は書かない。Page changed とは書かない。",
        "各指摘は text（What changed）/ impact（high|medium|low。点数ではない）/ evidence（allowed_evidence から1つ）/ check（確認してよいこと）を必ず付ける。",
        "画面に見えた差は kind=visible、evidence=screenshot。地域の指定と取得の差は kind=region_time、evidence=geo。",
        "requested_region の US-XX を Observed の州として書かない。observed_state があるときだけ州を書く。",
        "behavior_transitions / behavior_map_diffs があるときは、操作検証（Interaction）の差を kind=page、evidence=interaction で書く。測った遷移（Working → No rendered state change observed など）だけを書き、JavaScript が壊れている・設定ミスといった原因は証拠が無ければ書かない。",
        "summary は『何が変わったか』『どの証拠を見ればよいか』を 1〜2 文で。",
        "日本語で短く書く。",
      ].join("\n")
    : [
        "You are ViewTrace AI Change Audit. Read only this Observation and its previous Compare if present.",
        "Do not claim to be Observed. Do not invent scores, pie charts, Core Web Vitals, Performance/SEO numbers, or priority rankings.",
        "Do not mention pages that were not captured. Do not say Page changed.",
        "Each note needs text (What changed), impact (high|medium|low, not a score), evidence (one of allowed_evidence), and check (what to verify).",
        "Visible screenshot differences: kind=visible, evidence=screenshot. Requested vs observed region: kind=region_time, evidence=geo.",
        "Never copy requested US-XX into Observed. Name a state only when observed_state is present.",
        "When behavior_transitions / behavior_map_diffs are present, describe the interaction change with kind=page, evidence=interaction. State only the measured transition (e.g. Working → No rendered state change observed). Do not claim a cause such as broken JavaScript or misconfiguration without evidence.",
        "The summary says what changed and which evidence to look at, in one or two sentences.",
        "Write the summary, each note text, and each check in English.",
      ].join("\n");

  const userText = `${ja ? "記録の事実" : "Recorded facts"}:\n${JSON.stringify(input.facts)}`;

  try {
    const result = await generateText({
      model,
      output: Output.object({ schema: auditSchema }),
      system,
      messages: [
        {
          role: "user",
          content: input.image
            ? [
                { type: "text", text: userText },
                {
                  type: "image",
                  image: input.image.bytes,
                  mediaType: input.image.mediaType,
                },
              ]
            : userText,
        },
      ],
    });
    const output = result.output;
    if (!output) return null;
    return {
      summary: output.summary,
      notes: output.notes,
      model: label,
    };
  } catch (error) {
    console.warn(
      "[observation-ai-audit] llm failed",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

const questionSchema = z.object({
  answer: z.string().min(1).max(700),
  evidence: z.array(z.enum(AI_AUDIT_EVIDENCE_IDS)).max(4),
});

/**
 * 1件の記録への質問。画像は送らない。事実に無いことは「記録に無い」と返す。
 */
export async function askRecordEvidence(input: {
  facts: Record<string, unknown>;
  question: string;
  locale: Locale;
}): Promise<{ answer: string; evidence: AiAuditEvidenceId[]; model: string } | null> {
  if (process.env.VIEWTRACE_AI_AUDIT === "0") return null;
  const resolved = resolveAuditModel();
  if (!resolved) return null;
  const { model, label } = resolved;
  const ja = input.locale === "ja";
  const system = ja
    ? [
        "あなたは ViewTrace の提出用の読みです。渡された1件の記録だけを読む。再計測しない。",
        "観測事実を名乗らない。回答の先頭は『推定:』にする。",
        "Page changed とは書かない。スコア、円グラフ、Core Web Vitals、Performance / SEO の数字は出さない。",
        "スクリーンショットは Same / Changed / Not comparable のどれかだけ。Changed は screenshot content differs の意味に限る。",
        "操作は渡された previous → current だけを書く。原因（JavaScript が壊れている等）は証拠が無ければ書かない。",
        "requested_region の US-XX を観測した州として書かない。",
        "質問の答えが記録に無ければ、記録に無いと書く。",
        "evidence には答えの根拠にした id だけを入れる。",
      ].join("\n")
    : [
        "You read one ViewTrace record for a client handoff. Do not recapture.",
        "Do not claim to be Observed. Start the answer with 'Inference:'.",
        "Do not say Page changed. Do not invent scores, charts, Core Web Vitals, or Performance/SEO numbers.",
        "Screenshot status is only Same, Changed, or Not comparable. Changed means screenshot content differs.",
        "For behavior, repeat only the given previous → current. Do not invent a cause.",
        "Do not treat a requested US-XX code as an observed state.",
        "If the record does not contain the answer, say it is not in the record.",
        "evidence lists only the ids that support the answer.",
      ].join("\n");

  try {
    const result = await generateText({
      model,
      output: Output.object({ schema: questionSchema }),
      system,
      messages: [
        {
          role: "user",
          content: `${ja ? "記録" : "Record"}:\n${JSON.stringify(input.facts)}\n\n${ja ? "質問" : "Question"}:\n${input.question}`,
        },
      ],
    });
    const output = result.output;
    if (!output) return null;
    return { answer: output.answer, evidence: output.evidence, model: label };
  } catch (error) {
    console.warn("[evidence-agent] llm failed", error instanceof Error ? error.message : error);
    return null;
  }
}
