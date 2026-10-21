import assert from "node:assert/strict";
import type { Observation } from "../src/lib/demo/observations";
import {
  buildObservationMeasurementDiffs,
  buildObservationMeasurements,
  countHtmlHeadSignalsPresent,
  observationHttpStatus,
  observationVisualKind,
} from "../src/lib/observation-measurements";
import { compareFixtureTimeLeft, compareFixtureTimeRight } from "../src/lib/observation-compare-fixtures";

const emptySignals = {
  document_title: null,
  meta_description: null,
  canonical_url: null,
  robots_meta: null,
  x_robots_tag: null,
  og_title: null,
  og_description: null,
  og_image: null,
  json_ld_types: [],
};

assert.equal(countHtmlHeadSignalsPresent(undefined), 0);
assert.equal(countHtmlHeadSignalsPresent(emptySignals), 0);
assert.equal(
  countHtmlHeadSignalsPresent({
    ...emptySignals,
    document_title: "Home",
    canonical_url: "https://example.com/",
    http_status: 200,
    final_url: "https://example.com/",
    json_ld_types: ["WebPage"],
  }),
  5,
);

const liveObs = {
  ...compareFixtureTimeRight,
  snapshotImageUrl: undefined,
  captureConditions: {
    ...compareFixtureTimeRight.captureConditions!,
    homepage_observation: { mode: "live_check", sequential_stills: false },
    html_signals: {
      ...compareFixtureTimeRight.captureConditions!.html_signals!,
      http_status: 200,
    },
  },
} as Observation;

assert.equal(observationVisualKind(liveObs), "live");
assert.equal(observationHttpStatus(liveObs), 200);

const rows = buildObservationMeasurements(liveObs);
assert.equal(rows.find((row) => row.id === "visual")?.kind, "live");
assert.equal(rows.find((row) => row.id === "journey")?.presence, "not_measured");
assert.equal(rows.find((row) => row.id === "network")?.presence, "not_measured");
assert.equal(rows.find((row) => row.id === "console")?.presence, "not_measured");
assert.equal(rows.find((row) => row.id === "performance")?.presence, "not_measured");
assert.ok((rows.find((row) => row.id === "page_signals") as { presentCount: number }).presentCount >= 1);

const diffs = buildObservationMeasurementDiffs(compareFixtureTimeRight, compareFixtureTimeLeft);
assert.equal(diffs.find((row) => row.id === "screenshot")?.verdict, "changed");
assert.equal(diffs.find((row) => row.id === "canonical")?.verdict, "same");
assert.equal(diffs.find((row) => row.id === "title")?.verdict, "changed");

console.log("ok");
