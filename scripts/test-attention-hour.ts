import assert from "node:assert/strict";
import { buildAttentionHour, type AttentionAlertFact, type AttentionObservationFact } from "../src/lib/attention-hour";

const now = new Date("2026-10-24T09:00:00.000Z");

function observation(partial: Partial<AttentionObservationFact> & Pick<AttentionObservationFact, "id" | "capturedAt">): AttentionObservationFact {
  return {
    url: "https://example.com/",
    regionValue: "",
    regionLabel: "US · California",
    captureStatus: "success",
    httpStatus: 200,
    timedOut: false,
    ttfbMs: null,
    loadMs: null,
    dnsMs: null,
    tlsMs: null,
    resource5xx: 0,
    requestFailed: 0,
    requestCount: null,
    executionErrors: [],
    ...partial,
  };
}

const board = buildAttentionHour({
  now,
  observations: [
    observation({
      id: "slow",
      capturedAt: "2026-10-24T08:50:00.000Z",
      ttfbMs: 2400,
      loadMs: 4100,
      dnsMs: 18,
      tlsMs: 42,
    }),
    observation({
      id: "down",
      url: "https://example.com/pricing",
      regionLabel: "Japan · Tokyo",
      capturedAt: "2026-10-24T08:40:00.000Z",
      httpStatus: 503,
      ttfbMs: null,
      resource5xx: 2,
      requestFailed: 1,
      executionErrors: ["hover"],
    }),
    observation({
      id: "quiet",
      capturedAt: "2026-10-24T08:20:00.000Z",
      ttfbMs: 80,
    }),
    observation({
      id: "old",
      regionLabel: "US · New York",
      capturedAt: "2026-10-24T06:00:00.000Z",
      captureStatus: "failure",
      httpStatus: 500,
      ttfbMs: 9000,
    }),
    observation({
      id: "pending",
      capturedAt: "2026-10-24T08:10:00.000Z",
      captureStatus: "pending",
      httpStatus: null,
      timedOut: null,
      resource5xx: null,
      requestFailed: null,
    }),
  ],
  alerts: [
    {
      id: "carousel",
      at: "2026-10-24T08:55:00.000Z",
      url: "https://example.com/campaign",
      regionLabel: "US · California",
      href: "/dashboard/monitoring-runs/run-1",
      reason: "behavior_regression",
      detail: "Carousel Working → No rendered state change observed",
    } satisfies AttentionAlertFact,
    {
      id: "stale",
      at: "2026-10-24T06:30:00.000Z",
      url: "https://example.com/campaign",
      regionLabel: "US · California",
      href: "/dashboard/monitoring-runs/run-0",
      reason: "journey_failed",
      detail: "Checkout fail",
    },
  ],
});

assert.equal(board.observationCount, 4);
assert.equal(board.slowest?.id, "slow");
assert.equal(board.slowest?.ms, 2400);
assert.equal(board.slowest?.kind, "ttfb");
assert.equal(board.medianTtfbMs, Math.round((80 + 2400) / 2));
assert.deepEqual(board.slow.map((row) => row.id), ["slow", "quiet"]);
assert.equal(board.failures.some((row) => row.id === "old:http_error"), false);
assert.equal(board.failures.some((row) => row.reason === "journey_failed"), false);
assert.equal(board.failures.some((row) => row.reason === "behavior_regression"), true);
assert.equal(board.failures.some((row) => row.detail === "HTTP 503"), true);
assert.equal(board.failures.some((row) => row.reason === "execution_error" && row.detail === "hover"), true);
assert.equal(board.failures.some((row) => row.id === "pending:capture_failure"), false);
assert.equal(board.regions[0]?.regionLabel, "Japan · Tokyo");
assert.equal(board.regions.find((row) => row.regionLabel === "US · New York"), undefined);

const empty = buildAttentionHour({ now, observations: [], alerts: [] });
assert.equal(empty.observationCount, 0);
assert.equal(empty.failureCount, 0);
assert.equal(empty.slowest, null);
assert.equal(empty.medianTtfbMs, null);
assert.equal(empty.requestsPerSecond, null);
assert.equal(empty.forecastRequestsPerSecond, null);
assert.equal(empty.cpu, null);
assert.equal(empty.availability7.percent, null);
assert.equal(empty.availability30.percent, null);

const rated = buildAttentionHour({
  now,
  observations: [
    observation({ id: "early", capturedAt: "2026-10-24T08:20:00.000Z", loadMs: 2000, requestCount: 20 }),
    observation({ id: "later", capturedAt: "2026-10-24T08:50:00.000Z", loadMs: 4100, requestCount: 41 }),
    observation({ id: "bare", capturedAt: "2026-10-24T08:40:00.000Z", loadMs: null, requestCount: 99 }),
  ],
  alerts: [],
  history: [
    { capturedAt: "2026-10-24T08:50:00.000Z", httpStatus: 200 },
    { capturedAt: "2026-10-23T08:00:00.000Z", httpStatus: 200 },
    { capturedAt: "2026-10-22T08:00:00.000Z", httpStatus: 500 },
    { capturedAt: "2026-10-01T08:00:00.000Z", httpStatus: 500 },
    { capturedAt: "2026-10-20T08:00:00.000Z", httpStatus: null },
    { capturedAt: "2026-08-01T08:00:00.000Z", httpStatus: 200 },
  ],
});
assert.equal(rated.requestsPerSecond, Math.round(((20 + 41) / (2 + 4.1)) * 10) / 10);
assert.deepEqual(rated.requestRates.map((value) => Math.round(value * 10) / 10), [10, 10]);
assert.equal(rated.forecastRequestsPerSecond, 10);
assert.equal(rated.cpu, null);
assert.equal(rated.availability7.measured, 3);
assert.equal(rated.availability7.up, 2);
assert.equal(rated.availability7.percent, 66.67);
assert.equal(rated.availability30.measured, 4);
assert.equal(rated.availability30.up, 2);
assert.equal(rated.availability30.percent, 50);

const mapped = buildAttentionHour({
  now,
  observations: [
    observation({ id: "ca", capturedAt: "2026-10-24T08:50:00.000Z", regionValue: "US-CA", regionLabel: "US · California" }),
    observation({ id: "ny", capturedAt: "2026-10-24T08:40:00.000Z", regionValue: "US-NY", regionLabel: "US · New York" }),
    observation({ id: "tyo", capturedAt: "2026-10-24T08:30:00.000Z", regionValue: "JP-13", regionLabel: "日本 · 東京", httpStatus: 500 }),
    observation({ id: "lab", capturedAt: "2026-10-24T08:20:00.000Z", regionValue: "", regionLabel: "Lab" }),
    observation({ id: "old-us", capturedAt: "2026-10-24T06:00:00.000Z", regionValue: "US-CA", regionLabel: "US · California" }),
  ],
  alerts: [],
});
assert.deepEqual(
  mapped.geo.map((row) => [row.country, row.observations, row.failures]),
  [
    ["US", 2, 0],
    ["JP", 1, 1],
  ],
);

const loadOnly = buildAttentionHour({
  now,
  observations: [observation({ id: "load", capturedAt: "2026-10-24T08:30:00.000Z", ttfbMs: null, loadMs: 1800 })],
  alerts: [],
});
assert.equal(loadOnly.slowest?.kind, "load");
assert.equal(loadOnly.slowest?.ms, 1800);
assert.equal(loadOnly.medianTtfbMs, null);

console.log("attention hour ok");
