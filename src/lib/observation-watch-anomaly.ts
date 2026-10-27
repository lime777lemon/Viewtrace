/** Watch baseline anomaly (robust median + MAD). Not ML scores; observed metrics only. */

export const WATCH_ANOMALY_SCHEMA_VERSION = 1 as const;
export const WATCH_ANOMALY_SOURCE = "watch_baseline" as const;
export const WATCH_ANOMALY_MIN_SAMPLES = 10;
/** Modified z-score threshold (common robust outlier rule). */
export const WATCH_ANOMALY_Z_THRESHOLD = 3.5;

export type WatchAnomalyMetricId = "interaction_duration_ms" | "proxy_bytes";

export type WatchMetricSample = {
  measured_at: string;
  interaction_duration_ms: number | null;
  proxy_bytes: number | null;
};

export type WatchAnomalyMetricV1 = {
  id: WatchAnomalyMetricId;
  label: string;
  current: number;
  median: number;
  mad: number;
  z_score: number;
  anomalous: boolean;
  unit: "ms" | "bytes";
};

export type WatchAnomalyV1 = {
  schema_version: typeof WATCH_ANOMALY_SCHEMA_VERSION;
  source: typeof WATCH_ANOMALY_SOURCE;
  measured_at: string;
  baseline_samples: number;
  min_samples_required: typeof WATCH_ANOMALY_MIN_SAMPLES;
  status: "insufficient_baseline" | "no_anomaly" | "anomaly_detected";
  metrics: WatchAnomalyMetricV1[];
  /** Recent Watch runs for sparkline (includes current). */
  series: WatchMetricSample[];
};

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function mad(values: number[], med: number): number {
  if (!values.length) return 0;
  const deviations = values.map((v) => Math.abs(v - med));
  return median(deviations);
}

function modifiedZScore(value: number, med: number, madValue: number): number {
  const denom = madValue > 0 ? madValue : 1e-9;
  return (0.6745 * (value - med)) / denom;
}

function analyzeMetric(input: {
  id: WatchAnomalyMetricId;
  label: string;
  unit: "ms" | "bytes";
  current: number;
  history: number[];
}): WatchAnomalyMetricV1 {
  const med = median(input.history);
  const madValue = mad(input.history, med);
  const z = modifiedZScore(input.current, med, madValue);
  return {
    id: input.id,
    label: input.label,
    current: input.current,
    median: med,
    mad: madValue,
    z_score: Math.round(z * 100) / 100,
    anomalous: Math.abs(z) >= WATCH_ANOMALY_Z_THRESHOLD,
    unit: input.unit,
  };
}

export function computeWatchAnomaly(input: {
  measuredAt: string;
  current: WatchMetricSample;
  history: WatchMetricSample[];
  maxSeries?: number;
}): WatchAnomalyV1 {
  const maxSeries = input.maxSeries ?? 20;
  const series = [...input.history, input.current]
    .slice(-maxSeries)
    .sort((a, b) => a.measured_at.localeCompare(b.measured_at));

  const baseline = input.history.filter((row) => row.measured_at !== input.current.measured_at);
  const durationHistory = baseline
    .map((row) => finite(row.interaction_duration_ms))
    .filter((v): v is number => v != null && v > 0);
  const proxyHistory = baseline
    .map((row) => finite(row.proxy_bytes))
    .filter((v): v is number => v != null && v >= 0);

  const metrics: WatchAnomalyMetricV1[] = [];
  const currentDuration = finite(input.current.interaction_duration_ms);
  if (currentDuration != null && currentDuration > 0 && durationHistory.length >= WATCH_ANOMALY_MIN_SAMPLES) {
    metrics.push(
      analyzeMetric({
        id: "interaction_duration_ms",
        label: "Interaction check duration",
        unit: "ms",
        current: currentDuration,
        history: durationHistory,
      }),
    );
  }

  const currentProxy = finite(input.current.proxy_bytes);
  if (currentProxy != null && proxyHistory.length >= WATCH_ANOMALY_MIN_SAMPLES) {
    metrics.push(
      analyzeMetric({
        id: "proxy_bytes",
        label: "Proxy transfer (measured)",
        unit: "bytes",
        current: currentProxy,
        history: proxyHistory,
      }),
    );
  }

  const baseline_samples = Math.max(durationHistory.length, proxyHistory.length);
  if (!metrics.length) {
    return {
      schema_version: WATCH_ANOMALY_SCHEMA_VERSION,
      source: WATCH_ANOMALY_SOURCE,
      measured_at: input.measuredAt,
      baseline_samples,
      min_samples_required: WATCH_ANOMALY_MIN_SAMPLES,
      status: "insufficient_baseline",
      metrics: [],
      series,
    };
  }

  const anomalous = metrics.some((m) => m.anomalous);
  return {
    schema_version: WATCH_ANOMALY_SCHEMA_VERSION,
    source: WATCH_ANOMALY_SOURCE,
    measured_at: input.measuredAt,
    baseline_samples,
    min_samples_required: WATCH_ANOMALY_MIN_SAMPLES,
    status: anomalous ? "anomaly_detected" : "no_anomaly",
    metrics,
    series,
  };
}

export function parseWatchAnomalyFromUnknown(raw: unknown): WatchAnomalyV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.schema_version !== WATCH_ANOMALY_SCHEMA_VERSION) return null;
  if (o.source !== WATCH_ANOMALY_SOURCE) return null;
  const status = o.status;
  if (status !== "insufficient_baseline" && status !== "no_anomaly" && status !== "anomaly_detected") {
    return null;
  }
  const metrics = Array.isArray(o.metrics)
    ? o.metrics
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const m = row as Record<string, unknown>;
          const id = m.id;
          if (id !== "interaction_duration_ms" && id !== "proxy_bytes") return null;
          const current = finite(m.current);
          const med = finite(m.median);
          const madValue = finite(m.mad);
          const z = finite(m.z_score);
          if (current == null || med == null || madValue == null || z == null) return null;
          return {
            id,
            label: typeof m.label === "string" ? m.label : id,
            current,
            median: med,
            mad: madValue,
            z_score: z,
            anomalous: m.anomalous === true,
            unit: m.unit === "bytes" ? "bytes" : "ms",
          } satisfies WatchAnomalyMetricV1;
        })
        .filter((row): row is WatchAnomalyMetricV1 => Boolean(row))
    : [];
  const series = Array.isArray(o.series)
    ? o.series
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const s = row as Record<string, unknown>;
          const measured_at = typeof s.measured_at === "string" ? s.measured_at : "";
          if (!measured_at) return null;
          return {
            measured_at,
            interaction_duration_ms: finite(s.interaction_duration_ms),
            proxy_bytes: finite(s.proxy_bytes),
          };
        })
        .filter((row): row is WatchMetricSample => Boolean(row))
    : [];

  return {
    schema_version: WATCH_ANOMALY_SCHEMA_VERSION,
    source: WATCH_ANOMALY_SOURCE,
    measured_at: typeof o.measured_at === "string" ? o.measured_at : "",
    baseline_samples: typeof o.baseline_samples === "number" ? o.baseline_samples : 0,
    min_samples_required: WATCH_ANOMALY_MIN_SAMPLES,
    status,
    metrics,
    series: series.slice(-20),
  };
}

export function watchAnomalyAlertMetrics(anomaly: WatchAnomalyV1 | null | undefined): WatchAnomalyMetricV1[] {
  if (!anomaly || anomaly.status !== "anomaly_detected") return [];
  return anomaly.metrics.filter((m) => m.anomalous);
}
