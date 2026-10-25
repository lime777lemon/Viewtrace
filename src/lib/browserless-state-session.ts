import { createHash } from "node:crypto";
import { BROWSER_LIKE_USER_AGENT } from "@/lib/browser-fingerprint";
import { resolveBrowserlessResidentialTarget } from "@/lib/regions";
import { isBlockedPreviewHost, normalizeUserUrlInput } from "@/lib/url-preview";

export const STATE_PROBE_LIMIT = 3;

export type ExitGeo = {
  country: string | null;
  state: string | null;
};

/** Requested US-CA matches an exit only when both country and state were read. */
export function exitMatchesRequestedState(regionValue: string, exit: ExitGeo): boolean {
  const target = resolveBrowserlessResidentialTarget(regionValue);
  if (!target?.stateCode || !exit.country || !exit.state) return false;
  return exit.country.trim().toUpperCase() === "US" && exit.state.trim().toUpperCase() === target.stateCode;
}

export function hashExitIp(ip: string | null | undefined): string | null {
  const value = ip?.trim();
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex");
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** After a country fallback: +1 day, +2 days, +4 days, then the Sunday of that JST week. */
export function nextStateRetryAt(now: Date, weeklyRetriesDone: number): Date | null {
  if (weeklyRetriesDone >= 4) return null;
  if (weeklyRetriesDone <= 0) return new Date(now.getTime() + DAY_MS);
  if (weeklyRetriesDone === 1) return new Date(now.getTime() + 2 * DAY_MS);
  if (weeklyRetriesDone === 2) return new Date(now.getTime() + 4 * DAY_MS);
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const daysUntilSunday = (7 - jst.getUTCDay()) % 7;
  const sundayUtc = Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() + daysUntilSunday, 15, 0, 0);
  const sunday = new Date(sundayUtc - 9 * 60 * 60 * 1000);
  return sunday.getTime() > now.getTime() ? sunday : null;
}

export type StateProbeResult =
  | {
      ok: true;
      matched: true;
      png: ArrayBuffer;
      observedCountry: string;
      observedState: string;
      exitIpHash: string | null;
      durationMs: number;
      proxyBytes: number | null;
    }
  | {
      ok: true;
      matched: false;
      observedCountry: string | null;
      observedState: string | null;
      exitIpHash: string | null;
      durationMs: number;
      proxyBytes: number | null;
      upstreamStatus: number | null;
    }
  | { ok: false; error: string; upstreamStatus?: number; durationMs: number; proxyBytes: number | null };

function stateFunctionCode(): string {
  return `export default async function({ page, context }) {
  const expectedCountry = String(context && context.expectedCountry ? context.expectedCountry : "").toUpperCase();
  const expectedState = String(context && context.expectedState ? context.expectedState : "").toUpperCase();
  let payload = {};
  try {
    payload = await page.evaluate(async () => {
      const response = await fetch("https://ipwho.is/");
      return await response.json();
    });
  } catch (error) {
    payload = {};
  }
  const country = String(payload && payload.country_code ? payload.country_code : "").toUpperCase();
  const state = String(payload && payload.region_code ? payload.region_code : "").toUpperCase();
  const ip = payload && typeof payload.ip === "string" ? payload.ip : "";
  const matched = Boolean(expectedCountry && expectedState && country === expectedCountry && state === expectedState);
  if (!matched) return { matched: false, country: country || null, state: state || null, ip };
  const viewport = context && context.viewport ? context.viewport : { width: 1280, height: 800 };
  await page.setViewport({ width: Number(viewport.width) || 1280, height: Number(viewport.height) || 800 });
  if (context && context.userAgent) await page.setUserAgent(String(context.userAgent));
  await page.goto(String(context.url), { waitUntil: "networkidle2", timeout: 30000 });
  const png = await page.screenshot({ fullPage: Boolean(context.fullPage), type: "png" });
  return { matched: true, country, state, ip, png: Buffer.from(png).toString("base64") };
}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const data = record.data;
  if (data && typeof data === "object") return data as Record<string, unknown>;
  return record;
}

function functionEndpoint(): string | null {
  const token = process.env.BROWSERLESS_TOKEN?.trim();
  if (!token) return null;
  try {
    const parsed = new URL(process.env.BROWSERLESS_SCREENSHOT_URL?.trim() || "https://production-sfo.browserless.io/screenshot");
    parsed.pathname = "/function";
    parsed.searchParams.set("token", token);
    return parsed.href;
  } catch {
    return null;
  }
}

export async function runStateVerifiedScreenshot(input: {
  url: string;
  region: string;
  fullPage: boolean;
  viewport?: { width: number; height: number };
  fetchImpl?: typeof fetch;
}): Promise<StateProbeResult> {
  const target = resolveBrowserlessResidentialTarget(input.region);
  const normalized = normalizeUserUrlInput(input.url);
  if (!target?.stateCode || !target.state || !normalized) {
    return { ok: false, error: "invalid_region", durationMs: 0, proxyBytes: null };
  }
  try {
    const host = new URL(normalized).hostname;
    if (isBlockedPreviewHost(host)) {
      return { ok: false, error: "forbidden_host", durationMs: 0, proxyBytes: null };
    }
  } catch {
    return { ok: false, error: "invalid_url", durationMs: 0, proxyBytes: null };
  }
  const href = functionEndpoint();
  if (!href) return { ok: false, error: "browserless_not_configured", durationMs: 0, proxyBytes: null };
  const endpoint = new URL(href);
  endpoint.searchParams.set("proxy", "residential");
  endpoint.searchParams.set("proxyCountry", "us");
  endpoint.searchParams.set("proxyState", target.state);
  endpoint.searchParams.set("proxySticky", "true");
  endpoint.searchParams.set("timeout", "55000");
  const started = Date.now();
  const fetchImpl = input.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(endpoint.href, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        code: stateFunctionCode(),
        context: {
          url: normalized,
          fullPage: input.fullPage,
          expectedCountry: "US",
          expectedState: target.stateCode,
          userAgent: BROWSER_LIKE_USER_AGENT,
          viewport: input.viewport ?? { width: 1280, height: 800 },
        },
      }),
      signal: AbortSignal.timeout(70_000),
    });
  } catch {
    return { ok: false, error: "browserless_network_error", durationMs: Date.now() - started, proxyBytes: null };
  }
  const durationMs = Date.now() - started;
  if (response.status === 400 || response.status === 401) {
    return {
      ok: false,
      error: "state_targeting_rejected",
      upstreamStatus: response.status,
      durationMs,
      proxyBytes: null,
    };
  }
  if (!response.ok) {
    return { ok: false, error: "browserless_error", upstreamStatus: response.status, durationMs, proxyBytes: null };
  }
  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    return { ok: false, error: "unexpected_response", durationMs, proxyBytes: null };
  }
  const body = asRecord(parsed);
  const matched = body?.matched === true;
  const observedCountry = typeof body?.country === "string" ? body.country : null;
  const observedState = typeof body?.state === "string" ? body.state : null;
  const exitIpHash = hashExitIp(typeof body?.ip === "string" ? body.ip : null);
  if (!matched) {
    return {
      ok: true,
      matched: false,
      observedCountry,
      observedState,
      exitIpHash,
      durationMs,
      proxyBytes: null,
      upstreamStatus: null,
    };
  }
  const pngB64 = typeof body?.png === "string" ? body.png : "";
  if (!pngB64) return { ok: false, error: "screenshot_missing", durationMs, proxyBytes: null };
  const bytes = Buffer.from(pngB64, "base64");
  return {
    ok: true,
    matched: true,
    png: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    observedCountry: observedCountry || "US",
    observedState: observedState || target.stateCode,
    exitIpHash,
    durationMs,
    proxyBytes: null,
  };
}

