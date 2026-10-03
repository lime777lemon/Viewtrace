import assert from "node:assert/strict";

const MULTI_REGION_RUN_MAX = 6;
const MULTI_REGION_SUGGESTED = ["JP-13", "JP", "US-CA", "GB", "AU"];

function clampRegionSelection(values, allowed, max = MULTI_REGION_RUN_MAX) {
  const seen = new Set();
  const out = [];
  for (const raw of values) {
    const value = String(raw).trim();
    if (!value || !allowed.has(value) || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
}

function suggestedRegionsForPlan(allowed) {
  return MULTI_REGION_SUGGESTED.filter((value) => allowed.has(value));
}

const allowed = new Set(["JP-13", "JP", "US-CA", "GB", "AU", "DE"]);
assert.deepEqual(clampRegionSelection(["JP", "JP", "US-CA", "ZZ"], allowed), ["JP", "US-CA"]);
assert.equal(clampRegionSelection(["JP", "US-CA", "GB", "AU", "DE", "US-CA", "FR"], allowed).length, 5);
assert.deepEqual(
  clampRegionSelection(["JP", "US-CA", "GB", "AU", "DE", "FR"], allowed, 3),
  ["JP", "US-CA", "GB"],
);
assert.deepEqual(suggestedRegionsForPlan(new Set(["JP", "DE"])), ["JP"]);
assert.deepEqual(suggestedRegionsForPlan(allowed), ["JP-13", "JP", "US-CA", "GB", "AU"]);

console.log("observation-multi-region ok");
