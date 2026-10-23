import assert from "node:assert/strict";
import { journeyStepReport } from "../src/lib/journey-definition";
import { journeyRunStatus, type JourneyStepEvidence } from "../src/lib/journey-runner";
import { normalizeRuntimeEvents } from "../src/lib/runtime-observation";

const echoed = normalizeRuntimeEvents([
  { kind: "console_error", message: "checkout failed" },
  { kind: "uncaught", message: "boom" },
  { kind: "console_error", message: "Uncaught boom" },
  { kind: "unhandled_rejection", message: "rejected" },
  { kind: "console_error", message: "Uncaught (in promise) rejected" },
  { kind: "pageerror", message: "legacy" },
]);
assert.deepEqual(echoed.map((row) => `${row.kind}:${row.message}`), [
  "console_error:checkout failed",
  "uncaught:boom",
  "unhandled_rejection:rejected",
  "uncaught:legacy",
]);

const blank = (status: JourneyStepEvidence["status"]): JourneyStepEvidence => ({
  id: "pay",
  kind: "checkout",
  status,
  duration_ms: 10,
  url_after: null,
  detail: null,
  rendered_text: null,
  before_text: null,
  after_text: null,
  before_visible: null,
  after_visible: null,
  network: [],
  runtime: [{ kind: "console_error", message: "analytics" }],
  runtime_observed: true,
});
assert.equal(journeyRunStatus([blank("pass")]), "passed");

const report = journeyStepReport({
  kind: "checkout",
  status: "fail",
  detail: "outcome_mismatch",
  url_after: "https://shop.example/checkout",
  after_text: "",
  after_visible: false,
  network: [{ method: "POST", path: "/api/checkout", status: 500, type: "fetch", duration_ms: 80, transfer_bytes: null, failure: "failed", third_party: false, api: true }],
  runtime: [
    { kind: "console_error", message: "checkout failed" },
    { kind: "uncaught", message: "boom" },
    { kind: "console_error", message: "Uncaught boom" },
    { kind: "unhandled_rejection", message: "rejected" },
  ],
  runtime_observed: true,
  evidence: [{ kind: "dom_changed", summary: "2" }],
}, {
  selector: "#checkout",
  url: "",
  value: "",
  expect_text: "",
  expect_visible: true,
  expect_url: "",
  permitted_side_effect: null,
}, 0, "en");

assert.equal(report.title, "Step 1 · Checkout — Failed");
const value = (label: string) => report.lines.find((line) => line.label === label)?.value;
assert.equal(value("Button click"), "✓");
assert.equal(value("DOM mutation"), "✓");
assert.equal(value("Request"), "POST /api/checkout · 500 · failed · 80 ms");
assert.equal(value("Console error"), "1 · checkout failed");
assert.equal(value("Uncaught exception"), "1 · boom");
assert.equal(value("Unhandled rejection"), "1 · rejected");
assert.equal(value("Failed resource"), "1");
assert.equal(value("Expected modal"), "Not visible");
assert.equal(value("Reason"), "Expected change was not observed");

console.log("ok");
