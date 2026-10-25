import { randomBytes } from "node:crypto";
import { resolveBrowserlessResidentialTarget } from "@/lib/regions";

/** Fresh sticky session per attempt. Three attempts, then country fallback. */
export const STATE_PROXY_ATTEMPTS = 3;

/** Long enough for screenshot + interaction, or a journey, in one Browserless session. */
export const DECODO_STICKY_MINUTES = 15;

/**
 * State exit supply.
 * 1. Browserless built-in proxyState
 * 2. Decodo residential via externalProxyServer
 * Bright Data and Oxylabs stay unselected until a later failover phase.
 */
export type StateProxyProviderId = "decodo" | "browserless_builtin" | "bright_data" | "oxylabs";

export type StateProxySelection = {
  provider: StateProxyProviderId;
  /** Browserless externalProxyServer. Null means Browserless built-in proxyState. */
  externalProxyServer: string | null;
  browserlessProxyState: string | null;
  sessionId: string;
};

export function newStateProxySessionId(): string {
  return randomBytes(8).toString("hex");
}

export function decodoProxyConfigured(): boolean {
  return Boolean(
    process.env.VIEWTRACE_DECODO_PROXY_USERNAME?.trim()
    && process.env.VIEWTRACE_DECODO_PROXY_PASSWORD?.trim(),
  );
}

/** Decodo state token. US-CA → us_california, US-NY → us_new_york. */
export function decodoStateParameter(region: string): string | null {
  const target = resolveBrowserlessResidentialTarget(region);
  if (!target?.stateCode || !target.state) return null;
  return `us_${target.state}`;
}

export function decodoStateProxyUrl(region: string, sessionId: string): string | null {
  const username = process.env.VIEWTRACE_DECODO_PROXY_USERNAME?.trim() ?? "";
  const password = process.env.VIEWTRACE_DECODO_PROXY_PASSWORD?.trim() ?? "";
  if (!username || !password) return null;
  const state = decodoStateParameter(region);
  if (!state) return null;
  if (!/^[a-z0-9]+$/.test(sessionId)) return null;
  const account = username.replace(/^user-/i, "");
  if (!/^[A-Za-z0-9._-]+$/.test(account)) return null;
  const host = process.env.VIEWTRACE_DECODO_PROXY_HOST?.trim() || "gate.decodo.com:7000";
  const base = host.includes("://") ? host : `http://${host}`;
  const user = `user-${account}-country-us-state-${state}-session-${sessionId}-sessionduration-${DECODO_STICKY_MINUTES}`;
  try {
    const endpoint = new URL(base);
    endpoint.username = user;
    endpoint.password = password;
    return endpoint.href;
  } catch {
    return null;
  }
}

function browserlessBuiltinEnabled(): boolean {
  const flag = process.env.VIEWTRACE_BROWSERLESS_PROXY_STATE?.trim().toLowerCase();
  return flag !== "0" && flag !== "false" && flag !== "off";
}

function selectDecodo(region: string, sessionId: string): StateProxySelection | null {
  const externalProxyServer = decodoStateProxyUrl(region, sessionId);
  if (!externalProxyServer) return null;
  return { provider: "decodo", externalProxyServer, browserlessProxyState: null, sessionId };
}

function selectBrowserlessBuiltin(region: string, sessionId: string): StateProxySelection | null {
  if (!browserlessBuiltinEnabled()) return null;
  const target = resolveBrowserlessResidentialTarget(region);
  if (!target?.state) return null;
  return {
    provider: "browserless_builtin",
    externalProxyServer: null,
    browserlessProxyState: target.state,
    sessionId,
  };
}

/** A new sessionId is a new sticky exit for that provider. */
export function getStateProxy(
  region: string,
  sessionId: string,
  provider: "browserless_builtin" | "decodo",
): StateProxySelection | null {
  if (provider === "decodo") return selectDecodo(region, sessionId);
  return selectBrowserlessBuiltin(region, sessionId);
}
