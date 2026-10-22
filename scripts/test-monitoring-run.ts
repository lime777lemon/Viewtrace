import assert from "node:assert/strict";
import {
  monitoringCheckPlan,
  monitoringJourneyFact,
  monitoringPageFact,
  monitoringParentStatus,
} from "../src/lib/monitoring-run";

const pageOnly = monitoringCheckPlan({ regions: ["GB", "GB"], environments: ["desktop"], workflowSteps: 0 });
assert.equal(pageOnly.pageObservations, 1);
assert.equal(pageOnly.journeyRuns, 0);
assert.equal(pageOnly.total, 1);

const both = monitoringCheckPlan({
  regions: ["US-CA", "JP-13"],
  environments: ["desktop", "mobile"],
  workflowSteps: 1,
});
assert.equal(both.pageObservations, 4);
assert.equal(both.journeyRuns, 4);
assert.equal(both.total, 4);

assert.equal(monitoringPageFact({ captured: false, verdict: null }), "incomplete");
assert.equal(monitoringPageFact({ captured: true, verdict: null }), "not_comparable");
assert.equal(monitoringPageFact({ captured: true, verdict: "incomparable" }), "not_comparable");
assert.equal(monitoringPageFact({ captured: true, verdict: "changed" }), "changed");
assert.equal(monitoringPageFact({ captured: true, verdict: "same" }), "same");
assert.equal(monitoringJourneyFact("passed"), "passed");
assert.equal(monitoringJourneyFact(null), "incomplete");

assert.equal(
  monitoringParentStatus({ pages: ["incomplete", "same"], journeys: ["failed"], newUnknown: false }),
  "incomplete",
);
assert.equal(
  monitoringParentStatus({ pages: ["changed", "same"], journeys: ["passed"], newUnknown: false }),
  "attention_needed",
);
assert.equal(
  monitoringParentStatus({ pages: ["not_comparable"], journeys: ["passed"], newUnknown: false }),
  "attention_needed",
);
assert.equal(
  monitoringParentStatus({ pages: ["same"], journeys: ["failed"], newUnknown: false }),
  "attention_needed",
);
assert.equal(
  monitoringParentStatus({ pages: ["same"], journeys: ["blocked"], newUnknown: false }),
  "blocked",
);
assert.equal(
  monitoringParentStatus({ pages: ["same"], journeys: ["passed"], newUnknown: false }),
  "healthy",
);
assert.equal(
  monitoringParentStatus({ pages: ["same"], journeys: ["failed", "blocked"], newUnknown: false }),
  "attention_needed",
);

console.log("ok");
