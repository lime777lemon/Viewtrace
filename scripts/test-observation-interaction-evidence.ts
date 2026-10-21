import assert from "node:assert/strict";
import { interactionFixtureDocument } from "../src/lib/interaction-test-fixtures";
import {
  accordionDidWork,
  classifyTimedMotion,
  elementStateChanges,
  isCookieNoiseKey,
} from "../src/lib/observation-interaction-evidence";

assert.equal(isCookieNoiseKey("#cookie-banner"), true);
assert.equal(isCookieNoiseKey("#hero-copy"), false);

const hero = classifyTimedMotion([
  { key: "#hero-copy", props: ["opacity", "transform"] },
  { key: "#cookie-banner", props: ["display"] },
]);
assert.deepEqual(hero.loadKeys, ["#hero-copy"]);
assert.deepEqual(hero.delayedKeys, ["#cookie-banner"]);

const cookieOnly = classifyTimedMotion([{ key: ".cookie-banner", props: ["display"] }]);
assert.equal(cookieOnly.loadKeys.length, 0);
assert.equal(cookieOnly.delayedKeys.length, 1);

assert.equal(
  accordionDidWork({
    expandedBefore: "false",
    expandedAfter: "true",
    panelHiddenBefore: true,
    panelHiddenAfter: false,
    panelHeightBefore: 0,
    panelHeightAfter: 48,
  }),
  true,
);
assert.equal(
  accordionDidWork({
    expandedBefore: "false",
    expandedAfter: "false",
    panelHiddenBefore: true,
    panelHiddenAfter: true,
    panelHeightBefore: 0,
    panelHeightAfter: 0,
  }),
  false,
);

const start = {
  key: "#hero-copy",
  opacity: 0,
  transform: "matrix(1, 0, 0, 1, 0, 16)",
  visibility: "visible",
  display: "block",
  x: 0,
  y: 16,
  w: 100,
  h: 20,
};
const next = { ...start, opacity: 1, transform: "none", y: 0 };
assert.ok(elementStateChanges(start, next).includes("opacity"));
assert.ok(elementStateChanges(start, next).includes("transform"));

const working = interactionFixtureDocument("all", "working");
assert.match(working, /id="modal-open"/);
assert.match(working, /id="hero-copy"/);
assert.match(working, /id="acc-panel"/);
assert.match(working, /data-reveal/);
const absent = interactionFixtureDocument("all", "absent");
assert.doesNotMatch(absent, /id="modal-open"/);
const unsafe = interactionFixtureDocument("modal", "unsafe");
assert.match(unsafe, /Confirm purchase/);

console.log("ok");
