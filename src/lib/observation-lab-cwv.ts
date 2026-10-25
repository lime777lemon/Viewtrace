/** ラボ Core Web Vitals。Lighthouse の実測。Observed のスクリーンショットではない。INP はフィールド指標なのでラボでは出ないことが多い。 */

export const LAB_CWV_SCHEMA_VERSION = 1 as const;
export const LAB_CWV_SOURCE = "browserless_lighthouse" as const;
export const LAB_CWV_SESSION_SOURCE = "state_verified_session" as const;

export type LabCwvSource = typeof LAB_CWV_SOURCE | typeof LAB_CWV_SESSION_SOURCE;

export type LabCwvRating = "good" | "needs_improvement" | "poor";

export type LabCwvV1 = {
  schema_version: typeof LAB_CWV_SCHEMA_VERSION;
  source: LabCwvSource;
  /** Set when this lab run happened in a state-checked browser session. */
  state_verified?: boolean;
  observed_state?: string | null;
  measured_at: string;
  url: string;
  /** Largest Contentful Paint（ミリ秒） */
  lcp_ms: number | null;
  /** Cumulative Layout Shift */
  cls: number | null;
  /** Total Blocking Time（ミリ秒）。ラボの INP 代替。INP そのものではない。 */
  tbt_ms: number | null;
  /** First Contentful Paint（ミリ秒） */
  fcp_ms: number | null;
  /** Interaction to Next Paint。ラボに無ければ null。 */
  inp_ms: number | null;
  duration_ms: number | null;
  proxy_bytes: number | null;
  error: string | null;
};

export function labCwvRatingMs(
  value: number | null,
  goodMax: number,
  needsMax: number,
): LabCwvRating | null {
  if (value == null || !Number.isFinite(value) || value < 0) return null;
  if (value <= goodMax) return "good";
  if (value <= needsMax) return "needs_improvement";
  return "poor";
}

export function labCwvRatingCls(value: number | null): LabCwvRating | null {
  if (value == null || !Number.isFinite(value) || value < 0) return null;
  if (value <= 0.1) return "good";
  if (value <= 0.25) return "needs_improvement";
  return "poor";
}

/** Google のラボ閾値。LCP / FCP / TBT は ms、CLS は単位なし、INP は ms。 */
export function labCwvRatings(row: Pick<LabCwvV1, "lcp_ms" | "cls" | "tbt_ms" | "fcp_ms" | "inp_ms">): {
  lcp: LabCwvRating | null;
  cls: LabCwvRating | null;
  tbt: LabCwvRating | null;
  fcp: LabCwvRating | null;
  inp: LabCwvRating | null;
} {
  return {
    lcp: labCwvRatingMs(row.lcp_ms, 2500, 4000),
    cls: labCwvRatingCls(row.cls),
    tbt: labCwvRatingMs(row.tbt_ms, 200, 600),
    fcp: labCwvRatingMs(row.fcp_ms, 1800, 3000),
    inp: labCwvRatingMs(row.inp_ms, 200, 500),
  };
}

/** 閾値バー用。scale は不良側が見える長さ。 */
export function labCwvBarPercents(
  value: number,
  goodMax: number,
  needsMax: number,
): { goodEnd: number; needsEnd: number; valueEnd: number } {
  const scale = Math.max(needsMax * 1.6, value, Number.EPSILON);
  return {
    goodEnd: Math.min(100, (goodMax / scale) * 100),
    needsEnd: Math.min(100, (needsMax / scale) * 100),
    valueEnd: Math.min(100, (value / scale) * 100),
  };
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function auditNumeric(
  audits: Record<string, unknown>,
  id: string,
): number | null {
  const row = audits[id];
  if (!row || typeof row !== "object") return null;
  return finiteOrNull((row as { numericValue?: unknown }).numericValue);
}

function lighthouseAudits(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const root = raw as Record<string, unknown>;
  const wrapped =
    root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const lhr =
    wrapped.lhr && typeof wrapped.lhr === "object"
      ? (wrapped.lhr as Record<string, unknown>)
      : wrapped;
  const audits = lhr.audits;
  if (!audits || typeof audits !== "object") return {};
  return audits as Record<string, unknown>;
}

export function parseLabCwvFromLighthouse(input: {
  raw: unknown;
  url: string;
  measuredAt: string;
  durationMs: number | null;
  proxyBytes: number | null;
}): LabCwvV1 {
  const audits = lighthouseAudits(input.raw);
  const lcp = auditNumeric(audits, "largest-contentful-paint");
  const cls = auditNumeric(audits, "cumulative-layout-shift");
  const tbt = auditNumeric(audits, "total-blocking-time");
  const fcp = auditNumeric(audits, "first-contentful-paint");
  const inp = auditNumeric(audits, "interaction-to-next-paint");
  const hasAny = [lcp, cls, tbt, fcp, inp].some((v) => v != null);
  return {
    schema_version: LAB_CWV_SCHEMA_VERSION,
    source: LAB_CWV_SOURCE,
    measured_at: input.measuredAt,
    url: input.url,
    lcp_ms: lcp != null ? Math.round(lcp) : null,
    cls: cls != null ? Math.round(cls * 1000) / 1000 : null,
    tbt_ms: tbt != null ? Math.round(tbt) : null,
    fcp_ms: fcp != null ? Math.round(fcp) : null,
    inp_ms: inp != null ? Math.round(inp) : null,
    duration_ms: input.durationMs,
    proxy_bytes: input.proxyBytes,
    error: hasAny ? null : "no_audits",
  };
}

export function parseLabCwvFromUnknown(raw: unknown): LabCwvV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.schema_version !== LAB_CWV_SCHEMA_VERSION) return null;
  if (o.source !== LAB_CWV_SOURCE && o.source !== LAB_CWV_SESSION_SOURCE) return null;
  if (typeof o.measured_at !== "string" || typeof o.url !== "string") return null;
  return {
    schema_version: LAB_CWV_SCHEMA_VERSION,
    source: o.source === LAB_CWV_SESSION_SOURCE ? LAB_CWV_SESSION_SOURCE : LAB_CWV_SOURCE,
    state_verified: o.state_verified === true,
    observed_state: typeof o.observed_state === "string" ? o.observed_state : null,
    measured_at: o.measured_at,
    url: o.url,
    lcp_ms: finiteOrNull(o.lcp_ms),
    cls: finiteOrNull(o.cls),
    tbt_ms: finiteOrNull(o.tbt_ms),
    fcp_ms: finiteOrNull(o.fcp_ms),
    inp_ms: finiteOrNull(o.inp_ms),
    duration_ms: finiteOrNull(o.duration_ms),
    proxy_bytes: finiteOrNull(o.proxy_bytes),
    error: typeof o.error === "string" ? o.error : null,
  };
}

export function parseLabCwvFromStateSession(input: {
  lcpMs: number | null;
  fcpMs: number | null;
  cls: number | null;
  tbtMs: number | null;
  url: string;
  measuredAt: string;
  durationMs: number | null;
  stateVerified: boolean;
  observedState: string | null;
}): LabCwvV1 {
  const hasAny = [input.lcpMs, input.fcpMs, input.cls, input.tbtMs].some((value) => value != null);
  return {
    schema_version: LAB_CWV_SCHEMA_VERSION,
    source: LAB_CWV_SESSION_SOURCE,
    state_verified: input.stateVerified,
    observed_state: input.observedState,
    measured_at: input.measuredAt,
    url: input.url,
    lcp_ms: input.lcpMs != null ? Math.round(input.lcpMs) : null,
    cls: input.cls != null ? Math.round(input.cls * 1000) / 1000 : null,
    tbt_ms: input.tbtMs != null ? Math.round(input.tbtMs) : null,
    fcp_ms: input.fcpMs != null ? Math.round(input.fcpMs) : null,
    inp_ms: null,
    duration_ms: input.durationMs,
    proxy_bytes: null,
    error: hasAny ? null : "no_audits",
  };
}

export function parseLabCwvRunTimes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is string => typeof row === "string" && row.length > 0).slice(-40);
}

export function appendLabCwvRunTime(existing: string[], measuredAt: string): string[] {
  return [...parseLabCwvRunTimes(existing), measuredAt].slice(-40);
}
