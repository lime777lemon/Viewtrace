import assert from "node:assert/strict";
import { exitMatchesRequestedState, nextStateRetryAt } from "../src/lib/browserless-state-session";
import { resolveCaptureProxyMode } from "../src/lib/capture-conditions";
import { buildWeeklyEvidenceReport, previousJstWeek } from "../src/lib/scheduled-evidence-report";
import type { EvidenceReportObservationFact } from "../src/lib/scheduled-evidence-report";

assert.equal(exitMatchesRequestedState("US-CA", { country: "US", state: "CA" }), true);
assert.equal(exitMatchesRequestedState("US-CA", { country: "US", state: "NV" }), false);
assert.equal(exitMatchesRequestedState("US-CA", { country: "US", state: null }), false);
assert.equal(exitMatchesRequestedState("JP", { country: "JP", state: null }), false);

const monday = new Date("2026-10-19T00:00:00.000Z");
assert.equal(nextStateRetryAt(monday, 0)?.toISOString(), "2026-10-20T00:00:00.000Z");
assert.equal(nextStateRetryAt(monday, 1)?.toISOString(), "2026-10-21T00:00:00.000Z");
assert.equal(nextStateRetryAt(monday, 2)?.toISOString(), "2026-10-23T00:00:00.000Z");
assert.equal(nextStateRetryAt(monday, 4), null);

const country = resolveCaptureProxyMode({
  viaResidential: true,
  viaExternalProxy: false,
  usedRetryWithoutProxy: false,
  regionInput: "US-CA",
  residentialStateApplied: true,
  stateVerified: false,
});
assert.equal(country.state, null);
assert.equal(country.country, "us");

const verified = resolveCaptureProxyMode({
  viaResidential: true,
  viaExternalProxy: false,
  usedRetryWithoutProxy: false,
  regionInput: "US-CA",
  stateVerified: true,
});
assert.equal(verified.state, "CA");

function fact(patch: Partial<EvidenceReportObservationFact>): EvidenceReportObservationFact {
  return {
    id: "obs-1",
    url: "https://example.com/",
    regionValue: "US-CA",
    regionLabel: "US · California",
    capturedAt: "2026-10-22T05:18:00.000Z",
    status: "success",
    behavior: null,
    ...patch,
  };
}

const period = previousJstWeek(new Date("2026-10-26T00:00:00.000Z"));
const report = buildWeeklyEvidenceReport({
  period,
  observations: [
    fact({
      geo: { country: "us", state: "CA", proxy_mode: "browserless_residential", state_verified: true, geo_attempts: 2 },
      regionInput: "US-CA",
    }),
    fact({
      id: "obs-ny",
      regionValue: "US-NY",
      regionLabel: "US · New York",
      geo: { country: "us", state: null, proxy_mode: "browserless_residential", state_verified: false, geo_attempts: 3 },
      regionInput: "US-NY",
    }),
  ],
  priorObservations: [],
  journeys: [],
  stateCoverage: [
    { regionValue: "US-NY", status: "pending", verifiedAt: null, attemptCount: 6 },
  ],
  origin: "https://viewtrace.net",
});
assert.match(report.text, /Screenshot を州単位で確認済み/);
assert.match(report.text, /確認した測定: Screenshot/);
assert.match(report.text, /Interaction Check、Journey、Lab CWV はこの session では測っていません。/);
assert.match(report.text, /州単位の確認: 確認できていない/);
assert.match(report.text, /米国単位の Observation: 1 件/);
assert.match(report.text, /州単位の試行: 6 回/);
assert.doesNotMatch(report.text, /Page changed/);

console.log("state coverage ok");
