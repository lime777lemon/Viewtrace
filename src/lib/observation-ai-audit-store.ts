import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PAGE_AUDIT_TYPE,
  isObservationUuid,
  parseObservationAiAudit,
  type ObservationAiAudit,
} from "@/lib/observation-ai-audit";

export async function loadObservationAiAudit(
  supabase: SupabaseClient,
  userId: string,
  observationId: string,
): Promise<ObservationAiAudit | null> {
  if (!isObservationUuid(observationId)) return null;
  const { data, error } = await supabase
    .from("ai_analyses")
    .select("summary,notes,source,model,prompt_version,created_at")
    .eq("user_id", userId)
    .eq("observation_id", observationId)
    .eq("analysis_type", PAGE_AUDIT_TYPE)
    .maybeSingle();

  if (error) {
    if (!isMissingTable(error)) {
      console.warn("[observation-ai-audit] load failed", error.code, error.message);
    }
    return null;
  }
  if (!data) return null;
  return parseObservationAiAudit(data);
}

export async function saveObservationAiAudit(
  supabase: SupabaseClient,
  input: {
    userId: string;
    observationId: string;
    audit: ObservationAiAudit;
  },
): Promise<boolean> {
  if (!isObservationUuid(input.observationId)) return false;
  const now = new Date().toISOString();
  const { error } = await supabase.from("ai_analyses").upsert(
    {
      user_id: input.userId,
      observation_id: input.observationId,
      analysis_type: PAGE_AUDIT_TYPE,
      status: "completed",
      source: input.audit.source,
      summary: input.audit.summary,
      notes: input.audit.notes,
      model: input.audit.model,
      prompt_version: input.audit.promptVersion,
      updated_at: now,
    },
    { onConflict: "user_id,observation_id,analysis_type" },
  );
  if (error) {
    if (!isMissingTable(error)) {
      console.warn("[observation-ai-audit] save failed", error.code, error.message);
    }
    return false;
  }
  return true;
}

function isMissingTable(error: { code?: string; message?: string }): boolean {
  return error.code === "42P01" || error.code === "PGRST205" || /ai_analyses/i.test(error.message ?? "");
}
