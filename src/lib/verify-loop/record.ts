import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { VerifyLoopEventType } from "@/lib/verify-loop/constants";
import {
  VERIFY_EVENT_RATE_MAX,
  VERIFY_EVENT_RATE_WINDOW_MS,
  VERIFY_VIEW_DEDUP_MS,
} from "@/lib/verify-loop/constants";
import { sanitizeVerifyEventMetadata } from "@/lib/verify-loop/pure";
import { resolveVerifyLoopSource } from "@/lib/verify-loop/source";

export type RecordVerifyLoopEventInput = {
  eventType: VerifyLoopEventType;
  verifyToken: string;
  anonymousSessionId: string;
  userId?: string | null;
  resultObservationId?: string | null;
  metadata?: Record<string, unknown>;
  /** When true, skip 24h view dedupe (other types still rate-limited). */
  skipViewDedup?: boolean;
};

export type RecordVerifyLoopEventResult =
  | { ok: true; recorded: boolean; reason?: "deduped" | "rate_limited" }
  | { ok: false; error: string };

export async function recordVerifyLoopEvent(
  input: RecordVerifyLoopEventInput,
): Promise<RecordVerifyLoopEventResult> {
  const source = await resolveVerifyLoopSource(input.verifyToken);
  if (!source) return { ok: false, error: "invalid_token" };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "admin_missing" };

  const sessionId = input.anonymousSessionId.toLowerCase();
  const nowIso = new Date().toISOString();

  if (input.eventType === "verify_view" && !input.skipViewDedup) {
    const since = new Date(Date.now() - VERIFY_VIEW_DEDUP_MS).toISOString();
    const { count, error } = await admin
      .from("verify_events")
      .select("id", { count: "exact", head: true })
      .eq("anonymous_session_id", sessionId)
      .eq("verify_token", source.verifyToken)
      .eq("event_type", "verify_view")
      .gte("created_at", since);
    if (!error && (count ?? 0) > 0) {
      return { ok: true, recorded: false, reason: "deduped" };
    }
  }

  const windowStart = new Date(Date.now() - VERIFY_EVENT_RATE_WINDOW_MS).toISOString();
  const { count: rateCount, error: rateErr } = await admin
    .from("verify_events")
    .select("id", { count: "exact", head: true })
    .eq("anonymous_session_id", sessionId)
    .gte("created_at", windowStart);
  if (!rateErr && (rateCount ?? 0) >= VERIFY_EVENT_RATE_MAX) {
    return { ok: true, recorded: false, reason: "rate_limited" };
  }

  if (input.eventType === "verify_view") {
    const { count: tokenViewCount, error: tokenViewErr } = await admin
      .from("verify_events")
      .select("id", { count: "exact", head: true })
      .eq("verify_token", source.verifyToken)
      .eq("event_type", "verify_view")
      .gte("created_at", windowStart);
    if (!tokenViewErr && (tokenViewCount ?? 0) >= 120) {
      return { ok: true, recorded: false, reason: "rate_limited" };
    }
  }

  const metadata = sanitizeVerifyEventMetadata(input.metadata);
  const { error: insErr } = await admin.from("verify_events").insert({
    created_at: nowIso,
    event_type: input.eventType,
    verify_token: source.verifyToken,
    source_observation_id: source.observationId,
    anonymous_session_id: sessionId,
    user_id: input.userId ?? null,
    source_user_id: source.sourceUserId,
    result_observation_id: input.resultObservationId ?? null,
    metadata,
  });

  if (insErr) {
    console.error("[verify-loop] insert failed", insErr.message, insErr.code, insErr.details, insErr.hint);
    return { ok: false, error: "insert_failed" };
  }
  return { ok: true, recorded: true };
}

/** Attach User B to earlier anonymous events for this session + token. */
export async function attachUserToVerifyLoopSession(params: {
  anonymousSessionId: string;
  userId: string;
  verifyToken: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  if (!admin) return;
  const source = await resolveVerifyLoopSource(params.verifyToken);
  if (!source) return;

  await admin
    .from("verify_events")
    .update({ user_id: params.userId })
    .eq("anonymous_session_id", params.anonymousSessionId.toLowerCase())
    .eq("verify_token", source.verifyToken)
    .is("user_id", null);
}

export async function hasVerifyLoopEventSince(params: {
  anonymousSessionId: string;
  verifyToken: string;
  eventType: VerifyLoopEventType;
  windowMs: number;
}): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  if (!admin) return false;
  const token = params.verifyToken.toLowerCase();
  const since = new Date(Date.now() - params.windowMs).toISOString();
  const { count, error } = await admin
    .from("verify_events")
    .select("id", { count: "exact", head: true })
    .eq("anonymous_session_id", params.anonymousSessionId.toLowerCase())
    .eq("verify_token", token)
    .eq("event_type", params.eventType)
    .gte("created_at", since);
  if (error) return false;
  return (count ?? 0) > 0;
}
