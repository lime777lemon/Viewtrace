import assert from "node:assert/strict";
import {
  buildMonitoringRunDiff,
  diffMonitoringJourney,
  diffMonitoringPage,
  monitoringReviewStatus,
  selectMonitoringAlerts,
  type MonitoringJourneyInput,
} from "../src/lib/monitoring-run-diff";
import { presentMonitoringReview } from "../src/lib/monitoring-run-summary";
import { alertIncludedByPolicy, buildMonitoringNotification } from "../src/lib/monitoring-notification";
import type { RegionalInteractionCheckV1 } from "../src/lib/observation-regional-interaction";
import type { InteractionCheckType } from "../src/lib/observation-regional-interaction";
import type { ScrollInteractionStatus } from "../src/lib/observation-scroll-interaction";

function check(
  types: Array<{ type: InteractionCheckType; status: ScrollInteractionStatus }>,
  map: Array<{ selector: string; classification: string }> = [],
): RegionalInteractionCheckV1 {
  return {
    schema_version: 1,
    source: "regional_interaction",
    measured_at: "2026-10-21T00:00:00.000Z",
    requested_url: "https://viewtrace.net/",
    requested_region: "US-CA",
    types: types.map((row) => ({ type: row.type, detected: row.status !== "not_detected", status: row.status })),
    scroll: null,
    duration_ms: null,
    proxy_bytes: null,
    discovery: {
      map: map.map((row) => ({
        selector: row.selector,
        classification: row.classification,
        sources: ["style"],
        changes: ["display"],
        actions: [],
        t0: null,
        t1: null,
        region: null,
      })),
      safety: { blocked: [] },
    },
  } as unknown as RegionalInteractionCheckV1;
}

const previous = check(
  [
    { type: "carousel", status: "working" },
    { type: "menu", status: "working" },
  ],
  [],
);
const current = check(
  [
    { type: "carousel", status: "working" },
    { type: "menu", status: "not_detected" },
  ],
  [
    { selector: "header a.logo", classification: "unknown_style_change" },
    { selector: "header nav", classification: "unknown_dom_change" },
    { selector: "header button", classification: "unknown_style_change" },
    { selector: "header img", classification: "unknown_style_change" },
    { selector: "header span", classification: "unknown_style_change" },
    { selector: "header .cta", classification: "unknown_style_change" },
  ],
);

const journey = (status: MonitoringJourneyInput["status"], after: string): MonitoringJourneyInput => ({
  region: "US-CA",
  environment: "desktop",
  name: "Checkout",
  status,
  steps: [{
    id: "cart",
    label: "Add to cart",
    expected: "cart count changes",
    status: status === "failed" ? "fail" : "pass",
    before: "0",
    after,
  }],
});

const diff = buildMonitoringRunDiff({
  previousRunId: "previous",
  pages: [diffMonitoringPage({
    region: "US-CA",
    regionLabel: "US · California",
    captured: true,
    verdict: "changed",
    currentObservationId: "current-obs",
    previousObservationId: "previous-obs",
  })],
  behaviorChecks: [{
    region: "US-CA",
    current,
    previous,
    previousObservationId: "previous-obs",
  }],
  journeys: [{ current: journey("failed", "0"), previous: journey("passed", "1") }],
});

const carousel = diff.behavior.rows.find((row) => row.key === "type:carousel");
const menu = diff.behavior.rows.find((row) => row.key === "type:menu");
const headerRows = diff.behavior.rows.filter((row) => row.selector?.startsWith("header"));
assert.equal(carousel?.section, "unchanged");
assert.equal(menu?.section, "missing");
assert.equal(headerRows.length, 6);
assert.ok(headerRows.every((row) => row.section === "new" && row.label === "Header"));
assert.equal(diff.journeys[0]?.verdict, "regression");
assert.equal(diff.journeys[0]?.steps[0]?.regression, true);
assert.equal(diff.journeys[0]?.steps[0]?.previousObserved, "0 → 1");
assert.equal(diff.journeys[0]?.steps[0]?.currentObserved, "0 → 0");

const alerts = selectMonitoringAlerts(diff);
assert.equal(alerts.filter((row) => row.layer === "page").length, 1);
assert.equal(alerts.filter((row) => row.layer === "behavior" && row.code === "behavior_missing").length, 1);
assert.equal(alerts.filter((row) => row.layer === "behavior" && row.code === "behavior_new_unknown").length, 6);
assert.equal(alerts.some((row) => row.layer === "behavior" && row.code === "behavior_regression" && "label" in row && row.label === "Carousel"), false);
assert.equal(alerts.filter((row) => row.layer === "journey" && row.code === "journey_failed").length, 1);
const journeyAlert = alerts.find((row) => row.layer === "journey");
assert.equal(journeyAlert && "steps" in journeyAlert ? journeyAlert.steps[0]?.label : "", "Add to cart");
assert.equal(monitoringReviewStatus({ incomplete: false, alerts }), "attention_needed");

const knownNew = buildMonitoringRunDiff({
  previousRunId: "previous",
  pages: [diffMonitoringPage({
    region: "US-CA",
    regionLabel: "US · California",
    captured: true,
    verdict: "same",
    currentObservationId: "c",
    previousObservationId: "p",
  })],
  behaviorChecks: [{
    region: "US-CA",
    previous: check([{ type: "carousel", status: "not_detected" }]),
    current: check([{ type: "carousel", status: "working" }]),
    previousObservationId: "p",
  }],
  journeys: [{ current: journey("passed", "1"), previous: journey("passed", "1") }],
});
const knownAlerts = selectMonitoringAlerts(knownNew);
assert.equal(knownNew.behavior.rows.some((row) => row.section === "new" && row.known), true);
assert.equal(knownAlerts.length, 0);
assert.equal(monitoringReviewStatus({ incomplete: false, alerts: knownAlerts }), "healthy");

const blocked = selectMonitoringAlerts(buildMonitoringRunDiff({
  previousRunId: "previous",
  pages: [diffMonitoringPage({
    region: "US-CA",
    regionLabel: "US · California",
    captured: true,
    verdict: "same",
    currentObservationId: "c",
    previousObservationId: "p",
  })],
  behaviorChecks: [],
  journeys: [{
    current: { ...journey("blocked", "0"), steps: [{ ...journey("blocked", "0").steps[0], status: "blocked_for_safety" }] },
    previous: journey("passed", "1"),
  }],
}));
assert.equal(blocked.length, 1);
assert.equal(blocked[0]?.level, "candidate");
assert.equal(blocked[0] && "code" in blocked[0] ? blocked[0].code : "", "journey_blocked");
assert.equal(blocked[0]?.severity, "info");
assert.equal(monitoringReviewStatus({ incomplete: false, alerts: blocked }), "blocked");

const unmeasured = buildMonitoringRunDiff({
  previousRunId: null,
  pages: [diffMonitoringPage({
    region: "US-CA",
    regionLabel: "US · California",
    captured: true,
    verdict: null,
    currentObservationId: "c",
    previousObservationId: null,
  })],
  behaviorChecks: [{ region: "US-CA", current: null, previous: null, previousObservationId: null }],
  journeys: [{ current: journey("passed", "1"), previous: null }],
});
assert.equal(unmeasured.behavior.measured, false);
assert.equal(unmeasured.pages[0]?.verdict, "not_comparable");
assert.equal(selectMonitoringAlerts(unmeasured).some((row) => row.layer === "behavior"), false);
assert.equal(selectMonitoringAlerts(unmeasured).some((row) => row.layer === "journey"), false);
assert.equal(diffMonitoringJourney(journey("passed", "1"), journey("passed", "1")).verdict, "unchanged");

const alertsBefore = JSON.stringify(alerts);
const rowsBefore = JSON.stringify(diff.behavior.rows);
const presented = presentMonitoringReview(alerts, diff.behavior.rows);
assert.equal(JSON.stringify(alerts), alertsBefore);
assert.equal(JSON.stringify(diff.behavior.rows), rowsBefore);
assert.equal(alerts.filter((row) => row.layer === "behavior" && row.code === "behavior_new_unknown").length, 6);
assert.equal(presented.areas.length, 1);
assert.equal(presented.areas[0]?.title, "Header changed");
assert.equal(presented.areas[0]?.count, 6);
assert.equal(presented.areas[0]?.summary, "layout_visibility");
assert.equal(presented.areas[0]?.evidence.length, 6);
assert.equal(presented.behaviorSingles.some((row) => row.code === "behavior_missing"), true);
assert.equal(presented.changeCount, 3);

const headerOnly = alerts.filter((row) => row.layer === "behavior" && row.code === "behavior_new_unknown");
const headerReview = presentMonitoringReview(headerOnly, diff.behavior.rows);
assert.equal(headerReview.changeCount, 0);
assert.equal(headerReview.areas.length, 1);
assert.equal(headerReview.areas[0]?.count, 6);

assert.equal(alerts.find((row) => row.layer === "page")?.severity, "info");
assert.equal(alerts.find((row) => row.layer === "journey" && row.code === "journey_failed")?.severity, "critical");
assert.ok(alerts.filter((row) => row.code === "behavior_new_unknown").every((row) => row.severity === "warning"));
assert.equal(alerts.find((row) => row.code === "behavior_missing")?.severity, "warning");
assert.equal(alertIncludedByPolicy("info", "critical_and_warning"), false);
assert.equal(alertIncludedByPolicy("warning", "critical_and_warning"), true);

const runUrl = "https://viewtrace.net/dashboard/monitoring-runs/run-1";
const mailed = buildMonitoringNotification({
  alerts,
  rows: diff.behavior.rows,
  runUrl,
});
assert.equal(mailed.send, true);
assert.equal(mailed.subject, "ViewTrace detected 3 areas that need attention");
assert.match(mailed.text, /Critical — Checkout/);
assert.match(mailed.text, /Add to cart failed/);
assert.match(mailed.text, /Expected 0 → 1 · Observed 0 → 0/);
assert.match(mailed.text, /Warning — Header/);
assert.match(mailed.text, /6 related changes detected/);
assert.match(mailed.text, /Warning — Menu/);
assert.match(mailed.text, /Page screenshot also changed/);
assert.equal((mailed.text.match(/View monitoring run/g) ?? []).length, 1);
assert.match(mailed.html, new RegExp(`href="${runUrl}"`));
assert.equal(alerts.length, JSON.parse(alertsBefore).length);

const infoOnly = buildMonitoringNotification({
  alerts: alerts.filter((row) => row.layer === "page"),
  rows: [],
  runUrl,
});
assert.equal(infoOnly.send, false);

const criticalOnly = buildMonitoringNotification({
  alerts,
  rows: diff.behavior.rows,
  policy: "critical_only",
  runUrl,
});
assert.equal(criticalOnly.send, true);
assert.equal(criticalOnly.subject, "ViewTrace detected 1 area that needs attention");
assert.equal(criticalOnly.text.includes("Warning — Header"), false);
assert.match(criticalOnly.text, /Critical — Checkout/);

const requiredBlocked = buildMonitoringRunDiff({
  previousRunId: "previous",
  pages: [diffMonitoringPage({
    region: "US-CA",
    regionLabel: "US · California",
    captured: true,
    verdict: "same",
    currentObservationId: "c",
    previousObservationId: "p",
  })],
  behaviorChecks: [],
  journeys: [{
    current: { ...journey("blocked", "0"), required: true, steps: [{ ...journey("blocked", "0").steps[0], status: "blocked_for_safety" }] },
    previous: journey("passed", "1"),
  }],
});
const blockedAlerts = selectMonitoringAlerts(requiredBlocked);
assert.equal(blockedAlerts[0]?.severity, "warning");
assert.equal(blockedAlerts[0] && "code" in blockedAlerts[0] ? blockedAlerts[0].code : "", "journey_blocked");

console.log("monitoring run diff ok");
