import { getSession } from "@/lib/auth/session";
import {
  VERIFY_VIEW_DEDUP_MS,
  type VerifyLoopEventType,
} from "@/lib/verify-loop/constants";
import {
  getOrCreateVerifyLoopSessionId,
  readVerifyLoopAttribution,
  readVerifyLoopSessionId,
} from "@/lib/verify-loop/cookies";
import {
  attachUserToVerifyLoopSession,
  hasVerifyLoopEventSince,
  recordVerifyLoopEvent,
} from "@/lib/verify-loop/record";

export async function recordVerifyLoopIfAttributed(params: {
  eventType: VerifyLoopEventType;
  userId?: string | null;
  resultObservationId?: string | null;
  metadata?: Record<string, unknown>;
  dedupeWindowMs?: number;
}): Promise<void> {
  const { verifyToken } = await readVerifyLoopAttribution();
  if (!verifyToken) return;
  const sessionId = await readVerifyLoopSessionId();
  if (!sessionId) return;

  if (params.dedupeWindowMs) {
    const exists = await hasVerifyLoopEventSince({
      anonymousSessionId: sessionId,
      verifyToken,
      eventType: params.eventType,
      windowMs: params.dedupeWindowMs,
    });
    if (exists) return;
  }

  await recordVerifyLoopEvent({
    eventType: params.eventType,
    verifyToken,
    anonymousSessionId: sessionId,
    userId: params.userId,
    resultObservationId: params.resultObservationId,
    metadata: params.metadata,
  });
}

export async function completeVerifyLoopSignup(userId: string): Promise<void> {
  const { verifyToken } = await readVerifyLoopAttribution();
  if (!verifyToken) return;
  const sessionId = await getOrCreateVerifyLoopSessionId();
  const started = await hasVerifyLoopEventSince({
    anonymousSessionId: sessionId,
    verifyToken,
    eventType: "signup_started",
    windowMs: VERIFY_VIEW_DEDUP_MS,
  });
  if (!started) return;
  await attachUserToVerifyLoopSession({
    anonymousSessionId: sessionId,
    userId,
    verifyToken,
  });
  const already = await hasVerifyLoopEventSince({
    anonymousSessionId: sessionId,
    verifyToken,
    eventType: "signup_completed",
    windowMs: VERIFY_VIEW_DEDUP_MS,
  });
  if (already) return;
  await recordVerifyLoopEvent({
    eventType: "signup_completed",
    verifyToken,
    anonymousSessionId: sessionId,
    userId,
    metadata: { via: "signup" },
  });
}

export async function markVerifyLoopSignupStarted(): Promise<void> {
  await recordVerifyLoopIfAttributed({
    eventType: "signup_started",
    userId: (await getSession())?.userId ?? null,
    metadata: { via: "signup_form" },
    dedupeWindowMs: VERIFY_VIEW_DEDUP_MS,
  });
}

export async function markVerifyLoopFirstObservation(params: {
  userId: string;
  observationId: string;
}): Promise<void> {
  const { verifyToken } = await readVerifyLoopAttribution();
  if (!verifyToken) return;
  const sessionId = await getOrCreateVerifyLoopSessionId();
  const already = await hasVerifyLoopEventSince({
    anonymousSessionId: sessionId,
    verifyToken,
    eventType: "first_observation_created",
    windowMs: VERIFY_VIEW_DEDUP_MS * 30,
  });
  if (already) return;
  await attachUserToVerifyLoopSession({
    anonymousSessionId: sessionId,
    userId: params.userId,
    verifyToken,
  });
  await recordVerifyLoopEvent({
    eventType: "first_observation_created",
    verifyToken,
    anonymousSessionId: sessionId,
    userId: params.userId,
    resultObservationId: params.observationId,
    metadata: { via: "observation_insert" },
  });
}
