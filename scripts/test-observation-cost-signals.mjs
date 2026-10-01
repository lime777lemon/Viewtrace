import assert from "node:assert/strict";

function nonNegativeNumberOrNull(value) {
  if (value == null) return null;
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

function parseMeasuredProxyBytes(raw) {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  return nonNegativeNumberOrNull(Number(trimmed));
}

function estimatedBrowserTimeUnits(durationMs) {
  if (!Number.isFinite(durationMs) || durationMs < 0) return 1;
  return Math.max(1, Math.ceil(durationMs / 30_000));
}

function summarizeCaptureCostAttempts(log) {
  const billed = log.filter((row) => row.billed && row.duration_ms != null);
  const duration_ms = billed.length
    ? billed.reduce((sum, row) => sum + (row.duration_ms ?? 0), 0)
    : null;
  const estimated_time_units = billed.length
    ? billed.reduce((sum, row) => sum + (row.estimated_time_units ?? 0), 0)
    : null;
  const proxyUsing = log.filter((row) => row.billed && row.used_proxy);
  const proxy_bytes_measured_attempts = log.filter((row) => row.proxy_bytes != null).length;
  const proxyComplete =
    proxyUsing.length > 0 && proxyUsing.every((row) => row.proxy_bytes != null);
  const proxy_bytes = proxyComplete
    ? proxyUsing.reduce((sum, row) => sum + (row.proxy_bytes ?? 0), 0)
    : null;
  return {
    duration_ms,
    estimated_time_units,
    proxy_bytes,
    proxy_bytes_measured_attempts,
    attempts: billed.length,
  };
}

assert.equal(parseMeasuredProxyBytes(null), null);
assert.equal(parseMeasuredProxyBytes(""), null);
assert.equal(parseMeasuredProxyBytes("  "), null);
assert.equal(parseMeasuredProxyBytes("abc"), null);
assert.equal(parseMeasuredProxyBytes("0"), 0);
assert.equal(parseMeasuredProxyBytes("1500"), 1500);
assert.equal(nonNegativeNumberOrNull(undefined), null);
assert.equal(nonNegativeNumberOrNull(0), 0);

const failedThenOk = summarizeCaptureCostAttempts([
  {
    stage: "country",
    ok: false,
    billed: true,
    duration_ms: 800,
    estimated_time_units: estimatedBrowserTimeUnits(800),
    proxy_bytes: null,
    used_proxy: true,
    error: "browserless_error",
  },
  {
    stage: "no_proxy",
    ok: true,
    billed: true,
    duration_ms: 5_000,
    estimated_time_units: estimatedBrowserTimeUnits(5_000),
    proxy_bytes: null,
    used_proxy: false,
    error: null,
  },
]);
assert.equal(failedThenOk.attempts, 2);
assert.equal(failedThenOk.duration_ms, 5_800);
assert.equal(failedThenOk.estimated_time_units, 2);
assert.equal(failedThenOk.proxy_bytes, null);
assert.equal(failedThenOk.proxy_bytes_measured_attempts, 0);

const measuredZeroThenMb = summarizeCaptureCostAttempts([
  {
    stage: "state",
    ok: false,
    billed: true,
    duration_ms: 200,
    estimated_time_units: 1,
    proxy_bytes: 0,
    used_proxy: true,
    error: "browserless_error",
  },
  {
    stage: "country",
    ok: true,
    billed: true,
    duration_ms: 1_000,
    estimated_time_units: 1,
    proxy_bytes: 2_000_000,
    used_proxy: true,
    error: null,
  },
]);
assert.equal(measuredZeroThenMb.proxy_bytes, 2_000_000);
assert.equal(measuredZeroThenMb.proxy_bytes_measured_attempts, 2);
assert.equal(measuredZeroThenMb.estimated_time_units, 2);

function csvProxyBytes(value) {
  return value != null ? String(value) : "";
}
assert.equal(csvProxyBytes(null), "");
assert.equal(csvProxyBytes(0), "0");
assert.equal(csvProxyBytes(1500), "1500");

console.log("observation-cost-signals ok");
