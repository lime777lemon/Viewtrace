import assert from "node:assert/strict";
import {
  buildRegionalCheckFromSession,
  parseRegionalInteractionCheckFromUnknown,
  wrapScrollAsRegionalCheck,
} from "../src/lib/observation-regional-interaction";
import {
  buildScrollInteractionFromPayload,
  decideScrollStatus,
  elementPropertyChanges,
  summarizeScrollCheckpoints,
  type ScrollCheckpointSample,
  type ScrollElementSample,
} from "../src/lib/observation-scroll-interaction";

function el(partial: Partial<ScrollElementSample> & Pick<ScrollElementSample, "key">): ScrollElementSample {
  return {
    transform: "none",
    opacity: 1,
    visibility: "visible",
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    ...partial,
  };
}

function point(
  frac: number,
  scrollY: number,
  elements: ScrollElementSample[],
): ScrollCheckpointSample {
  return { frac, scroll_y: scrollY, elements };
}

const startPhoto = el({
  key: "img.photo",
  transform: "matrix(1, 0, 0, 1, -8, -146)",
  opacity: 1,
});
const midPhoto = el({
  key: "img.photo",
  transform: "matrix(1, 0, 0, 1, -80, -90)",
  opacity: 1,
});
const copyHidden = el({ key: "h2.copy", opacity: 0, visibility: "hidden", y: 16 });
const copyShown = el({ key: "h2.copy", opacity: 1, visibility: "visible", y: 0 });

assert.deepEqual(elementPropertyChanges(startPhoto, midPhoto), ["transform"]);
assert.ok(elementPropertyChanges(copyHidden, copyShown).includes("opacity"));
assert.ok(elementPropertyChanges(copyHidden, copyShown).includes("visibility"));

const unchanged = [
  point(0, 0, [el({ key: startPhoto.key, transform: startPhoto.transform, y: 0 })]),
  point(0.5, 800, [el({ key: startPhoto.key, transform: startPhoto.transform, y: -800 })]),
  point(1, 1600, [el({ key: startPhoto.key, transform: startPhoto.transform, y: -1600 })]),
];
assert.equal(summarizeScrollCheckpoints(unchanged).changedElements, 0);
assert.equal(decideScrollStatus({ sectionFound: true, checkpoints: unchanged }).status, "no_change_observed");
assert.equal(decideScrollStatus({ sectionFound: true, checkpoints: unchanged }).reason, "no_rendered_change");

const working = [
  point(0, 0, [startPhoto, copyHidden]),
  point(0.5, 1050, [midPhoto, copyShown]),
  point(1, 2100, [
    el({ key: "img.photo", transform: "matrix(1, 0, 0, 1, -160, 20)" }),
    copyShown,
  ]),
];
assert.equal(decideScrollStatus({ sectionFound: true, checkpoints: working }).status, "working");
const summary = summarizeScrollCheckpoints(working);
assert.equal(summary.scrollEnd - summary.scrollStart, 2100);
assert.ok(summary.changedElements >= 2);
assert.ok(summary.changes.includes("transform"));
assert.ok(summary.changes.includes("opacity"));

assert.equal(
  decideScrollStatus({ sectionFound: false, checkpoints: [] }).reason,
  "no_scroll_section",
);

const viewportOnly = [
  point(0, 0, [el({ key: "p.copy", y: 400 })]),
  point(1, 900, [el({ key: "p.copy", y: -500 })]),
];
assert.equal(
  decideScrollStatus({ sectionFound: true, checkpoints: viewportOnly }).status,
  "no_change_observed",
);

const built = buildScrollInteractionFromPayload({
  payload: { section_found: true, reduced_motion: false, checkpoints: working },
  requestedUrl: "https://example.com/",
  requestedRegion: "JP-13",
  measuredAt: "2026-10-20T00:00:00.000Z",
  durationMs: 8000,
  proxyBytes: 12,
});
assert.equal(built.status, "working");
assert.equal(built.type, "scroll");
assert.equal(built.requested_region, "JP-13");
assert.equal(built.scroll_end, 2100);

const check = wrapScrollAsRegionalCheck(built);
assert.equal(check.types.find((row) => row.type === "scroll")?.status, "working");
assert.equal(check.types.find((row) => row.type === "modal")?.status, "not_measured");
assert.equal(parseRegionalInteractionCheckFromUnknown(built)?.types[0]?.status, "working");

const session = buildRegionalCheckFromSession({
  raw: {
    types: [
      { type: "hover", detected: true, status: "working" },
      { type: "modal", detected: true, status: "no_change_observed" },
      { type: "form", detected: true, status: "blocked_for_safety" },
      { type: "video", detected: false, status: "not_detected" },
      { type: "menu", detected: true, status: "failed" },
    ],
    scroll: { section_found: true, reduced_motion: false, checkpoints: working },
  },
  requestedUrl: "https://example.com/",
  requestedRegion: "US-CA",
  measuredAt: "2026-10-20T00:00:00.000Z",
  durationMs: 12000,
  proxyBytes: 8,
});
assert.equal(session.types.find((row) => row.type === "scroll")?.status, "working");
assert.ok(session.types.find((row) => row.type === "scroll")?.evidence?.changes?.includes("transform"));
assert.equal(session.types.find((row) => row.type === "scroll")?.evidence?.selector, "img.photo");
assert.equal(session.types.find((row) => row.type === "hover")?.status, "working");
assert.equal(session.types.find((row) => row.type === "modal")?.status, "no_change_observed");
assert.equal(session.types.find((row) => row.type === "form")?.status, "blocked_for_safety");
assert.equal(session.types.find((row) => row.type === "video")?.status, "not_detected");
assert.equal(session.types.find((row) => row.type === "menu")?.status, "failed");
assert.equal(session.types.find((row) => row.type === "carousel")?.status, "not_measured");
assert.equal(session.types.find((row) => row.type === "js_animation")?.status, "not_measured");
assert.notEqual(session.types.find((row) => row.type === "video")?.status, "working");

const gsapPresent = buildRegionalCheckFromSession({
  raw: {
    types: [
      { type: "js_animation", detected: true, status: "no_change_observed" },
      { type: "load_animation", detected: true, status: "working" },
      { type: "canvas", detected: true, status: "no_change_observed" },
    ],
    scroll: { section_found: true, reduced_motion: false, checkpoints: working },
  },
  requestedUrl: "https://example.com/",
  requestedRegion: "US-CA",
  measuredAt: "2026-10-20T00:00:00.000Z",
  durationMs: 12000,
  proxyBytes: 8,
});
assert.equal(gsapPresent.types.find((row) => row.type === "js_animation")?.status, "no_change_observed");
assert.equal(gsapPresent.types.find((row) => row.type === "load_animation")?.status, "working");
assert.equal(gsapPresent.types.find((row) => row.type === "canvas")?.status, "no_change_observed");

const parsedSession = parseRegionalInteractionCheckFromUnknown(session);
assert.equal(parsedSession?.types.find((row) => row.type === "hover")?.status, "working");
assert.equal(parsedSession?.types.find((row) => row.type === "form")?.status, "blocked_for_safety");

console.log("ok");
