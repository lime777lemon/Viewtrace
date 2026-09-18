import { cookies, headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { sanitizeVerifyTokenParam } from "@/lib/observation-verify-token";
import {
  VERIFY_LOOP_COOKIE_MAX_AGE_SEC,
  VERIFY_LOOP_NEXT_COOKIE,
  VERIFY_LOOP_SESSION_COOKIE,
  VERIFY_LOOP_TOKEN_COOKIE,
} from "@/lib/verify-loop/constants";
import { isVerifyLoopNextPath } from "@/lib/verify-loop/pure";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function cookieOptions() {
  const h = await headers();
  const hostname = (h.get("host") ?? "").split(":")[0] ?? "";
  const isHttps = process.env.NODE_ENV === "production" || h.get("x-forwarded-proto") === "https";
  const base = {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax" as const,
    path: "/",
    maxAge: VERIFY_LOOP_COOKIE_MAX_AGE_SEC,
  };
  if (hostname === "viewtrace.net" || hostname.endsWith(".viewtrace.net")) {
    return { ...base, domain: ".viewtrace.net" };
  }
  return base;
}

export async function getOrCreateVerifyLoopSessionId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(VERIFY_LOOP_SESSION_COOKIE)?.value?.trim() ?? "";
  if (UUID_RE.test(existing)) return existing.toLowerCase();
  const id = randomUUID();
  store.set(VERIFY_LOOP_SESSION_COOKIE, id, await cookieOptions());
  return id;
}

export async function readVerifyLoopSessionId(): Promise<string | null> {
  const store = await cookies();
  const existing = store.get(VERIFY_LOOP_SESSION_COOKIE)?.value?.trim() ?? "";
  if (UUID_RE.test(existing)) return existing.toLowerCase();
  return null;
}

export async function persistVerifyLoopAttribution(params: {
  verifyToken: string;
  nextPath?: string;
}): Promise<void> {
  const token = sanitizeVerifyTokenParam(params.verifyToken);
  if (!token) return;
  const store = await cookies();
  const opts = await cookieOptions();
  store.set(VERIFY_LOOP_TOKEN_COOKIE, token, opts);
  if (params.nextPath && isVerifyLoopNextPath(params.nextPath)) {
    store.set(VERIFY_LOOP_NEXT_COOKIE, params.nextPath, opts);
  }
}

export async function readVerifyLoopAttribution(): Promise<{
  verifyToken: string | null;
  nextPath: string | null;
}> {
  const store = await cookies();
  const token = sanitizeVerifyTokenParam(store.get(VERIFY_LOOP_TOKEN_COOKIE)?.value ?? "");
  const nextRaw = store.get(VERIFY_LOOP_NEXT_COOKIE)?.value?.trim() ?? "";
  const nextPath = isVerifyLoopNextPath(nextRaw) ? nextRaw : null;
  return { verifyToken: token, nextPath };
}
