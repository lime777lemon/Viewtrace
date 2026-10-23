import assert from "node:assert/strict";
import type { Observation } from "../src/lib/demo/observations";
import { buildObservationMeasureLedger } from "../src/lib/observation-measure-ledger";
import {
  buildObservationMeasurementDiffs,
  buildObservationMeasurements,
  countHtmlHeadSignalsPresent,
  observationFinalUrl,
  observationHttpStatus,
  observationVisualKind,
} from "../src/lib/observation-measurements";
import type { SessionSignalsV1 } from "../src/lib/session-signals";
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

const ledger = buildObservationMeasureLedger({
  observation: liveObs,
  locale: "en",
  httpStatus: observationHttpStatus(liveObs),
  finalUrl: observationFinalUrl(liveObs),
  redirected: false,
  visual: "live",
});
const reach = ledger.layers.find((layer) => layer.id === "reachability");
assert.equal(reach?.lines.find((row) => row.id === "dns")?.state, "not_measured");
assert.equal(reach?.lines.find((row) => row.id === "tls")?.state, "not_measured");
assert.equal(reach?.lines.find((row) => row.id === "http")?.state, "observed");
assert.match(ledger.dnsNote, /were not measured/);

const session: SessionSignalsV1 = {
  http: { status: 200, final_url: "https://example.com/", redirect_count: 0, content_type: "text/html", robots_header: null, loaded: true, timed_out: false },
  resources: { script: 2, stylesheet: 1, image: 4, font: 1, xhr: 0, fetch: 3, other: 0, failed: 1, status_4xx: 1, status_5xx: 0, transfer_bytes: null },
  errors: { console_error: 2, pageerror: 1, request_failed: 1, unhandled_rejection: null },
  performance: { ttfb_ms: null, dom_content_loaded_ms: null, load_ms: null, fcp_ms: null, lcp_ms: null, cls: null, long_tasks: null },
  structured_data: { types: [], syntax_errors: null },
  requests: [],
};
const withSession = buildObservationMeasurements(liveObs, { session });
const network = withSession.find((row) => row.id === "network");
const consoleRow = withSession.find((row) => row.id === "console");
assert.equal(network?.presence, "recorded");
assert.equal(network?.id === "network" ? network.resources?.script : null, 2);
assert.equal(network?.id === "network" ? network.resources?.failed : null, 1);
assert.equal(consoleRow?.presence, "recorded");
assert.equal(consoleRow?.id === "console" ? consoleRow.behavior?.consoleErrors : null, 2);
assert.equal(consoleRow?.id === "console" ? consoleRow.behavior?.pageErrors : null, 1);
const connected = buildObservationMeasureLedger({
  observation: liveObs,
  locale: "en",
  httpStatus: 200,
  finalUrl: "https://example.com/",
  redirected: false,
  visual: "still",
  session: {
    ...session,
    connection: { dns_ms: 0, tls_ms: 18, protocol: "h2", secure: true },
  },
});
const connectedReach = connected.layers.find((layer) => layer.id === "reachability");
assert.equal(connectedReach?.lines.find((row) => row.id === "dns")?.detail, "0 ms");
assert.equal(connectedReach?.lines.find((row) => row.id === "tls")?.detail, "h2 · 18 ms");
assert.match(connected.dnsNote, /Navigation Timing/);
const plain = buildObservationMeasureLedger({
  observation: liveObs,
  locale: "en",
  httpStatus: 200,
  finalUrl: "http://example.com/",
  redirected: false,
  visual: "still",
  session: {
    ...session,
    connection: { dns_ms: 4, tls_ms: null, protocol: "http/1.1", secure: false },
  },
});
assert.equal(plain.layers.find((layer) => layer.id === "reachability")?.lines.find((row) => row.id === "tls")?.state, "observed_absent");

const otherRegion = buildObservationMeasurements(liveObs, {
  journeyRuns: [{
    region: "US-CA",
    deviceClass: "desktop",
    status: "failed",
    steps: [{
      id: "1",
      kind: "click",
      status: "fail",
      duration_ms: 10,
      url_after: null,
      detail: null,
      rendered_text: null,
      before_text: null,
      after_text: null,
      before_visible: null,
      after_visible: null,
      network: [{ method: "GET", path: "/api", status: 500, type: "fetch", duration_ms: null, transfer_bytes: null, failure: "failed", third_party: false, api: true }],
      runtime: [{ kind: "console_error", message: "boom" }],
    }],
  }],
});
assert.equal(otherRegion.find((row) => row.id === "network")?.presence, "not_measured");
assert.equal(otherRegion.find((row) => row.id === "console")?.presence, "not_measured");

const sameRegion = buildObservationMeasurements(liveObs, {
  journeyRuns: [{
    region: "JP-13",
    deviceClass: "desktop",
    status: "failed",
    steps: [{
      id: "1",
      kind: "checkout",
      status: "fail",
      duration_ms: 10,
      url_after: null,
      detail: null,
      rendered_text: null,
      before_text: null,
      after_text: null,
      before_visible: null,
      after_visible: null,
      network: [{ method: "GET", path: "/api", status: 500, type: "fetch", duration_ms: null, transfer_bytes: null, failure: "failed", third_party: false, api: true }],
      runtime: [{ kind: "pageerror", message: "boom" }, { kind: "console_error", message: "x" }],
    }],
  }],
});
const journeyNetwork = sameRegion.find((row) => row.id === "network");
const journeyConsole = sameRegion.find((row) => row.id === "console");
assert.equal(journeyNetwork?.id === "network" ? journeyNetwork.journey?.requests : null, 1);
assert.equal(journeyNetwork?.id === "network" ? journeyNetwork.journey?.failed : null, 1);
assert.equal(journeyConsole?.id === "console" ? journeyConsole.journey?.pageErrors : null, 1);
assert.equal(journeyConsole?.id === "console" ? journeyConsole.journey?.consoleErrors : null, 1);

const journeyLedger = buildObservationMeasureLedger({
  observation: liveObs,
  locale: "en",
  httpStatus: 200,
  finalUrl: "https://example.com/",
  redirected: false,
  visual: "still",
  journeyRuns: [{
    region: "JP-13",
    deviceClass: "desktop",
    status: "failed",
    steps: [{
      id: "1",
      kind: "checkout",
      status: "fail",
      duration_ms: 10,
      url_after: null,
      detail: null,
      rendered_text: null,
      before_text: null,
      after_text: null,
      before_visible: null,
      after_visible: null,
      network: [
        ...Array.from({ length: 9 }, (_, index) => ({
          method: "GET",
          path: `/img/${index}.png`,
          status: 200,
          type: "image" as const,
          duration_ms: 5,
          transfer_bytes: null,
          failure: null,
          third_party: false,
          api: false,
        })),
        { method: "POST", path: "/api/cart", status: 200, type: "fetch" as const, duration_ms: 30, transfer_bytes: 120, failure: null, third_party: false, api: true },
        { method: "POST", path: "/api/checkout", status: 500, type: "fetch" as const, duration_ms: 80, transfer_bytes: null, failure: "failed" as const, third_party: false, api: true },
      ],
      runtime: [{ kind: "console_error", message: "x" }],
    }],
  }],
});
const requestDetails = journeyLedger.layers.find((layer) => layer.id === "resources")?.lines.map((row) => row.detail) ?? [];
assert.ok(requestDetails.includes("POST /api/cart · 200 · 30 ms · 120 B"));
assert.ok(requestDetails.includes("POST /api/checkout · 500 · failed · 80 ms"));
assert.equal(journeyLedger.layers.find((layer) => layer.id === "runtime")?.lines.find((row) => row.id === "unhandled")?.state, "not_measured");
assert.equal(journeyLedger.layers.find((layer) => layer.id === "reachability")?.lines.find((row) => row.id === "dns")?.state, "not_measured");

console.log("ok");
