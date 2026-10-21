import assert from "node:assert/strict";
import {
  INTERACTION_CHECK_TYPES,
  type InteractionCheckType,
} from "../src/lib/observation-regional-interaction";
import {
  INTERACTION_COMPLETION,
  INTERACTION_COMPLETION_GATES,
  deriveInteractionCompletion,
  deriveSafetyLayer,
  interactionTypeComplete,
  type RecordedInteractionRun,
} from "../src/lib/interaction-completion";
import { RECORDED_INTERACTION_RUNS } from "../src/lib/interaction-completion-runs";
import { classifyBehaviorTransition, diffBehaviorMap } from "../src/lib/observation-behavior-diff";
import { interactionScanMode } from "../src/lib/observation-watch-interaction";
import { buildCoverageManifest, emptyDiscoveryRoutes, mergeBehaviorObservations, refineActionChains, summarizeBehaviorScan } from "../src/lib/observation-behavior-discovery";
import {
  EXPENSIVE_INTERACTION_TYPES,
  scheduleInteractionTypes,
  summarizeInteractionMeasurement,
} from "../src/lib/observation-interaction-plan";
import { interactionFixtureDocument, INTERACTION_FIXTURE_KINDS } from "../src/lib/interaction-test-fixtures";
import { interactionEvidenceCard } from "../src/lib/interaction-evidence-card";

const detected = INTERACTION_CHECK_TYPES.filter((type) => type === "carousel" || type === "webgl" || type === "hover");
const order = scheduleInteractionTypes({
  detected,
  prior: [{ type: "carousel", status: "working", detected: true }],
});
assert.deepEqual(order, ["carousel", "hover", "webgl"]);
assert.ok(order.indexOf("carousel") < order.indexOf("webgl"));
assert.equal(order.includes("canvas" as InteractionCheckType), false);

const fresh = scheduleInteractionTypes({
  detected: ["hover", "canvas", "menu"],
});
assert.deepEqual(fresh, ["hover", "menu", "canvas"]);
assert.ok(EXPENSIVE_INTERACTION_TYPES.includes("canvas"));
assert.equal(EXPENSIVE_INTERACTION_TYPES.includes("hover" as never), false);

const summary = summarizeInteractionMeasurement([
  { status: "working" },
  { status: "no_change_observed" },
  { status: "not_detected" },
  { status: "not_measured", evidence: { note: "execution time limit" } },
]);
assert.deepEqual(summary, {
  total: 4,
  measured: 2,
  notDetected: 1,
  notMeasured: 1,
  timeLimited: 1,
});
assert.equal(classifyBehaviorTransition("working", "not_measured"), "not_comparable");
assert.notEqual(classifyBehaviorTransition("working", "not_measured"), "regression");

const emptyLedger = deriveInteractionCompletion([]);
for (const type of INTERACTION_CHECK_TYPES) {
  assert.equal(Object.keys(INTERACTION_COMPLETION[type]).length, INTERACTION_COMPLETION_GATES.length);
  for (const gate of INTERACTION_COMPLETION_GATES) {
    assert.equal(emptyLedger[type][gate], false);
    assert.equal(
      INTERACTION_COMPLETION[type][gate],
      deriveInteractionCompletion(RECORDED_INTERACTION_RUNS)[type][gate],
    );
  }
  assert.equal(
    interactionTypeComplete(type),
    INTERACTION_COMPLETION_GATES.every((gate) => INTERACTION_COMPLETION[type][gate]),
  );
}

function recorded(
  partial: Partial<RecordedInteractionRun> & Pick<RecordedInteractionRun, "type" | "region" | "mode">,
): RecordedInteractionRun {
  return {
    ok: true,
    status: "working",
    detected: true,
    selector: true,
    state: true,
    frames: false,
    action: true,
    changed: true,
    restore: "ok",
    ...partial,
  };
}

const scrollSample: RecordedInteractionRun[] = [
  recorded({ type: "scroll", region: "US-CA", mode: "working" }),
  recorded({ type: "scroll", region: "US-FL", mode: "working" }),
  recorded({ type: "scroll", region: "JP-13", mode: "working" }),
  recorded({
    type: "scroll",
    region: "US-CA",
    mode: "broken",
    status: "no_change_observed",
    selector: false,
    state: false,
    action: true,
  }),
  recorded({
    type: "scroll",
    region: "US-CA",
    mode: "absent",
    status: "not_detected",
    detected: false,
    selector: false,
    state: false,
    action: false,
    restore: null,
  }),
  recorded({
    type: "scroll",
    region: "US-CA",
    mode: "unsafe",
    status: "blocked_for_safety",
    detected: true,
    selector: false,
    state: false,
    action: false,
    restore: null,
  }),
];
const scrollGates = deriveInteractionCompletion(scrollSample).scroll;
assert.ok(INTERACTION_COMPLETION_GATES.every((gate) => scrollGates[gate]));

const noEvidence = deriveInteractionCompletion([
  recorded({ type: "scroll", region: "US-CA", mode: "working", selector: false, state: false, frames: false }),
]).scroll;
assert.equal(noEvidence.working_fixture, false);
assert.equal(noEvidence.evidence, false);
assert.equal(noEvidence.us_ca, false);

const identical = deriveInteractionCompletion([
  recorded({ type: "modal", region: "US-CA", mode: "working", changed: false }),
]).modal;
assert.equal(identical.working_fixture, false);
assert.equal(identical.evidence, false);
assert.equal(identical.verify, false);
assert.equal((INTERACTION_COMPLETION_GATES as readonly string[]).includes("safety"), false);

const scrollWithoutUnsafe = scrollSample.filter((run) => run.mode !== "unsafe");
assert.ok(INTERACTION_COMPLETION_GATES.every((gate) => deriveInteractionCompletion(scrollWithoutUnsafe).scroll[gate]));
assert.equal(deriveSafetyLayer(scrollWithoutUnsafe).unsafe_blocked, false);
assert.equal(deriveSafetyLayer(scrollSample).unsafe_blocked, true);
assert.equal(classifyBehaviorTransition("working", "playback_not_verifiable"), "not_comparable");

const day = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-10-21T00:00:00.000Z");
assert.equal(interactionScanMode({ hasPrior: false, lastFullDiscoveryAt: null, nowMs: now, htmlChanged: false }), "full");
assert.equal(
  interactionScanMode({ hasPrior: true, lastFullDiscoveryAt: new Date(now - 8 * day).toISOString(), nowMs: now, htmlChanged: false }),
  "full",
);
assert.equal(
  interactionScanMode({ hasPrior: true, lastFullDiscoveryAt: new Date(now - day).toISOString(), nowMs: now, htmlChanged: false }),
  "light",
);
assert.equal(
  interactionScanMode({ hasPrior: true, lastFullDiscoveryAt: new Date(now - day).toISOString(), nowMs: now, htmlChanged: true }),
  "full",
);
assert.equal(interactionScanMode({ hasPrior: true, lastFullDiscoveryAt: null, nowMs: now, htmlChanged: false }), "full");

const behaviorMap = mergeBehaviorObservations(
  [
    { selector: "#hero", source: "style", changes: ["opacity"], t0: { opacity: 0 }, t1: { opacity: 1 }, region: null },
    { selector: "#hero", source: "animation", changes: ["animation"], t0: null, t1: { anim: 40 }, region: null },
    { selector: "#hero", source: "actionable", changes: [], t0: null, t1: { text: "Hero" }, region: null },
    { selector: "#mystery", source: "dom", changes: ["childList"], t0: null, t1: { kind: "childList" }, region: null },
    { selector: "#buy", source: "actionable", changes: [], t0: null, t1: { text: "Buy" }, region: null },
  ],
  [{ type: "css_animation", selector: "#hero", changes: ["opacity"] }],
);
assert.equal(behaviorMap.length, 3);
assert.deepEqual(behaviorMap.find((row) => row.selector === "#hero")?.sources, ["style", "animation", "actionable"]);
assert.equal(behaviorMap.find((row) => row.selector === "#hero")?.classification, "css_animation");
assert.equal(behaviorMap.find((row) => row.selector === "#mystery")?.classification, "unknown_dom_change");
const unknownKinds = mergeBehaviorObservations(
  [
    { selector: "#move", source: "frame", changes: ["frame"], t0: { hash: "a" }, t1: { hash: "b" }, region: { x: 0, y: 0, w: 20, h: 20 } },
    { selector: "#fade", source: "style", changes: ["opacity"], t0: { opacity: 1 }, t1: { opacity: 0 }, region: null },
    { selector: "#clip", source: "media", changes: ["currentTime"], t0: { currentTime: 0 }, t1: { currentTime: 1 }, region: null },
  ],
  [],
);
assert.equal(unknownKinds.find((row) => row.selector === "#move")?.classification, "unknown_rendered_motion");
assert.equal(unknownKinds.find((row) => row.selector === "#fade")?.classification, "unknown_style_change");
assert.equal(unknownKinds.find((row) => row.selector === "#clip")?.classification, "unknown_media_change");
assert.deepEqual(
  summarizeBehaviorScan(
    [
      { selector: "#hero", sources: ["style"], changes: ["opacity"], actions: ["click"], t0: null, t1: null, region: null, classification: "css_animation" },
      { selector: "#mystery", sources: ["dom"], changes: ["childList"], actions: [], t0: null, t1: null, region: null, classification: "unknown_dom_change" },
      { selector: "#buy", sources: ["actionable"], changes: [], actions: [], t0: null, t1: null, region: null, classification: "actionable" },
    ],
    [{ type: "css_animation", status: "working" }],
    1,
  ),
  { discovered: 2, verified: 1, unknown: 1, blocked: 1 },
);
const mapDiff = diffBehaviorMap({
  transitions: [
    { type: "carousel", previous: "working", current: "no_change_observed", kind: "regression" },
    { type: "scroll_reveal", previous: "working", current: "not_detected", kind: "alert_candidate" },
    { type: "video", previous: "working", current: "working", kind: "unchanged" },
    { type: "form", previous: "not_detected", current: "not_detected", kind: "unchanged" },
  ],
  previousUnknown: [],
  currentUnknown: [{ selector: "#mystery", classification: "unknown_rendered_motion", changes: ["frame"] }],
  previousMapMeasured: true,
});
assert.deepEqual(
  mapDiff.map((row) => row.section),
  ["new", "changed", "missing", "unchanged"],
);
assert.equal(mapDiff[0]?.label, "Unknown visual motion detected");
assert.equal(mapDiff[1]?.label, "Carousel");
assert.equal(mapDiff[2]?.detail, "Previously verified → Not detected");
assert.equal(mapDiff[3]?.label, "Video");
assert.equal(behaviorMap.find((row) => row.selector === "#buy")?.classification, "actionable");
const explored = mergeBehaviorObservations(
  [
    { selector: "#details-dialog", source: "dom", changes: ["open"], t0: { open: "0" }, t1: { open: "1" }, region: null, action: "click" },
    { selector: "#hidden-clip", source: "media", changes: ["paused"], t0: null, t1: { paused: "0" }, region: null, action: "click" },
  ],
  [],
);
assert.equal(explored.find((row) => row.selector === "#details-dialog")?.classification, "unknown_dom_change");
assert.deepEqual(explored.find((row) => row.selector === "#details-dialog")?.actions, ["click"]);
assert.equal(explored.find((row) => row.selector === "#hidden-clip")?.classification, "unknown_media_change");
const surfaces = mergeBehaviorObservations(
  [
    {
      selector: "#copy",
      source: "style",
      changes: ["opacity"],
      t0: { opacity: "0" },
      t1: { opacity: "1" },
      region: null,
      action: "click",
      shadow_path: ["#host"],
      frame_path: [],
    },
    {
      selector: "#copy",
      source: "style",
      changes: ["opacity"],
      t0: { opacity: "0" },
      t1: { opacity: "1" },
      region: null,
      action: "click",
      shadow_path: [],
      frame_path: ["#same-frame"],
    },
  ],
  [{ type: "css_animation", selector: "#copy", changes: ["opacity"] }],
);
assert.equal(surfaces.length, 2);
assert.equal(surfaces.every((row) => row.classification === "unknown_style_change"), true);
assert.deepEqual(surfaces.find((row) => row.shadow_path?.length)?.shadow_path, ["#host"]);
assert.deepEqual(surfaces.find((row) => row.frame_path?.length)?.frame_path, ["#same-frame"]);
const chains = refineActionChains({
  baseline_paths: ["GET /analytics/ping"],
  baseline_messages: ["console_error:baseline analytics"],
  transitions: [
    {
      action_id: "a1",
      action: "click",
      selector: "#pricing-details",
      state_before: "aa",
      state_after: "bb",
      started_at: 1000,
      rendered: [{ selector: "#pricing-panel", changes: ["hidden"], shadow_path: [], frame_path: [] }],
      network: [
        { method: "GET", path: "/analytics/ping", status: 200, failed: false, duration_ms: 20 },
        { method: "OPTIONS", path: "/api/pricing", status: 204, failed: false, duration_ms: 2 },
        { method: "GET", path: "/api/pricing", status: 200, failed: false, duration_ms: 184 },
      ],
      runtime: [{ kind: "console_error", message: "baseline analytics" }],
    },
    {
      action_id: "a2",
      action: "click",
      selector: "#load-more",
      state_before: "bb",
      state_after: "bb",
      started_at: 1400,
      rendered: [],
      network: [
        { method: "POST", path: "/api/items", status: 500, failed: true, duration_ms: 40 },
        { method: "GET", path: "/api/pricing", status: 200, failed: false, duration_ms: 1 },
      ],
      runtime: [{ kind: "console_error", message: "items failed" }],
    },
  ],
});
assert.ok(chains);
assert.equal(chains?.[0]?.network.length, 1);
assert.equal(chains?.[0]?.network[0]?.path, "/api/pricing");
assert.equal(chains?.[0]?.network[0]?.status, 200);
assert.equal(chains?.[0]?.runtime.length, 0);
assert.equal(chains?.[0]?.rendered[0]?.selector, "#pricing-panel");
assert.equal(chains?.[1]?.rendered.length, 0);
assert.equal(chains?.[1]?.network.length, 1);
assert.equal(chains?.[1]?.network[0]?.status, 500);
assert.equal(chains?.[1]?.runtime[0]?.message, "items failed");
const ranked = mergeBehaviorObservations(
  [{ selector: "#hero", source: "animation", changes: ["opacity", "animation"], t0: null, t1: { opacity: 1 }, region: null }],
  [
    { type: "load_animation", selector: "#hero", changes: ["opacity", "animation"] },
    { type: "css_animation", selector: "#hero", changes: ["opacity", "animation"] },
  ],
);
assert.equal(ranked[0]?.classification, "css_animation");

for (const kind of INTERACTION_FIXTURE_KINDS) {
  if (kind === "all") continue;
  const working = interactionFixtureDocument(kind, "working");
  const broken = interactionFixtureDocument(kind, "broken");
  const absent = interactionFixtureDocument(kind, "absent");
  assert.notEqual(working, absent);
  assert.match(absent, /No interactive widgets/);
  assert.doesNotMatch(absent, /id="scroll-copy"|id="tab-b"|id="clip"/);
  assert.notEqual(working, broken);
}

const scrollCard = interactionEvidenceCard("scroll", {
  actions: ["SCROLL"],
  selector: "#hero-copy",
  t0: { opacity: 0, transform: "translateY(16px)" },
  t1: { opacity: 1, transform: "none" },
  changes: ["opacity", "transform"],
  restore: "ok",
});
assert.equal(scrollCard?.beforeLabel, "Before");
assert.ok(scrollCard?.facets.some((row) => row.label === "opacity" && row.before === "0" && row.after === "1"));
assert.ok(scrollCard?.facets.some((row) => row.label === "transform" && row.after === "none"));
assert.equal(scrollCard?.restore, "ok");

const carouselCard = interactionEvidenceCard("carousel", {
  actions: ["SAFE_CLICK"],
  t0: { index: 1 },
  t1: { index: 1 },
  restore: "ok",
});
assert.equal(carouselCard?.facets[0]?.before, "1");
assert.equal(carouselCard?.facets[0]?.after, "1");
assert.equal(interactionEvidenceCard("hover", null), null);

const routes = emptyDiscoveryRoutes();
for (const source of Object.keys(routes) as Array<keyof typeof routes>) routes[source] = { ran: true, hits: 1 };
const scopeEnvironment = {
  device_class: "desktop" as const,
  viewport: { width: 1440, height: 900 },
  pointer: "mouse" as const,
  touch: false,
  locale: "en-US",
  timezone: "America/Los_Angeles",
  prefers_reduced_motion: false,
};
const scopeTemporal = { ran: true, window_ms: 10000, completed_through_ms: 10000, reason: "still_active" as const, behaviors: [] };
const measured = buildCoverageManifest({
  region: "US-CA",
  environment: scopeEnvironment,
  temporal: scopeTemporal,
  exhaustion: { status: "completed", reason: "no_unexplored_safe_candidates", discovered: 2, executed: 2, unexplored: 0, unexplored_reasons: [] },
  routes,
  visualRan: true,
  closedShadow: 1,
  crossOriginFrames: 0,
  blocked: 0,
});
assert.equal(measured?.statement, "measured_within_scope");
assert.equal(measured?.exploration, "exhausted");
assert.equal(measured?.boundaries.unexplored_candidates, 0);
const depthStopped = buildCoverageManifest({
  region: "US-CA",
  environment: scopeEnvironment,
  temporal: scopeTemporal,
  routes,
  visualRan: true,
  closedShadow: 1,
  crossOriginFrames: 0,
  blocked: 0,
  exhaustion: {
    status: "incomplete",
    reason: "depth_limit",
    discovered: 4,
    executed: 3,
    unexplored: 1,
    unexplored_reasons: [{ selector: "#d3", reason: "depth_limit" }],
  },
});
assert.equal(depthStopped?.statement, "scan_recorded");
assert.equal(depthStopped?.exploration, "incomplete");
assert.equal(depthStopped?.boundaries.unexplored_candidates, 1);
assert.equal(buildCoverageManifest({
  environment: null,
  temporal: null,
  exhaustion: null,
  routes,
  visualRan: false,
  closedShadow: 0,
  crossOriginFrames: 0,
  blocked: 0,
}), null);

console.log("ok");
