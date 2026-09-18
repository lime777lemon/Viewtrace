"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { sanitizeDashboardObservationHrefPath } from "@/lib/observation-route-id";
import { sanitizeVerifyTokenParam } from "@/lib/observation-verify-token";
import { isBlockedPreviewHost, normalizeUserUrlInput } from "@/lib/url-preview";
import { getOrCreateVerifyLoopSessionId, persistVerifyLoopAttribution } from "@/lib/verify-loop/cookies";
import { recordVerifyLoopEvent } from "@/lib/verify-loop/record";
import { buildObservationNewPathFromNormalizedUrl } from "@/lib/verify-loop/pure";

function verifyLoopErrorPath(token: string, code: "invalid"): string {
  return `/verify/${token}?loop=${code}`;
}

export async function submitVerifyOwnUrlAction(formData: FormData): Promise<void> {
  const token = sanitizeVerifyTokenParam(String(formData.get("token") ?? ""));
  if (!token) redirect("/");

  const sessionId = await getOrCreateVerifyLoopSessionId();
  await persistVerifyLoopAttribution({ verifyToken: token });

  await recordVerifyLoopEvent({
    eventType: "verify_cta_click",
    verifyToken: token,
    anonymousSessionId: sessionId,
    metadata: { via: "verify_form" },
  });

  const normalized = normalizeUserUrlInput(String(formData.get("url") ?? ""));
  if (!normalized) {
    redirect(verifyLoopErrorPath(token, "invalid"));
  }
  let host = "";
  try {
    host = new URL(normalized).hostname;
  } catch {
    redirect(verifyLoopErrorPath(token, "invalid"));
  }
  if (isBlockedPreviewHost(host)) {
    redirect(verifyLoopErrorPath(token, "invalid"));
  }

  const nextPath = buildObservationNewPathFromNormalizedUrl(normalized);
  await persistVerifyLoopAttribution({ verifyToken: token, nextPath });

  const session = await getSession();
  await recordVerifyLoopEvent({
    eventType: "url_submitted",
    verifyToken: token,
    anonymousSessionId: sessionId,
    userId: session?.userId ?? null,
    metadata: { logged_in: Boolean(session) },
  });

  if (session) {
    redirect(nextPath);
  }

  const nextEnc = encodeURIComponent(sanitizeDashboardObservationHrefPath(nextPath));
  redirect(`/login?mode=signup&next=${nextEnc}`);
}
