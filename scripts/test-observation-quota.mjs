import assert from "node:assert/strict";

function remainingObservations(used, limit) {
  const u = Math.floor(used);
  const lim = Math.floor(limit);
  if (!Number.isFinite(u) || !Number.isFinite(lim) || lim <= 0) return 0;
  return Math.max(0, lim - Math.max(0, u));
}

function canStartObservationBatch(remaining, required) {
  const req = Math.floor(required);
  const rem = Math.floor(remaining);
  if (!Number.isFinite(req) || !Number.isFinite(rem) || req <= 0) return false;
  return rem >= req;
}

function estimateMonthlyWatchObservations(frequency, repeatCount, regionCount = 1) {
  const repeat = Math.max(1, Math.floor(Number(repeatCount)) || 1);
  const regions = Math.max(1, Math.floor(Number(regionCount)) || 1);
  if (frequency === "daily") return 30 * repeat * regions;
  if (frequency === "weekly") return 4 * repeat * regions;
  return repeat * regions;
}

assert.equal(remainingObservations(480, 500), 20);
assert.equal(remainingObservations(500, 500), 0);
assert.equal(remainingObservations(0, 1500), 1500);
assert.equal(remainingObservations(10, 0), 0);

assert.equal(canStartObservationBatch(20, 30), false);
assert.equal(canStartObservationBatch(30, 30), true);
assert.equal(canStartObservationBatch(20, 1), true);
assert.equal(canStartObservationBatch(0, 1), false);
assert.equal(canStartObservationBatch(20, 0), false);

assert.equal(estimateMonthlyWatchObservations("daily", 1, 1), 30);
assert.equal(estimateMonthlyWatchObservations("daily", 1, 3), 90);
assert.equal(estimateMonthlyWatchObservations("daily", 4, 1), 120);
assert.equal(estimateMonthlyWatchObservations("weekly", 1, 1), 4);
assert.equal(estimateMonthlyWatchObservations("monthly", 1, 1), 1);
assert.equal(estimateMonthlyWatchObservations("daily", 1, 5 * 3), 450);

console.log("observation-quota ok");
