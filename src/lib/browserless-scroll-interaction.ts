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
import {
  ATTR,
  browserlessResultAttrs,
  markSpanResult,
  requestedStateAttr,
  setSpanAttrs,
  urlHostAttr,
  withSpan,
} from "@/lib/otel/trace";

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
  scrollEngine?: "legacy";
  hoverEngine?: "legacy" | "legacy_passive" | "legacy_active";
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
          ...(params.scrollEngine === "legacy" ? { scroll_engine: "legacy" } : {}),
          ...(params.hoverEngine ? { hover_engine: params.hoverEngine } : {}),
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

type BrowserlessScrollParams = {
  url: string;
  region?: string;
  fixtureHtml?: string;
  prior?: InteractionPriorRow[];
  scan?: "full" | "light";
  environment?: { device_class?: "desktop" | "mobile" };
  /** Fixture / regression: inline scroll in browserless-interaction-function.ts */
  scrollEngine?: "legacy";
  hoverEngine?: "legacy" | "legacy_passive" | "legacy_active";
};

/**
 * Regional Interaction Check（1 Region × 1 Check session）。
 * span `browserless.interaction_check` に scan 種別・prior 件数・検出 / 実行件数を載せる。
 */
export async function runBrowserlessScrollWithProxyRetry(
  params: BrowserlessScrollParams,
): Promise<BrowserlessScrollResult> {
  return withSpan(
    "browserless.interaction_check",
    {
      [ATTR.operation]: "interaction_check",
      [ATTR.urlHost]: urlHostAttr(params.url),
      [ATTR.regionRequested]: params.region ?? null,
      [ATTR.stateRequested]: requestedStateAttr(params.region),
      "viewtrace.interaction.scan": params.scan ?? "full",
      "viewtrace.interaction.prior_count": params.prior?.length ?? 0,
      [ATTR.deviceClass]: params.environment?.device_class ?? null,
      "viewtrace.fixture": Boolean(params.fixtureHtml),
    },
    async (span) => {
      const result = await runScrollWithProxyRetryInner(params);
      setSpanAttrs(span, browserlessResultAttrs(result));
      if (result.ok) {
        const types = result.check.types;
        setSpanAttrs(span, {
          "viewtrace.interaction.detected": types.filter((row) => row.detected).length,
          "viewtrace.interaction.working": types.filter((row) => row.status === "working").length,
          "viewtrace.interaction.no_change": types.filter((row) => row.status === "no_change_observed").length,
          "viewtrace.interaction.failed": types.filter((row) => row.status === "failed").length,
          "viewtrace.interaction.blocked": types.filter((row) => row.status === "blocked_for_safety").length,
        });
      }
      markSpanResult(span, result);
      return result;
    },
  );
}

async function runScrollWithProxyRetryInner(
  params: BrowserlessScrollParams,
): Promise<BrowserlessScrollResult> {
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
