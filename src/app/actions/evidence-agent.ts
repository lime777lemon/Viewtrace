"use server";

import { appendAuditEvent } from "@/lib/audit-log";
import { getSession } from "@/lib/auth/session";
import {
  EVIDENCE_AGENT_QUESTION_ACTION,
  EVIDENCE_AGENT_QUESTION_MONTHLY,
  evidenceAgentRecordFallback,
  evidenceHandoffForPair,
  evidenceHandoffRecordAnswer,
  evidenceScreenshotStatus,
} from "@/lib/evidence-agent";
import { loadInteractionChecks } from "@/lib/evidence-agent-load";
import type { Locale } from "@/lib/i18n";
import { getObservationMergedForPlan, listObservationsForUrlIdentity } from "@/lib/demo/user-observations";
import { askRecordEvidence } from "@/lib/observation-ai-audit-llm";
import { observationAuditFacts, type AiAuditEvidenceId } from "@/lib/observation-ai-audit";
import { behaviorAlertTransitions, behaviorMapAlertDiffs, buildBehaviorDiff } from "@/lib/observation-behavior-diff";
import { compareObservations, previousObservationForCompare } from "@/lib/observation-compare";
import { utcMonthStartIso } from "@/lib/observation-quota";
import { sanitizeObservationRouteId } from "@/lib/observation-route-id";
import { getPlan } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AskEvidenceAgentResult =
  | { ok: true; answer: string; evidence: AiAuditEvidenceId[]; source: "ai" | "record" }
  | { ok: false; error: "unauthorized" | "plan" | "quota" | "invalid" | "not_found" | "failed" };

async function questionsThisMonth(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<number | null> {
  const { count, error } = await supabase
    .from("audit_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", EVIDENCE_AGENT_QUESTION_ACTION)
    .gte("created_at", utcMonthStartIso(new Date()));
  if (error) return null;
  return count ?? 0;
}

export async function askEvidenceAgentAction(
  observationIdRaw: string,
  questionRaw: string,
  localeRaw: string,
): Promise<AskEvidenceAgentResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  if (getPlan(session.plan).watchChangeAuditMonthly <= 0) return { ok: false, error: "plan" };

  const observationId = sanitizeObservationRouteId(observationIdRaw);
  const question = questionRaw.trim();
  if (!observationId || question.length < 1 || question.length > 500) return { ok: false, error: "invalid" };

  const locale: Locale = localeRaw === "en" ? "en" : "ja";
  const obs = await getObservationMergedForPlan(observationId, session.plan);
  if (!obs) return { ok: false, error: "not_found" };

  const supabase = await createSupabaseServerClient();
  const used = await questionsThisMonth(supabase, session.userId);
  if (used == null || used >= EVIDENCE_AGENT_QUESTION_MONTHLY) return { ok: false, error: "quota" };

  const related = obs.url ? await listObservationsForUrlIdentity(obs.url) : [obs];
  const siblings = related.filter((row) => (row.regionValue ?? "") === (obs.regionValue ?? ""));
  const previous = previousObservationForCompare(obs, siblings);
  const checks = await loadInteractionChecks(
    supabase,
    session.userId,
    [obs.id, previous?.id ?? ""].filter(Boolean),
  );
  const handoff = previous ? evidenceHandoffForPair(obs, previous, checks) : null;
  const screenshot = previous
    ? evidenceScreenshotStatus(compareObservations(previous, obs).find((field) => field.key === "screenshot")?.verdict)
    : null;
  const currentCheck = checks.get(obs.id) ?? null;
  const previousCheck = previous ? (checks.get(previous.id) ?? null) : null;
  const diff = currentCheck && previous ? buildBehaviorDiff(previousCheck, currentCheck, previous.id) : null;
  const transitions = behaviorAlertTransitions(diff);
  const mapDiffs = behaviorMapAlertDiffs(diff);

  const facts = {
    ...observationAuditFacts(
      obs,
      previous,
      transitions.length > 0 || mapDiffs.length > 0 ? { transitions, mapDiffs } : null,
    ),
    screenshot_verdict: handoff?.screenshot ?? screenshot,
    handoff_behaviors: handoff?.behaviors ?? [],
    signal_changes: handoff?.signalChanges ?? [],
  };

  const llm = await askRecordEvidence({ facts, question, locale });
  const answer =
    llm?.answer ??
    (handoff
      ? evidenceHandoffRecordAnswer(handoff, locale)
      : evidenceAgentRecordFallback({
          url: obs.url,
          regionLabel: obs.regionLabel,
          screenshot,
          locale,
        }));
  const source = llm ? "ai" : "record";
  const evidence = llm?.evidence ?? [];

  await appendAuditEvent(supabase, {
    scope: "observation",
    action: EVIDENCE_AGENT_QUESTION_ACTION,
    observationId: obs.id,
    meta: { source, model: llm?.model ?? null, evidence },
  });

  return { ok: true, answer, evidence, source };
}
