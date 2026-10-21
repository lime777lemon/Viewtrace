import assert from "node:assert/strict";
import {
  buildJourneyCompareRows,
  buildJourneyRun,
  formatJourneyDurationSec,
} from "../src/lib/observation-journey";
import type { SyntheticInteractionV1 } from "../src/lib/observation-synthetic-interaction";
import { buildObservationMeasurements } from "../src/lib/observation-measurements";
import { compareFixtureTimeRight } from "../src/lib/observation-compare-fixtures";

const clicks: SyntheticInteractionV1 = {
  schema_version: 1,
  source: "browserless_click",
  measured_at: "2026-10-20T00:00:00.000Z",
  requested_url: "https://example.com/",
  duration_ms: 1234,
  proxy_bytes: 10,
  skipped_unsafe: 1,
  interactions: [
    { label: "Pricing", kind: "link", latency_ms: 180, navigated: true, error: null },
    { label: "Features", kind: "button", latency_ms: 90, navigated: false, error: "timeout" },
  ],
  error: null,
};

const idle = buildJourneyRun({ observationStatus: "success", synthetic: null });
assert.equal(idle.overall, "not_run");
assert.equal(idle.steps[0]?.key, "open");
assert.equal(idle.steps[0]?.status, "pass");

const openFail = buildJourneyRun({ observationStatus: "failure", synthetic: null });
assert.equal(openFail.overall, "fail");
assert.equal(openFail.steps[0]?.status, "fail");

const run = buildJourneyRun({ observationStatus: "success", synthetic: clicks });
assert.equal(run.overall, "fail");
assert.equal(run.durationMs, 1234);
assert.equal(run.steps.length, 3);
assert.equal(run.steps[1]?.status, "pass");
assert.equal(run.steps[2]?.status, "fail");
assert.equal(formatJourneyDurationSec(run.durationMs), "1.2 sec");

const passClicks: SyntheticInteractionV1 = { ...clicks, interactions: [clicks.interactions[0]!], error: null };
const pass = buildJourneyRun({ observationStatus: "success", synthetic: passClicks });
assert.equal(pass.overall, "pass");

const rows = buildJourneyCompareRows([
  { observationId: "a", regionLabel: "Japan", run: pass },
  { observationId: "b", regionLabel: "US", run: idle },
]);
assert.equal(rows[0]?.key, "open");
assert.deepEqual(
  rows[0]?.cells.map((cell) => cell.status),
  ["pass", "pass"],
);
assert.equal(rows[1]?.label, "Pricing");
assert.deepEqual(
  rows[1]?.cells.map((cell) => cell.status),
  ["pass", "not_run"],
);

const measurementsIdle = buildObservationMeasurements(compareFixtureTimeRight);
assert.equal(measurementsIdle.find((row) => row.id === "journey")?.presence, "not_measured");

const measurementsRun = buildObservationMeasurements(compareFixtureTimeRight, { synthetic: passClicks });
const journeyRow = measurementsRun.find((row) => row.id === "journey");
assert.equal(journeyRow?.presence, "recorded");
assert.equal(journeyRow && "overall" in journeyRow ? journeyRow.overall : null, "pass");

console.log("ok");
