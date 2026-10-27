import assert from "node:assert/strict";
import {
  WATCH_ANOMALY_MIN_SAMPLES,
  computeWatchAnomaly,
} from "../src/lib/observation-watch-anomaly";

const base = {
  interaction_duration_ms: 30_000,
  proxy_bytes: 1_000_000,
};

const history = Array.from({ length: WATCH_ANOMALY_MIN_SAMPLES }, (_, i) => ({
  measured_at: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
  interaction_duration_ms: 30_000 + (i % 3) * 500,
  proxy_bytes: 1_000_000 + i * 1000,
}));

const insufficient = computeWatchAnomaly({
  measuredAt: "2026-02-01T00:00:00.000Z",
  current: { measured_at: "2026-02-01T00:00:00.000Z", ...base },
  history: history.slice(0, 5),
});
assert.equal(insufficient.status, "insufficient_baseline");

const normal = computeWatchAnomaly({
  measuredAt: "2026-02-01T00:00:00.000Z",
  current: { measured_at: "2026-02-01T00:00:00.000Z", interaction_duration_ms: 31_000, proxy_bytes: 1_005_000 },
  history,
});
assert.equal(normal.status, "no_anomaly");

const spike = computeWatchAnomaly({
  measuredAt: "2026-02-01T00:00:00.000Z",
  current: { measured_at: "2026-02-01T00:00:00.000Z", interaction_duration_ms: 120_000, proxy_bytes: 1_010_000 },
  history,
});
assert.equal(spike.status, "anomaly_detected");
assert.ok(spike.metrics.some((m) => m.id === "interaction_duration_ms" && m.anomalous));

console.log("test-observation-watch-anomaly: ok");
