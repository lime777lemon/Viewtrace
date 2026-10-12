/** 合成操作テスト。Field INP ではない。Observed ではない。 */

import { labCwvRatingMs, type LabCwvRating } from "@/lib/observation-lab-cwv";

export const SYNTHETIC_INTERACTION_SCHEMA_VERSION = 1 as const;
export const SYNTHETIC_INTERACTION_SOURCE = "browserless_click" as const;
export const SYNTHETIC_MAX_CLICKS = 3 as const;

export type SyntheticInteractionKind = "nav" | "link" | "button";

export type SyntheticInteractionRowV1 = {
  label: string;
  kind: SyntheticInteractionKind;
  latency_ms: number | null;
  navigated: boolean;
  error: string | null;
};

export type SyntheticInteractionV1 = {
  schema_version: typeof SYNTHETIC_INTERACTION_SCHEMA_VERSION;
  source: typeof SYNTHETIC_INTERACTION_SOURCE;
  measured_at: string;
  requested_url: string;
  duration_ms: number | null;
  proxy_bytes: number | null;
  skipped_unsafe: number;
  interactions: SyntheticInteractionRowV1[];
  error: "no_safe_target" | "failed" | null;
};

/** 購入・送信・削除・ログアウトなどはクリックしない。関数側の正規表現と揃える。 */
export const SYNTHETIC_UNSAFE_PATTERN_SOURCE =
  "logout|log[-_ ]?out|sign[-_ ]?out|sign[-_ ]?off|delete|remove|unsubscribe|checkout|cart|buy|purchase|pay|payment|submit|donate|password|download|unsubscribe|cancel.?account|退会|ログアウト|削除|購入|買う|カート|決済|支払い|送信|登録する";

export function isUnsafeInteractionText(raw: string): boolean {
  return new RegExp(SYNTHETIC_UNSAFE_PATTERN_SOURCE, "i").test(raw);
}

export function syntheticLatencyRating(ms: number | null): LabCwvRating | null {
  return labCwvRatingMs(ms, 200, 500);
}

export function emptySyntheticInteraction(input: {
  requestedUrl: string;
  measuredAt: string;
  error: "no_safe_target" | "failed";
  durationMs?: number | null;
  proxyBytes?: number | null;
}): SyntheticInteractionV1 {
  return {
    schema_version: SYNTHETIC_INTERACTION_SCHEMA_VERSION,
    source: SYNTHETIC_INTERACTION_SOURCE,
    measured_at: input.measuredAt,
    requested_url: input.requestedUrl,
    duration_ms: input.durationMs ?? null,
    proxy_bytes: input.proxyBytes ?? null,
    skipped_unsafe: 0,
    interactions: [],
    error: input.error,
  };
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseKind(raw: unknown): SyntheticInteractionKind {
  if (raw === "nav" || raw === "link" || raw === "button") return raw;
  return "button";
}

function parseRow(raw: unknown): SyntheticInteractionRowV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const label = typeof o.label === "string" ? o.label.trim().slice(0, 80) : "";
  if (!label) return null;
  const latency = finiteOrNull(o.latency_ms);
  return {
    label,
    kind: parseKind(o.kind),
    latency_ms: latency != null && latency >= 0 ? Math.round(latency) : null,
    navigated: o.navigated === true,
    error: typeof o.error === "string" && o.error.length > 0 ? o.error.slice(0, 80) : null,
  };
}

export function parseSyntheticInteractionFromUnknown(raw: unknown): SyntheticInteractionV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.schema_version !== SYNTHETIC_INTERACTION_SCHEMA_VERSION) return null;
  if (o.source !== SYNTHETIC_INTERACTION_SOURCE) return null;
  if (typeof o.measured_at !== "string" || typeof o.requested_url !== "string") return null;
  const interactions = Array.isArray(o.interactions)
    ? o.interactions.map(parseRow).filter((row): row is SyntheticInteractionRowV1 => Boolean(row))
    : [];
  const error =
    o.error === "no_safe_target" || o.error === "failed"
      ? o.error
      : interactions.length === 0
        ? "no_safe_target"
        : null;
  return {
    schema_version: SYNTHETIC_INTERACTION_SCHEMA_VERSION,
    source: SYNTHETIC_INTERACTION_SOURCE,
    measured_at: o.measured_at,
    requested_url: o.requested_url,
    duration_ms: finiteOrNull(o.duration_ms),
    proxy_bytes: finiteOrNull(o.proxy_bytes),
    skipped_unsafe: Math.max(0, Math.round(finiteOrNull(o.skipped_unsafe) ?? 0)),
    interactions: interactions.slice(0, SYNTHETIC_MAX_CLICKS),
    error,
  };
}

export function parseSyntheticFromFunctionBody(
  raw: unknown,
  input: { requestedUrl: string; measuredAt: string; durationMs: number; proxyBytes: number | null },
): SyntheticInteractionV1 {
  const root =
    raw && typeof raw === "object" && "data" in raw
      ? (raw as { data: unknown }).data
      : raw;
  const o = root && typeof root === "object" ? (root as Record<string, unknown>) : {};
  const interactions = Array.isArray(o.interactions)
    ? o.interactions.map(parseRow).filter((row): row is SyntheticInteractionRowV1 => Boolean(row))
    : [];
  const skipped = Math.max(0, Math.round(finiteOrNull(o.skipped_unsafe) ?? 0));
  if (interactions.length === 0) {
    return {
      ...emptySyntheticInteraction({
        requestedUrl: input.requestedUrl,
        measuredAt: input.measuredAt,
        error: "no_safe_target",
        durationMs: input.durationMs,
        proxyBytes: input.proxyBytes,
      }),
      skipped_unsafe: skipped,
    };
  }
  return {
    schema_version: SYNTHETIC_INTERACTION_SCHEMA_VERSION,
    source: SYNTHETIC_INTERACTION_SOURCE,
    measured_at: input.measuredAt,
    requested_url: input.requestedUrl,
    duration_ms: input.durationMs,
    proxy_bytes: input.proxyBytes,
    skipped_unsafe: skipped,
    interactions: interactions.slice(0, SYNTHETIC_MAX_CLICKS),
    error: null,
  };
}

export function parseSyntheticRunTimes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is string => typeof row === "string" && row.length > 0).slice(-80);
}

export function appendSyntheticRunTime(existing: string[], measuredAt: string): string[] {
  return [...parseSyntheticRunTimes(existing), measuredAt].slice(-80);
}
