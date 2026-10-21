import { isBrowserlessConfigured } from "@/lib/browserless-screenshot";
import {
  applyBrowserlessGeoToUrl,
  browserlessPathEndpoint,
  withBrowserlessGeoRetry,
} from "@/lib/browserless-geo-endpoint";
import { parseMeasuredProxyBytes } from "@/lib/observation-cost-signals";
import { buildInteractionFunctionCode } from "@/lib/browserless-interaction-function";
import type { InteractionPriorRow } from "@/lib/observation-interaction-plan";
import { buildRegionalCheckFromSession, type RegionalInteractionCheckV1 } from "@/lib/observation-regional-interaction";
import { isBlockedPreviewHost, normalizeUserUrlInput } from "@/lib/url-preview";

const FUNCTION_TIMEOUT_MS = 110_000;

export type BrowserlessScrollResult =
  | { ok: true; check: RegionalInteractionCheckV1; durationMs: number; proxyBytes: number | null }
  | { ok: false; error: string; durationMs: number; proxyBytes: number | null; detail?: string };

function readProxyBytes(headers: Headers): number | null {
  const names = [
    "x-proxy-bytes",
    "x-browserless-proxy-bytes",
    "browserless-proxy-bytes",
    "x-proxy-bandwidth",
  ];
  for (const name of names) {
    const parsed = parseMeasuredProxyBytes(headers.get(name));
    if (parsed != null) return parsed;
  }
  return null;
}

export function buildScrollFunctionCode(): string {
  return buildInteractionFunctionCode();
}

async function runOnce(params: {
  url: string;
  region?: string;
  requestedRegion: string;
  disableProxy?: boolean;
  residentialState?: boolean;
  residentialCity?: boolean;
  fixtureHtml?: string;
  prior?: InteractionPriorRow[];
  scan?: "full" | "light";
  environment?: { device_class?: "desktop" | "mobile" };
}): Promise<BrowserlessScrollResult> {
  const target = normalizeUserUrlInput(params.url);
  if (!target) return { ok: false, error: "invalid_url", durationMs: 0, proxyBytes: null };
  try {
    if (!params.fixtureHtml && isBlockedPreviewHost(new URL(target).hostname)) {
      return { ok: false, error: "forbidden_host", durationMs: 0, proxyBytes: null };
    }
  } catch {
    return { ok: false, error: "invalid_url", durationMs: 0, proxyBytes: null };
  }
  const href = browserlessPathEndpoint("/function");
  if (!href) return { ok: false, error: "browserless_not_configured", durationMs: 0, proxyBytes: null };

  const geo = applyBrowserlessGeoToUrl({
    href,
    regionRaw: params.region ?? "",
    disableProxy: params.disableProxy,
    residentialState: params.residentialState,
    residentialCity: params.residentialCity,
  });
  if ("error" in geo) return { ok: false, error: geo.error, durationMs: 0, proxyBytes: null };

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FUNCTION_TIMEOUT_MS);
  const startedAt = Date.now();
  let upstream: Response;
  try {
    upstream = await fetch(geo.href, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        code: buildScrollFunctionCode(),
        context: {
          url: target,
          html: params.fixtureHtml || undefined,
          prior: params.prior ?? [],
          scan: params.scan === "light" ? "light" : "full",
          environment: {
            device_class: params.environment?.device_class === "mobile" ? "mobile" : "desktop",
          },
        },
      }),
      signal: ac.signal,
    });
  } catch {
    clearTimeout(timer);
    return {
      ok: false,
      error: "browserless_network_error",
      durationMs: Date.now() - startedAt,
      proxyBytes: null,
    };
  } finally {
    clearTimeout(timer);
  }

  const durationMs = Date.now() - startedAt;
  const proxyBytes = readProxyBytes(upstream.headers);
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return {
      ok: false,
      error: "browserless_error",
      durationMs,
      proxyBytes,
      detail: detail.slice(0, 500),
    };
  }

  let raw: unknown;
  try {
    raw = await upstream.json();
  } catch {
    return { ok: false, error: "unexpected_response", durationMs, proxyBytes };
  }

  const check = buildRegionalCheckFromSession({
    raw,
    requestedUrl: target,
    requestedRegion: params.requestedRegion,
    measuredAt: new Date().toISOString(),
    durationMs,
    proxyBytes,
  });
  return { ok: true, check, durationMs, proxyBytes };
}

export async function runBrowserlessScrollWithProxyRetry(params: {
  url: string;
  region?: string;
  fixtureHtml?: string;
  prior?: InteractionPriorRow[];
  scan?: "full" | "light";
  environment?: { device_class?: "desktop" | "mobile" };
}): Promise<BrowserlessScrollResult> {
  if (!isBrowserlessConfigured()) {
    return { ok: false, error: "browserless_not_configured", durationMs: 0, proxyBytes: null };
  }
  const requestedRegion = (params.region ?? "").trim();
  return withBrowserlessGeoRetry({
    region: params.region,
    retryable: (result) => !result.ok && result.error === "browserless_error",
    run: (opts) =>
      runOnce({
        url: params.url,
        region: params.region,
        requestedRegion,
        disableProxy: opts.disableProxy,
        residentialState: opts.residentialState,
        residentialCity: opts.residentialCity,
        fixtureHtml: params.fixtureHtml,
        prior: params.prior,
        scan: params.scan,
        environment: params.environment,
      }),
  });
}
