"use server";

import { getSession } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n";
import {
  buildRecordPageAudit,
  mergeAiAuditNotes,
  observationAuditFacts,
  type ObservationAiAudit,
} from "@/lib/observation-ai-audit";
import { loadAuditScreenshot } from "@/lib/observation-ai-audit-image";
import { tryLlmPageAudit } from "@/lib/observation-ai-audit-llm";
import { saveObservationAiAudit } from "@/lib/observation-ai-audit-store";
import { getObservationMergedForPlan } from "@/lib/demo/user-observations";
import { sanitizeObservationRouteId } from "@/lib/observation-route-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type GenerateObservationAiAuditResult =
  | { ok: true; audit: ObservationAiAudit }
  | { ok: false; error: "unauthorized" | "invalid_id" | "not_found" | "failed" };

export async function generateObservationAiAuditAction(
  observationIdRaw: string,
  localeRaw: string,
): Promise<GenerateObservationAiAuditResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const observationId = sanitizeObservationRouteId(observationIdRaw);
  if (!observationId) return { ok: false, error: "invalid_id" };

  const locale: Locale = localeRaw === "en" ? "en" : "ja";
  const obs = await getObservationMergedForPlan(observationId, session.plan);
  if (!obs) return { ok: false, error: "not_found" };

  const record = buildRecordPageAudit(obs, locale);
  const image = await loadAuditScreenshot(obs.snapshotImageUrl);
  const llm = await tryLlmPageAudit({
    facts: observationAuditFacts(obs),
    image,
    locale,
  });
  const audit = llm ? mergeAiAuditNotes(record, llm) : record;

  const supabase = await createSupabaseServerClient();
  await saveObservationAiAudit(supabase, {
    userId: session.userId,
    observationId,
    audit,
  });

  return { ok: true, audit };
}
