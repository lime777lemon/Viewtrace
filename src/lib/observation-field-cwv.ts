/** Chrome ユーザーのフィールド CWV（CrUX）。ラボ Lighthouse ではない。Observed ではない。 */

import {
  labCwvRatingCls,
  labCwvRatingMs,
  type LabCwvRating,
} from "@/lib/observation-lab-cwv";

export const FIELD_CWV_SCHEMA_VERSION = 1 as const;
export const FIELD_CWV_SOURCE = "chrome_ux_report" as const;

export type FieldCwvScope = "url" | "origin";

export type FieldCwvV1 = {
  schema_version: typeof FIELD_CWV_SCHEMA_VERSION;
  source: typeof FIELD_CWV_SOURCE;
  measured_at: string;
  requested_url: string;
  origin: string;
  /** CrUX が返したキー。URL 単位ならその URL、Origin 単位なら origin。 */
  crux_key: string;
  scope: FieldCwvScope | null;
  /** CrUX p75。ミリ秒。 */
  inp_ms: number | null;
  lcp_ms: number | null;
  cls: number | null;
  collection_first: string | null;
  collection_last: string | null;
  error: "no_data" | "failed" | null;
};

export function fieldCwvRatings(row: Pick<FieldCwvV1, "inp_ms" | "lcp_ms" | "cls">): {
  inp: LabCwvRating | null;
  lcp: LabCwvRating | null;
  cls: LabCwvRating | null;
} {
  return {
    inp: labCwvRatingMs(row.inp_ms, 200, 500),
    lcp: labCwvRatingMs(row.lcp_ms, 2500, 4000),
    cls: labCwvRatingCls(row.cls),
  };
}

export function originFromUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.origin;
  } catch {
    return null;
  }
}

function uniqueUrls(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

/** URL 単位の CrUX 照会。末尾スラッシュの有無は別キーになり得る。 */
export function cruxUrlQueryCandidates(pageUrl: string): string[] {
  const extra: string[] = [];
  try {
    const u = new URL(pageUrl);
    if (u.pathname === "/" && !u.search && !u.hash) {
      extra.push(u.origin, `${u.origin}/`);
    }
  } catch {
    /* keep original */
  }
  return uniqueUrls([pageUrl, ...extra]);
}

/** Origin 単位。www の有無は別オリジン。API はリダイレクトを追わない。 */
export function cruxOriginQueryCandidates(origin: string): string[] {
  const extra: string[] = [];
  try {
    const u = new URL(origin);
    if (u.hostname.startsWith("www.")) {
      u.hostname = u.hostname.slice(4);
      extra.push(u.origin);
    } else if (u.hostname.includes(".")) {
      u.hostname = `www.${u.hostname}`;
      extra.push(u.origin);
    }
  } catch {
    /* keep original */
  }
  return uniqueUrls([origin, ...extra]);
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function cruxDate(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as { year?: unknown; month?: unknown; day?: unknown };
  const y = o.year;
  const m = o.month;
  const d = o.day;
  if (typeof y !== "number" || typeof m !== "number" || typeof d !== "number") return null;
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function p75Ms(metric: unknown): number | null {
  if (!metric || typeof metric !== "object") return null;
  const p = (metric as { percentiles?: { p75?: unknown } }).percentiles?.p75;
  const n = typeof p === "number" ? p : typeof p === "string" ? Number(p) : NaN;
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function p75Cls(metric: unknown): number | null {
  if (!metric || typeof metric !== "object") return null;
  const p = (metric as { percentiles?: { p75?: unknown } }).percentiles?.p75;
  const n = typeof p === "number" ? p : typeof p === "string" ? Number(p) : NaN;
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 1000) / 1000;
}

export function parseCruxRecord(
  raw: unknown,
  input: { requestedUrl: string; origin: string; measuredAt: string; fallbackScope: FieldCwvScope },
): FieldCwvV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Record<string, unknown>;
  const record =
    root.record && typeof root.record === "object"
      ? (root.record as Record<string, unknown>)
      : root;
  const metrics = record.metrics && typeof record.metrics === "object"
    ? (record.metrics as Record<string, unknown>)
    : {};
  const key = record.key && typeof record.key === "object" ? (record.key as Record<string, unknown>) : {};
  const period =
    record.collectionPeriod && typeof record.collectionPeriod === "object"
      ? (record.collectionPeriod as Record<string, unknown>)
      : {};
  const keyUrl = typeof key.url === "string" ? key.url : null;
  const keyOrigin = typeof key.origin === "string" ? key.origin : null;
  const scope: FieldCwvScope = keyUrl ? "url" : keyOrigin ? "origin" : input.fallbackScope;
  const cruxKey = keyUrl ?? keyOrigin ?? (scope === "url" ? input.requestedUrl : input.origin);
  const inp = p75Ms(metrics.interaction_to_next_paint);
  const lcp = p75Ms(metrics.largest_contentful_paint);
  const cls = p75Cls(metrics.cumulative_layout_shift);
  const hasAny = inp != null || lcp != null || cls != null;
  return {
    schema_version: FIELD_CWV_SCHEMA_VERSION,
    source: FIELD_CWV_SOURCE,
    measured_at: input.measuredAt,
    requested_url: input.requestedUrl,
    origin: input.origin,
    crux_key: cruxKey,
    scope,
    inp_ms: inp,
    lcp_ms: lcp,
    cls,
    collection_first: cruxDate(period.firstDate),
    collection_last: cruxDate(period.lastDate),
    error: hasAny ? null : "no_data",
  };
}

export function emptyFieldCwv(input: {
  requestedUrl: string;
  origin: string;
  measuredAt: string;
  error: "no_data" | "failed";
}): FieldCwvV1 {
  return {
    schema_version: FIELD_CWV_SCHEMA_VERSION,
    source: FIELD_CWV_SOURCE,
    measured_at: input.measuredAt,
    requested_url: input.requestedUrl,
    origin: input.origin,
    crux_key: input.requestedUrl,
    scope: null,
    inp_ms: null,
    lcp_ms: null,
    cls: null,
    collection_first: null,
    collection_last: null,
    error: input.error,
  };
}

export function parseFieldCwvFromUnknown(raw: unknown): FieldCwvV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.schema_version !== FIELD_CWV_SCHEMA_VERSION) return null;
  if (o.source !== FIELD_CWV_SOURCE) return null;
  if (typeof o.measured_at !== "string" || typeof o.requested_url !== "string") return null;
  if (typeof o.origin !== "string") return null;
  const scope = o.scope === "url" || o.scope === "origin" ? o.scope : null;
  const error = o.error === "no_data" || o.error === "failed" ? o.error : null;
  return {
    schema_version: FIELD_CWV_SCHEMA_VERSION,
    source: FIELD_CWV_SOURCE,
    measured_at: o.measured_at,
    requested_url: o.requested_url,
    origin: o.origin,
    crux_key: typeof o.crux_key === "string" ? o.crux_key : o.requested_url,
    scope,
    inp_ms: finiteOrNull(o.inp_ms),
    lcp_ms: finiteOrNull(o.lcp_ms),
    cls: finiteOrNull(o.cls),
    collection_first: typeof o.collection_first === "string" ? o.collection_first : null,
    collection_last: typeof o.collection_last === "string" ? o.collection_last : null,
    error,
  };
}

export function parseFieldCwvRunTimes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is string => typeof row === "string" && row.length > 0).slice(-80);
}

export function appendFieldCwvRunTime(existing: string[], measuredAt: string): string[] {
  return [...parseFieldCwvRunTimes(existing), measuredAt].slice(-80);
}
