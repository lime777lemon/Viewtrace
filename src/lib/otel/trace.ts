import {
  SpanStatusCode,
  trace,
  type Attributes,
  type AttributeValue,
  type Span,
} from "@opentelemetry/api";

/**
 * ViewTrace 自身を観測するための OpenTelemetry helper。
 *
 * ここで作る span は「ViewTrace のシステム内部」の計測であって、顧客サイトの Observed には
 * 一切混ぜない。Observation 1 件（手動 / Watch）を 1 本の trace にして、
 * Browserless / Proxy / Interaction Check / Blob / Supabase / Resend のどこで
 * 時間と失敗が出たかを分けるのが目的。
 *
 * exporter が未登録（ローカル等）のときは `@opentelemetry/api` の no-op tracer になるので、
 * 呼び出し側は常に安全に使える。
 */

const TRACER_NAME = "viewtrace";

/** 属性キー。`viewtrace.` prefix で揃える。 */
export const ATTR = {
  source: "viewtrace.source",
  observationId: "viewtrace.observation_id",
  userId: "viewtrace.user_id",
  watchId: "viewtrace.watch_id",
  journeyId: "viewtrace.journey_id",
  urlHost: "viewtrace.url_host",
  regionRequested: "viewtrace.region.requested",
  stateRequested: "viewtrace.region.requested_state",
  stateVerified: "viewtrace.region.state_verified",
  fallbackLevel: "viewtrace.region.fallback_level",
  observedCountry: "viewtrace.region.observed_country",
  observedState: "viewtrace.region.observed_state",
  provider: "viewtrace.provider",
  operation: "viewtrace.operation",
  engine: "viewtrace.engine",
  stage: "viewtrace.stage",
  attempts: "viewtrace.attempts",
  durationMs: "viewtrace.duration_ms",
  /** null（未測定）のときは属性を付けない。0 は実測 0。 */
  proxyBytes: "viewtrace.proxy_bytes",
  ok: "viewtrace.ok",
  error: "viewtrace.error",
  upstreamStatus: "viewtrace.upstream_status",
  outcome: "viewtrace.outcome",
  homepageMode: "viewtrace.homepage_mode",
  deviceClass: "viewtrace.device_class",
  fullPage: "viewtrace.full_page",
  bytes: "viewtrace.bytes",
  count: "viewtrace.count",
} as const;

export type SpanAttrs = Record<string, AttributeValue | null | undefined>;

export function cleanAttrs(attrs: SpanAttrs | undefined): Attributes {
  const out: Attributes = {};
  if (!attrs) return out;
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "number" && !Number.isFinite(value)) continue;
    out[key] = value;
  }
  return out;
}

export function urlHostAttr(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

/** `US-CA` のような地域値から州コードだけを取り出す。州でなければ null。 */
export function requestedStateAttr(region: string | null | undefined): string | null {
  const m = /^US-([A-Z]{2})$/i.exec((region ?? "").trim());
  return m ? m[1].toUpperCase() : null;
}

export function setSpanAttrs(span: Span | null | undefined, attrs: SpanAttrs): void {
  if (!span) return;
  const clean = cleanAttrs(attrs);
  if (Object.keys(clean).length > 0) span.setAttributes(clean);
}

/** いまアクティブな span に属性を足す（なければ何もしない）。 */
export function setActiveSpanAttrs(attrs: SpanAttrs): void {
  setSpanAttrs(trace.getActiveSpan(), attrs);
}

/**
 * `{ ok: false, error }` のように例外ではなく戻り値で失敗を表す処理の結果を span に反映する。
 * 失敗コードは `viewtrace.error` に入れ、status も ERROR にする。
 */
export function markSpanResult(
  span: Span | null | undefined,
  result: { ok: boolean; error?: string | null } | null | undefined,
  extra?: SpanAttrs,
): void {
  if (!span) return;
  if (result) {
    setSpanAttrs(span, { [ATTR.ok]: result.ok, [ATTR.error]: result.ok ? null : result.error ?? "unknown" });
    if (!result.ok) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: result.error ?? "failed" });
    }
  }
  if (extra) setSpanAttrs(span, extra);
}

/**
 * 非同期処理を 1 span で包む。例外は記録して再 throw する。
 * 戻り値で失敗を表す処理は、コールバック内で `markSpanResult(span, result)` を呼ぶ。
 */
export async function withSpan<T>(
  name: string,
  attrs: SpanAttrs | undefined,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  const tracer = trace.getTracer(TRACER_NAME);
  return tracer.startActiveSpan(name, { attributes: cleanAttrs(attrs) }, async (span) => {
    try {
      return await fn(span);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw err;
    } finally {
      span.end();
    }
  });
}

/** Browserless 系の戻り値（screenshot / interaction / state session）から共通属性を作る。 */
export function browserlessResultAttrs(result: {
  ok: boolean;
  error?: string;
  upstreamStatus?: number | null;
  durationMs?: number | null;
  proxyBytes?: number | null;
  attempts?: number | null;
  geoAttempts?: number | null;
  stateVerified?: boolean;
  fallbackLevel?: "state" | "country" | null;
  proxyProvider?: string | null;
  provider?: string | null;
  viaResidential?: boolean;
  viaExternalProxy?: boolean;
  usedRetryWithoutProxy?: boolean;
  observedCountry?: string | null;
  observedState?: string | null;
}): SpanAttrs {
  return {
    [ATTR.ok]: result.ok,
    [ATTR.error]: result.ok ? null : result.error ?? "unknown",
    [ATTR.upstreamStatus]: result.upstreamStatus ?? null,
    [ATTR.durationMs]: result.durationMs ?? null,
    [ATTR.proxyBytes]: result.proxyBytes ?? null,
    [ATTR.attempts]: result.attempts ?? null,
    "viewtrace.region.geo_attempts": result.geoAttempts ?? null,
    [ATTR.stateVerified]: result.stateVerified ?? null,
    [ATTR.fallbackLevel]: result.fallbackLevel ?? null,
    [ATTR.provider]: result.proxyProvider ?? result.provider ?? null,
    "viewtrace.proxy.residential": result.viaResidential ?? null,
    "viewtrace.proxy.external": result.viaExternalProxy ?? null,
    "viewtrace.proxy.retry_without_proxy": result.usedRetryWithoutProxy ?? null,
    [ATTR.observedCountry]: result.observedCountry ?? null,
    [ATTR.observedState]: result.observedState ?? null,
  };
}
