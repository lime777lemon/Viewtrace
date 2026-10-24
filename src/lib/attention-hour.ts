import type { Observation } from "@/lib/demo/observations";
import { observationHttpStatus } from "@/lib/observation-measurements";
import type { SessionSignalsV1 } from "@/lib/session-signals";

export const ATTENTION_HOUR_MS = 60 * 60 * 1000;

export type AttentionFailureReason =
  | "capture_failure"
  | "http_error"
  | "timed_out"
  | "resource_5xx"
  | "request_failed"
  | "execution_error"
  | "behavior_regression"
  | "behavior_missing"
  | "journey_failed";

export type AttentionObservationFact = {
  id: string;
  url: string;
  regionValue: string;
  regionLabel: string;
  capturedAt: string;
  captureStatus: "success" | "failure" | "pending";
  httpStatus: number | null;
  timedOut: boolean | null;
  ttfbMs: number | null;
  loadMs: number | null;
  dnsMs: number | null;
  tlsMs: number | null;
  resource5xx: number | null;
  requestFailed: number | null;
  /** Resource requests counted on this page load, including the document. Null when the session did not count them. */
  requestCount: number | null;
  executionErrors: string[];
};

export type AttentionAvailabilityFact = {
  capturedAt: string;
  httpStatus: number | null;
};

export type AttentionAvailability = {
  days: 7 | 30;
  up: number;
  measured: number;
  percent: number | null;
};

export type AttentionAlertFact = {
  id: string;
  at: string;
  url: string;
  regionLabel: string;
  href: string;
  reason: "behavior_regression" | "behavior_missing" | "journey_failed";
  detail: string;
};

export type AttentionFailure = {
  id: string;
  at: string;
  url: string;
  regionLabel: string;
  href: string;
  reason: AttentionFailureReason;
  detail: string;
};

export type AttentionSlow = {
  id: string;
  at: string;
  url: string;
  regionLabel: string;
  href: string;
  kind: "ttfb" | "load";
  ms: number;
  dnsMs: number | null;
  tlsMs: number | null;
};

export type AttentionGeo = {
  country: string;
  observations: number;
  failures: number;
};

export type AttentionRegion = {
  regionLabel: string;
  observations: number;
  failures: number;
  slowestMs: number | null;
  slowestKind: "ttfb" | "load" | null;
};

export type AttentionHour = {
  windowStart: string;
  windowEnd: string;
  observationCount: number;
  failureCount: number;
  measuredLatencyCount: number;
  slowest: AttentionSlow | null;
  medianTtfbMs: number | null;
  /** Requests counted during measured page loads, divided by those load seconds. */
  requestsPerSecond: number | null;
  /** Per-load request rates, oldest first. */
  requestRates: number[];
  availability7: AttentionAvailability;
  availability30: AttentionAvailability;
  /** Server CPU is not read from an opened page. */
  cpu: null;
  /** Median of the measured per-load rates when at least two loads were counted. */
  forecastRequestsPerSecond: number | null;
  failures: AttentionFailure[];
  slow: AttentionSlow[];
  regions: AttentionRegion[];
  geo: AttentionGeo[];
};

function inWindow(iso: string, startMs: number, endMs: number): boolean {
  const time = Date.parse(iso);
  return Number.isFinite(time) && time >= startMs && time <= endMs;
}

function finiteMs(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function latencyOf(fact: AttentionObservationFact): { kind: "ttfb" | "load"; ms: number } | null {
  const ttfb = finiteMs(fact.ttfbMs);
  if (ttfb != null) return { kind: "ttfb", ms: ttfb };
  const load = finiteMs(fact.loadMs);
  if (load != null) return { kind: "load", ms: load };
  return null;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function medianRate(values: number[]): number | null {
  if (values.length < 2) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(value * 10) / 10;
}

function countedRequests(session: SessionSignalsV1 | null): number | null {
  if (!session) return null;
  const resources = session.resources;
  const assets =
    resources.script +
    resources.stylesheet +
    resources.image +
    resources.font +
    resources.xhr +
    resources.fetch +
    resources.other;
  const document = session.http.status != null || session.http.loaded === true ? 1 : 0;
  return assets + document;
}

function availability(facts: AttentionAvailabilityFact[], endMs: number, days: 7 | 30): AttentionAvailability {
  const startMs = endMs - days * 24 * 60 * 60 * 1000;
  let up = 0;
  let measured = 0;
  for (const row of facts) {
    const time = Date.parse(row.capturedAt);
    if (!Number.isFinite(time) || time < startMs || time > endMs) continue;
    if (row.httpStatus == null || row.httpStatus <= 0) continue;
    measured += 1;
    if (row.httpStatus < 400) up += 1;
  }
  return {
    days,
    up,
    measured,
    percent: measured > 0 ? Math.round((up / measured) * 10000) / 100 : null,
  };
}

export function countryOfRegion(regionValue: string, regionLabel: string): string | null {
  const value = regionValue.trim().toUpperCase();
  if (value === "US" || value.startsWith("US-")) return "US";
  if (value === "JP" || value.startsWith("JP-")) return "JP";
  if (/^[A-Z]{2}$/.test(value)) return value;
  const label = regionLabel.toLowerCase();
  if (label.startsWith("us") || label.includes("united states") || label.includes("california") || label.includes("new york")) return "US";
  if (label.includes("japan") || label.includes("tokyo") || label.includes("日本") || label.includes("東京")) return "JP";
  if (label.includes("united kingdom") || label.includes("britain") || label.includes("英国")) return "GB";
  if (label.includes("germany") || label.includes("ドイツ")) return "DE";
  if (label.includes("france") || label.includes("フランス")) return "FR";
  if (label.includes("australia") || label.includes("オーストラリア")) return "AU";
  if (label.includes("canada") || label.includes("カナダ")) return "CA";
  return null;
}

function observationHref(id: string): string {
  return `/dashboard/observations/${id}`;
}

export function attentionFactFromObservation(
  obs: Observation,
  session: SessionSignalsV1 | null,
  executionErrors: string[],
): AttentionObservationFact {
  const httpFromSession = finiteMs(session?.http.status ?? null);
  return {
    id: obs.id,
    url: obs.url,
    regionValue: obs.regionValue ?? "",
    regionLabel: obs.regionLabel,
    capturedAt: obs.capturedAt,
    captureStatus: obs.status,
    httpStatus: httpFromSession ?? observationHttpStatus(obs),
    timedOut: session ? session.http.timed_out : null,
    ttfbMs: finiteMs(session?.performance.ttfb_ms),
    loadMs: finiteMs(session?.performance.load_ms),
    dnsMs: finiteMs(session?.connection?.dns_ms),
    tlsMs: finiteMs(session?.connection?.tls_ms),
    resource5xx: session ? finiteMs(session.resources.status_5xx) : null,
    requestFailed: session ? finiteMs(session.errors.request_failed) : null,
    requestCount: countedRequests(session),
    executionErrors: executionErrors.filter((item) => item.trim()).slice(0, 12),
  };
}

export function buildAttentionHour(input: {
  now: Date;
  observations: AttentionObservationFact[];
  alerts: AttentionAlertFact[];
  history?: AttentionAvailabilityFact[];
}): AttentionHour {
  const endMs = input.now.getTime();
  const startMs = endMs - ATTENTION_HOUR_MS;
  const observations = input.observations.filter((row) => inWindow(row.capturedAt, startMs, endMs));
  const alerts = input.alerts.filter((row) => inWindow(row.at, startMs, endMs));
  const failures: AttentionFailure[] = [];

  for (const row of observations) {
    const href = observationHref(row.id);
    if (row.captureStatus === "failure") {
      failures.push({
        id: `${row.id}:capture_failure`,
        at: row.capturedAt,
        url: row.url,
        regionLabel: row.regionLabel,
        href,
        reason: "capture_failure",
        detail: "",
      });
    }
    if (row.httpStatus != null && row.httpStatus >= 400) {
      failures.push({
        id: `${row.id}:http_error`,
        at: row.capturedAt,
        url: row.url,
        regionLabel: row.regionLabel,
        href,
        reason: "http_error",
        detail: `HTTP ${row.httpStatus}`,
      });
    }
    if (row.timedOut === true) {
      failures.push({
        id: `${row.id}:timed_out`,
        at: row.capturedAt,
        url: row.url,
        regionLabel: row.regionLabel,
        href,
        reason: "timed_out",
        detail: "",
      });
    }
    if (row.resource5xx != null && row.resource5xx > 0) {
      failures.push({
        id: `${row.id}:resource_5xx`,
        at: row.capturedAt,
        url: row.url,
        regionLabel: row.regionLabel,
        href,
        reason: "resource_5xx",
        detail: String(row.resource5xx),
      });
    }
    if (row.requestFailed != null && row.requestFailed > 0) {
      failures.push({
        id: `${row.id}:request_failed`,
        at: row.capturedAt,
        url: row.url,
        regionLabel: row.regionLabel,
        href,
        reason: "request_failed",
        detail: String(row.requestFailed),
      });
    }
    for (const type of row.executionErrors) {
      failures.push({
        id: `${row.id}:execution_error:${type}`,
        at: row.capturedAt,
        url: row.url,
        regionLabel: row.regionLabel,
        href,
        reason: "execution_error",
        detail: type,
      });
    }
  }

  for (const alert of alerts) {
    failures.push({
      id: alert.id,
      at: alert.at,
      url: alert.url,
      regionLabel: alert.regionLabel,
      href: alert.href,
      reason: alert.reason,
      detail: alert.detail,
    });
  }

  failures.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  const slow: AttentionSlow[] = [];
  for (const row of observations) {
    const latency = latencyOf(row);
    if (!latency) continue;
    slow.push({
      id: row.id,
      at: row.capturedAt,
      url: row.url,
      regionLabel: row.regionLabel,
      href: observationHref(row.id),
      kind: latency.kind,
      ms: latency.ms,
      dnsMs: finiteMs(row.dnsMs),
      tlsMs: finiteMs(row.tlsMs),
    });
  }
  slow.sort((a, b) => b.ms - a.ms || Date.parse(b.at) - Date.parse(a.at));

  const ttfbValues = observations.flatMap((row) => {
    const ttfb = finiteMs(row.ttfbMs);
    return ttfb == null ? [] : [ttfb];
  });

  const requestRates: number[] = [];
  let requestTotal = 0;
  let loadSeconds = 0;
  const timed = observations.slice().sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));
  for (const row of timed) {
    if (row.requestCount == null) continue;
    const ms = finiteMs(row.loadMs);
    if (ms == null || ms <= 0) continue;
    requestRates.push(row.requestCount / (ms / 1000));
    requestTotal += row.requestCount;
    loadSeconds += ms / 1000;
  }
  const history = input.history ?? [];

  const regionLabels = new Set<string>([
    ...observations.map((row) => row.regionLabel),
    ...alerts.map((row) => row.regionLabel),
  ]);
  const regionRows = [...regionLabels].map((label) => {
    let slowestMs: number | null = null;
    let slowestKind: AttentionSlow["kind"] | null = null;
    let observationCount = 0;
    for (const row of observations) {
      if (row.regionLabel !== label) continue;
      observationCount += 1;
      const latency = latencyOf(row);
      if (latency && (slowestMs == null || latency.ms > slowestMs)) {
        slowestMs = latency.ms;
        slowestKind = latency.kind;
      }
    }
    return {
      regionLabel: label,
      observations: observationCount,
      failures: failures.filter((row) => row.regionLabel === label).length,
      slowestMs,
      slowestKind,
    };
  });

  regionRows.sort((a, b) => {
    if (b.failures !== a.failures) return b.failures - a.failures;
    const aMs = a.slowestMs ?? -1;
    const bMs = b.slowestMs ?? -1;
    if (bMs !== aMs) return bMs - aMs;
    return a.regionLabel.localeCompare(b.regionLabel);
  });

  const geo = new Map<string, AttentionGeo>();
  const addGeo = (country: string | null, field: "observations" | "failures") => {
    if (!country) return;
    const row = geo.get(country) ?? { country, observations: 0, failures: 0 };
    row[field] += 1;
    geo.set(country, row);
  };
  for (const row of observations) addGeo(countryOfRegion(row.regionValue, row.regionLabel), "observations");
  for (const row of failures) {
    const match = observations.find((item) => item.regionLabel === row.regionLabel);
    addGeo(countryOfRegion(match?.regionValue ?? "", row.regionLabel), "failures");
  }
  const geoRows = [...geo.values()].sort((a, b) => b.observations - a.observations || a.country.localeCompare(b.country));

  return {
    windowStart: new Date(startMs).toISOString(),
    windowEnd: new Date(endMs).toISOString(),
    observationCount: observations.length,
    failureCount: failures.length,
    measuredLatencyCount: slow.length,
    slowest: slow[0] ?? null,
    medianTtfbMs: median(ttfbValues),
    requestsPerSecond: loadSeconds > 0 ? Math.round((requestTotal / loadSeconds) * 10) / 10 : null,
    requestRates,
    availability7: availability(history, endMs, 7),
    availability30: availability(history, endMs, 30),
    cpu: null,
    forecastRequestsPerSecond: medianRate(requestRates),
    failures,
    slow,
    regions: regionRows,
    geo: geoRows,
  };
}
