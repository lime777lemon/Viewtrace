import assert from "node:assert/strict";
import { groupBehaviorFindings, type BehaviorEvidenceRow } from "../src/lib/behavior-findings";
import { monitoringDiffScope, monitoringStatusReasons } from "../src/lib/monitoring-run";
import type { BehaviorMapEntry } from "../src/lib/observation-behavior-discovery";

function layout(selector: string, changes: string[]): BehaviorMapEntry {
  return {
    selector,
    sources: ["style"],
    changes,
    actions: [],
    t0: null,
    t1: null,
    region: null,
    classification: "unknown_style_change",
  };
}

const header = [
  layout("header a.logo", ["bounding_rect"]),
  layout("header .nav-link", ["display"]),
  layout("header button.menu", ["bounding_rect", "display"]),
  layout("header img.mark", ["visibility"]),
  layout("header span.tag", ["bounding_rect"]),
  layout("header .cta", ["display"]),
];
const blocked = [
  { selector: "a.login", text: "Login" },
  { selector: "button.login", text: "Login / /login" },
  { selector: "a.signup-1", text: "Sign up" },
  { selector: "a.signup-2", text: "Sign up" },
  { selector: "a.signup-3", text: "Sign up / /signup" },
  { selector: "button.signup-4", text: "Sign up" },
  { selector: "button.signup-5", text: "Sign up" },
];
const headerBefore = JSON.stringify(header);
const blockedBefore = JSON.stringify(blocked);
const findings = groupBehaviorFindings({ map: header, blocked });
assert.equal(JSON.stringify(header), headerBefore);
assert.equal(JSON.stringify(blocked), blockedBefore);
assert.equal(findings.layout.length, 1);
assert.equal(findings.layout[0]?.title, "Header changed");
assert.equal(findings.layout[0]?.count, 6);
assert.equal(findings.layout[0]?.summary, "layout_visibility");
assert.equal(findings.layout[0]?.evidence.length, 6);
assert.deepEqual(
  findings.layout[0]?.evidence.map((row) => row.selector),
  header.map((row) => row.selector),
);
assert.equal(findings.protected.length, 2);
assert.equal(findings.protected[0]?.label, "Sign up");
assert.equal(findings.protected[0]?.count, 5);
assert.equal(findings.protected[0]?.evidence.length, 5);
assert.equal(findings.protected[1]?.label, "Login");
assert.equal(findings.protected[1]?.count, 2);
assert.equal(findings.protected[1]?.evidence.length, 2);
assert.equal(
  findings.protected.reduce((sum, row) => sum + row.evidence.length, 0),
  blocked.length,
);

const mixed = groupBehaviorFindings({
  map: [
    layout("header a", ["bounding_rect"]),
    layout("main section.hero", ["display"]),
    layout(".card", ["bounding_rect"]),
    { ...layout("button.buy", ["display"]), classification: "actionable" },
  ],
  blocked: [],
});
assert.deepEqual(mixed.layout.map((row) => row.section), ["Header", "Main"]);
assert.equal(mixed.ungrouped.length, 1);
assert.equal(mixed.ungrouped[0]?.selector, ".card");
const ungrouped: BehaviorEvidenceRow[] = mixed.ungrouped;
assert.equal(ungrouped[0]?.changes[0], "bounding_rect");

const empty = groupBehaviorFindings({ map: [], blocked: [] });
assert.equal(empty.layout.length, 0);
assert.equal(empty.protected.length, 0);

const reasons = monitoringStatusReasons({
  pages: [{ label: "US · California", fact: "changed" }],
  journeys: [{ name: "Monitoring proof", status: "passed" }],
  newUnknown: false,
});
assert.deepEqual(reasons, [{ code: "screenshot_differs", region: "US · California" }]);

assert.deepEqual(
  monitoringStatusReasons({
    pages: [{ label: "US · California", fact: "same" }],
    journeys: [{ name: "Monitoring proof", status: "passed" }],
    newUnknown: false,
  }),
  [],
);

assert.deepEqual(monitoringDiffScope({ targetUrl: " https://viewtrace.net/ ", region: " US-CA " }), {
  targetUrl: "https://viewtrace.net/",
  region: "US-CA",
  environment: null,
});
assert.equal(
  monitoringDiffScope({ targetUrl: "https://viewtrace.net/", region: "US-CA", environment: "desktop" }).environment,
  "desktop",
);

console.log("behavior findings ok");
