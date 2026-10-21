import assert from "node:assert/strict";
import { resolveJourneyOpenUrl, resolveJourneySteps, type JourneyStepDefinition } from "../src/lib/journey-definition";
import {
  evaluateMonitoringPreflight,
  journeyMonitoringChecks,
  journeyRunProvesMonitoring,
  monitoringExecutionChecks,
  scheduledRunDecision,
} from "../src/lib/monitoring-watch";

const open = (url: string): JourneyStepDefinition => ({
  id: "open",
  kind: "open_url",
  selector: "",
  value: "",
  url,
  wait_ms: 1000,
  permitted_side_effect: null,
  expect_selector: "",
  expect_text: "",
  expect_visible: false,
  expect_url: "",
});

assert.equal(resolveJourneyOpenUrl("https://viewtrace.net/", "viewtrace.net"), "https://viewtrace.net/");
const resolved = resolveJourneySteps("https://viewtrace.net/", [open("viewtrace.net")]);
assert.equal(resolved[0]?.url, "https://viewtrace.net/");

assert.equal(
  journeyRunProvesMonitoring("failed", [{ kind: "open_url", status: "fail", detail: "Protocol error (Page.navigate): Cannot navigate to invalid URL" }]),
  false,
);
assert.equal(
  journeyRunProvesMonitoring("passed", [{ kind: "open_url", status: "pass", detail: "https://viewtrace.net/" }]),
  true,
);

assert.equal(journeyMonitoringChecks(["US-NY", "US-TX", "AU"], ["desktop", "mobile"]), 6);
assert.equal(monitoringExecutionChecks({
  includePage: true,
  regions: ["US-CA"],
  environments: ["desktop"],
  journeys: 1,
}), 2);
assert.equal(scheduledRunDecision(6, 5), "skip");
assert.equal(scheduledRunDecision(6, 6), "execute");
assert.equal(scheduledRunDecision(6, null), "unknown");

const steps = [open("viewtrace.net")];
const short = evaluateMonitoringPreflight({
  startUrl: "https://viewtrace.net/",
  steps,
  regions: ["US-NY", "US-TX", "AU"],
  environments: ["desktop", "mobile"],
  credentialsAvailable: true,
  availableChecks: 6,
  runs: [],
});
assert.equal(short.requiredChecks, 6);
assert.equal(short.testRunChecks, 1);
assert.equal(short.capacityAvailable, false);
assert.equal(short.ready, false);

const ready = evaluateMonitoringPreflight({
  startUrl: "https://viewtrace.net/",
  steps,
  regions: ["US-NY"],
  environments: ["desktop"],
  credentialsAvailable: true,
  availableChecks: 1,
  runs: [{ status: "passed", steps: [{ kind: "open_url", status: "pass", detail: "https://viewtrace.net/" }] }],
});
assert.equal(ready.testRunPassed, true);
assert.equal(ready.capacityAvailable, true);
assert.equal(ready.ready, true);

console.log("monitoring watch preflight ok");
