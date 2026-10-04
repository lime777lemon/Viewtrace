import { generateText, Output } from "ai";
import { z } from "zod";
import type { Locale } from "@/lib/i18n";
import type { AiAuditNote } from "@/lib/observation-ai-audit";

const DEFAULT_MODEL = "openai/gpt-4o-mini";

const auditSchema = z.object({
  summary: z.string().max(500),
  notes: z
    .array(
      z.object({
        kind: z.enum(["visible", "region_time", "page"]),
        text: z.string().min(1).max(400),
      }),
    )
    .max(12),
});

export function isAiAuditLlmConfigured(): boolean {
  if (process.env.VIEWTRACE_AI_AUDIT === "0") return false;
  return Boolean(
    process.env.AI_GATEWAY_API_KEY ||
      process.env.VERCEL_OIDC_TOKEN ||
      process.env.OPENAI_API_KEY,
  );
}

export async function tryLlmPageAudit(input: {
  facts: Record<string, unknown>;
  image?: { bytes: Uint8Array; mediaType: string };
  locale: Locale;
}): Promise<{ summary: string; notes: AiAuditNote[]; model: string } | null> {
  if (!isAiAuditLlmConfigured()) return null;

  const model = process.env.VIEWTRACE_AI_AUDIT_MODEL?.trim() || DEFAULT_MODEL;
  const ja = input.locale === "ja";
  const system = ja
    ? [
        "あなたは ViewTrace の監査です。今ある 1 Observation だけを読む。",
        "観測事実（Observed）を名乗らない。スコア、Core Web Vitals、Performance / SEO 数字、要対応の優先度は出さない。",
        "見ていない下層ページやサイト全体は書かない。",
        "画面に見えたことは kind=visible。指定と実際の地域の差は kind=region_time。メタや取得の指摘は kind=page。",
        "日本語で短く書く。",
      ].join("\n")
    : [
        "You are ViewTrace page audit. Read only this one Observation.",
        "Do not claim to be Observed. Do not invent scores, Core Web Vitals, Performance/SEO numbers, or priority rankings.",
        "Do not mention pages that were not captured. No site-wide crawl.",
        "Use kind=visible for what is on the screenshot, kind=region_time for requested vs observed region, kind=page for metadata/capture notes.",
        "Write short English.",
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
      model,
    };
  } catch (error) {
    console.warn(
      "[observation-ai-audit] llm failed",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
