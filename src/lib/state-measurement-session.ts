import { BROWSER_LIKE_USER_AGENT } from "@/lib/browser-fingerprint";
import { exitMatchesRequestedState } from "@/lib/browserless-state-session";
import { resolveGeoProxyUrl } from "@/lib/geo/proxy";
import { parseLabCwvFromStateSession } from "@/lib/observation-lab-cwv";
import type { LabCwvV1 } from "@/lib/observation-lab-cwv";
import { resolveBrowserlessResidentialTarget } from "@/lib/regions";
import { buildStateSessionFunction, type StateMeasure } from "@/lib/state-session-function";
import {
  decodoProxyConfigured,
  getStateProxy,
  newStateProxySessionId,
  STATE_PROXY_ATTEMPTS,
  type StateProxySelection,
} from "@/lib/state-proxy-provider";
import { isBlockedPreviewHost, normalizeUserUrlInput } from "@/lib/url-preview";
import {
  ATTR,
  browserlessResultAttrs,
  markSpanResult,
  setSpanAttrs,
  urlHostAttr,
  withSpan,
} from "@/lib/otel/trace";

export type { StateMeasure };

export type StateSessionProvider = "decodo" | "browserless_residential" | "external_proxy";

export type StateMeasurementResult = {
  ok: boolean;
  error?: string;
  upstreamStatus?: number;
  stateVerified: boolean;
  stateTargetingRejected: boolean;
  fallbackLevel: "state" | "country" | null;
  geoAttempts: number;
  observedCountry: string | null;
  observedState: string | null;
  verifiedMeasurements: StateMeasure[];
  provider: StateSessionProvider | null;
  viaResidential: boolean;
  viaExternalProxy: boolean;
  durationMs: number;
  proxyBytes: number | null;
  png: ArrayBuffer | null;
  interaction: unknown | null;
  journey: unknown | null;
  labCwv: LabCwvV1 | null;
};

export function stateExternalProxyUrl(region: string): string | null {
  const template = process.env.VIEWTRACE_GEO_PROXY_URL_TEMPLATE?.trim() ?? "";
  if (!/\{(state|stateTag|region)\}/.test(template)) return null;
  return resolveGeoProxyUrl(region);
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

function timeoutFor(measures: StateMeasure[]): number {
  if (measures.includes("journey")) return 280_000;
  if (measures.includes("interaction")) return 170_000;
  return 70_000;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const data = record.data;
  if (data && typeof data === "object") return data as Record<string, unknown>;
  return record;
}

function emptyResult(patch: Partial<StateMeasurementResult>): StateMeasurementResult {
  return {
    ok: false,
    stateVerified: false,
    stateTargetingRejected: false,
    fallbackLevel: null,
    geoAttempts: 0,
    observedCountry: null,
    observedState: null,
    verifiedMeasurements: [],
    provider: null,
    viaResidential: false,
    viaExternalProxy: false,
    durationMs: 0,
    proxyBytes: null,
    png: null,
    interaction: null,
    journey: null,
    labCwv: null,
    ...patch,
  };
}

function pngFromBase64(value: unknown): ArrayBuffer | null {
  if (typeof value !== "string" || value.length < 8) return null;
  const bytes = Buffer.from(value, "base64");
  if (bytes.byteLength < 8) return null;
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function measuresOf(value: unknown): StateMeasure[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is StateMeasure =>
    item === "screenshot" || item === "interaction" || item === "journey" || item === "lab_cwv",
  );
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function runStateMeasurementSession(input: {
  url: string;
  region: string;
  fullPage?: boolean;
  viewport?: { width: number; height: number };
  measures: StateMeasure[];
  countryFallback?: boolean;
  interaction?: Record<string, unknown>;
  journey?: Record<string, unknown>;
  fetchImpl?: typeof fetch;
}): Promise<StateMeasurementResult> {
  const target = resolveBrowserlessResidentialTarget(input.region);
  const normalized = normalizeUserUrlInput(input.url);
  const stateCode = target?.stateCode ?? null;
  const stateName = target?.state ?? null;
  if (!stateCode || !stateName || !normalized) {
    return emptyResult({ error: "invalid_region" });
  }
  try {
    if (isBlockedPreviewHost(new URL(normalized).hostname)) return emptyResult({ error: "forbidden_host" });
  } catch {
    return emptyResult({ error: "invalid_url" });
  }
  const href = functionEndpoint();
  if (!href) return emptyResult({ error: "browserless_not_configured" });
  const measures = input.measures.length > 0 ? input.measures : (["screenshot"] as StateMeasure[]);
  const code = buildStateSessionFunction(measures);
  const timeoutMs = timeoutFor(measures);
  const fetchImpl = input.fetchImpl ?? fetch;
  let geoAttempts = 0;
  let rejected = false;

  const once = (
    attempt: StateProxySelection | "template" | "country",
    requireState: boolean,
  ): Promise<StateMeasurementResult> =>
    withSpan(
      "browserless.state_session",
      {
        [ATTR.operation]: measures.join(","),
        [ATTR.urlHost]: urlHostAttr(normalized),
        [ATTR.regionRequested]: input.region,
        [ATTR.stateRequested]: stateCode,
        [ATTR.stage]: attempt === "country" ? "country" : "state",
        [ATTR.provider]:
          attempt === "template"
            ? "external_proxy"
            : attempt === "country"
              ? "browserless_residential"
              : attempt.provider,
        "viewtrace.region.require_state": requireState,
      },
      async (span) => {
        const result = await onceInner(attempt, requireState);
        setSpanAttrs(span, browserlessResultAttrs(result));
        markSpanResult(span, result);
        return result;
      },
    );

  const onceInner = async (
    attempt: StateProxySelection | "template" | "country",
    requireState: boolean,
  ): Promise<StateMeasurementResult> => {
    const endpoint = new URL(href);
    endpoint.searchParams.set("timeout", String(timeoutMs));
    const externalUrl = attempt === "template"
      ? stateExternalProxyUrl(input.region)
      : attempt === "country"
        ? null
        : attempt.externalProxyServer;
    const builtinState = attempt !== "template" && attempt !== "country" ? attempt.browserlessProxyState : null;
    if (attempt === "template" && !externalUrl) return emptyResult({ error: "state_proxy_unconfigured" });
    if (externalUrl) {
      endpoint.searchParams.set("externalProxyServer", externalUrl);
    } else {
      endpoint.searchParams.set("proxy", "residential");
      endpoint.searchParams.set("proxyCountry", "us");
      endpoint.searchParams.set("proxySticky", "true");
      if (builtinState) endpoint.searchParams.set("proxyState", builtinState);
    }
    const provider: StateSessionProvider = externalUrl
      ? (attempt !== "template" && attempt !== "country" && attempt.provider === "decodo" ? "decodo" : "external_proxy")
      : "browserless_residential";
    const started = Date.now();
    let response: Response;
    try {
      response = await fetchImpl(endpoint.href, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          code,
          context: {
            url: normalized,
            fullPage: input.fullPage !== false,
            expectedCountry: "US",
            expectedState: stateCode,
            requireState,
            userAgent: BROWSER_LIKE_USER_AGENT,
            viewport: input.viewport ?? { width: 1280, height: 800 },
            measures,
            interaction: input.interaction ?? (measures.includes("interaction") ? { url: normalized, prior: [], scan: "full" } : null),
            journey: input.journey ?? null,
          },
        }),
        signal: AbortSignal.timeout(timeoutMs + 15_000),
      });
    } catch {
      return emptyResult({ error: "browserless_network_error", durationMs: Date.now() - started });
    }
    const durationMs = Date.now() - started;
    const builtinReject = attempt !== "template" && attempt !== "country" && attempt.provider === "browserless_builtin";
    if (response.status === 400 || response.status === 401 || response.status === 407) {
      return emptyResult({
        error: builtinReject ? "state_targeting_rejected" : "browserless_error",
        upstreamStatus: response.status,
        durationMs,
        stateTargetingRejected: builtinReject,
        provider,
      });
    }
    if (!response.ok) {
      return emptyResult({ error: "browserless_error", upstreamStatus: response.status, durationMs });
    }
    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      return emptyResult({ error: "unexpected_response", durationMs });
    }
    const body = asRecord(parsed);
    const observedCountry = typeof body?.country === "string" ? body.country : null;
    const observedState = typeof body?.state === "string" ? body.state : null;
    const matched = body?.matched === true && exitMatchesRequestedState(input.region, {
      country: observedCountry,
      state: observedState,
    });
    const ran = measuresOf(body?.measurements);
    const verifiedMeasurements = matched ? ran : [];
    const labRaw = body?.lab && typeof body.lab === "object" ? body.lab as Record<string, unknown> : null;
    const labCwv = labRaw
      ? parseLabCwvFromStateSession({
          lcpMs: finiteOrNull(labRaw.lcp),
          fcpMs: finiteOrNull(labRaw.fcp),
          cls: finiteOrNull(labRaw.cls),
          tbtMs: finiteOrNull(labRaw.tbt),
          url: normalized,
          measuredAt: new Date().toISOString(),
          durationMs,
          stateVerified: matched,
          observedState: matched ? stateCode : null,
        })
      : null;
    return {
      ok: true,
      stateVerified: matched,
      stateTargetingRejected: false,
      fallbackLevel: matched ? "state" : requireState ? null : "country",
      geoAttempts: 0,
      observedCountry,
      observedState: matched ? stateCode : observedState,
      verifiedMeasurements,
      provider,
      viaResidential: !externalUrl,
      viaExternalProxy: Boolean(externalUrl),
      durationMs,
      proxyBytes: null,
      png: pngFromBase64(body?.png),
      interaction: body?.interaction ?? null,
      journey: body?.journey ?? null,
      labCwv,
    };
  };

  for (let index = 0; index < STATE_PROXY_ATTEMPTS; index += 1) {
    const selection = getStateProxy(input.region, newStateProxySessionId(), "browserless_builtin");
    if (!selection) break;
    geoAttempts += 1;
    const probe = await once(selection, true);
    if (probe.stateVerified) return { ...probe, geoAttempts };
    if (probe.stateTargetingRejected) {
      rejected = true;
      break;
    }
  }

  if (decodoProxyConfigured()) {
    rejected = false;
    for (let index = 0; index < STATE_PROXY_ATTEMPTS; index += 1) {
      const selection = getStateProxy(input.region, newStateProxySessionId(), "decodo");
      if (!selection) break;
      geoAttempts += 1;
      const probe = await once(selection, true);
      if (probe.stateVerified) return { ...probe, geoAttempts, stateTargetingRejected: false };
      if (probe.upstreamStatus === 401 || probe.upstreamStatus === 407) break;
    }
  } else if (stateExternalProxyUrl(input.region)) {
    for (let index = 0; index < STATE_PROXY_ATTEMPTS; index += 1) {
      geoAttempts += 1;
      const probe = await once("template", true);
      if (probe.stateVerified) return { ...probe, geoAttempts, stateTargetingRejected: false };
      if (probe.upstreamStatus === 400 || probe.upstreamStatus === 401) break;
    }
  } else if (!getStateProxy(input.region, "a", "browserless_builtin") && rejected === false) {
    rejected = true;
  }

  if (input.countryFallback === false) {
    return emptyResult({
      ok: true,
      error: rejected ? "state_targeting_rejected" : "state_not_confirmed",
      stateTargetingRejected: rejected,
      geoAttempts,
      fallbackLevel: null,
    });
  }

  geoAttempts += 1;
  const country = await once("country", false);
  return {
    ...country,
    geoAttempts,
    stateTargetingRejected: rejected && !country.stateVerified,
    fallbackLevel: country.stateVerified ? "state" : country.ok ? "country" : null,
    verifiedMeasurements: country.stateVerified ? country.verifiedMeasurements : [],
  };
}
