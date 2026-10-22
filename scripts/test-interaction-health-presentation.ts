import assert from "node:assert/strict";
import { presentInteractionHealth, interactionAreaId } from "../src/lib/interaction-health-presentation";
import { buildBehaviorDiff } from "../src/lib/observation-behavior-diff";
import type { BehaviorMapEntry } from "../src/lib/observation-behavior-discovery";
import type { RegionalInteractionCheckV1 } from "../src/lib/observation-regional-interaction";

assert.equal(interactionAreaId("div:nth-of-type(2) > header > div > div"), "Header");
assert.equal(interactionAreaId("header > div > div > div:nth-of-type(2)"), "Header");
assert.equal(interactionAreaId("div:nth-of-type(1) > div:nth-of-type(2) > div > form > div"), "Form");
assert.equal(interactionAreaId("region:1"), "Motion");
assert.equal(interactionAreaId("section:nth-of-type(1) > div"), "Main");
assert.equal(interactionAreaId("div:nth-of-type(2) > div > div > div:nth-of-type(1)"), "Page");

function entry(selector: string, changes: string[]): BehaviorMapEntry {
  return {
    selector,
    sources: ["style"],
    changes,
    actions: [],
    t0: null,
    t1: null,
    region: selector.includes("header") ? { x: 10, y: 8, w: 200, h: 40 } : { x: 40, y: 240, w: 300, h: 80 },
    classification: "unknown_style_change",
  };
}

const previousMap = [
  entry("div:nth-of-type(2) > header > div", ["bounding_rect"]),
  entry("header > div > div:nth-of-type(1)", ["bounding_rect"]),
  entry("region:1", ["frame"]),
];
const currentMap = [
  entry("div:nth-of-type(1) > div > a > span > div", ["bounding_rect"]),
  entry("section:nth-of-type(1) > div", ["class"]),
];

function check(map: BehaviorMapEntry[], swipe: "working" | "no_change_observed"): RegionalInteractionCheckV1 {
  return {
    schema_version: 1,
    source: "browserless_interaction_check",
    measured_at: "2026-10-22T00:00:00.000Z",
    requested_url: "https://example.com/",
    requested_region: "US-WA",
    types: [
      { type: "scroll", detected: true, status: "working" },
      { type: "menu", detected: true, status: "working" },
      { type: "accordion", detected: true, status: "working" },
      { type: "form", detected: true, status: "working" },
      { type: "swipe", detected: true, status: swipe },
    ],
    scroll: null,
    duration_ms: 11036,
    proxy_bytes: null,
    discovery: {
      scan: "full",
      samples: 2,
      detected: 5,
      verified: 4,
      blocked: 1,
      not_measured: 0,
      routes: {
        dom: { ran: true, hits: 12 },
        style: { ran: true, hits: 7 },
        animation: { ran: true, hits: 0 },
        media: { ran: true, hits: 0 },
        frame: { ran: true, hits: 0 },
        scroll: { ran: true, hits: 5 },
        actionable: { ran: true, hits: 8 },
      },
      map,
      unknown: map.map((row) => ({
        selector: row.selector,
        sources: row.sources,
        changes: row.changes,
        actions: [],
        t0: null,
        t1: null,
        region: row.region,
        shadow_path: [],
        frame_path: [],
      })),
      exploration: null,
      traversal: null,
      unreadable: [],
      transitions: null,
      region_track: null,
      environment: null,
      rendered_page: null,
      measurement_cost: null,
      temporal: null,
      exhaustion: null,
      coverage: null,
      safety: { blocked: [{ selector: "a.login", text: "Login / /login" }] },
      full_at: null,
    },
  };
}

const previous = check(previousMap, "working");
const current = check(currentMap, "no_change_observed");
const diff = buildBehaviorDiff(previous, current, "prev");
const view = presentInteractionHealth({ diff, check: current, previous });
assert.ok(view);
assert.equal(view.signal, "problem");
assert.deepEqual(view.problems.map((row) => row.type), ["swipe"]);
assert.equal(view.problems[0]?.kind, "regression");
assert.ok(view.working.includes("scroll"));
assert.ok(view.working.includes("menu"));
assert.ok(view.working.includes("form"));
assert.equal(view.working.includes("swipe"), false);
assert.equal(view.skipped.length, 1);
assert.equal(view.skipped[0]?.label, "Login");
assert.equal(view.skipped[0]?.path, "/login");
const areaIds = view.areas.map((row) => row.id);
assert.ok(areaIds.includes("Header"));
assert.ok(areaIds.includes("Main"));
assert.ok(areaIds.includes("Page"));
assert.equal(view.problems.length + view.areas.length < 10, true);
assert.ok(view.markers.some((marker) => marker.anchor === "area-Header"));
assert.equal(JSON.stringify(diff), JSON.stringify(buildBehaviorDiff(previous, current, "prev")));

const empty = presentInteractionHealth({ diff: null, check: null });
assert.equal(empty, null);

console.log("ok");
