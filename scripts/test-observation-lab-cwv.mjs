import assert from "node:assert/strict";

function labCwvRatingMs(value, goodMax, needsMax) {
  if (value == null || !Number.isFinite(value) || value < 0) return null;
  if (value <= goodMax) return "good";
  if (value <= needsMax) return "needs_improvement";
  return "poor";
}

function labCwvRatingCls(value) {
  if (value == null || !Number.isFinite(value) || value < 0) return null;
  if (value <= 0.1) return "good";
  if (value <= 0.25) return "needs_improvement";
  return "poor";
}

function auditNumeric(audits, id) {
  const row = audits[id];
  const v = row?.numericValue;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function parseLabCwvFromLighthouse(raw) {
  const wrapped = raw?.data && typeof raw.data === "object" ? raw.data : raw;
  const lhr = wrapped?.lhr && typeof wrapped.lhr === "object" ? wrapped.lhr : wrapped;
  const audits = lhr?.audits && typeof lhr.audits === "object" ? lhr.audits : {};
  const lcp = auditNumeric(audits, "largest-contentful-paint");
  const cls = auditNumeric(audits, "cumulative-layout-shift");
  const tbt = auditNumeric(audits, "total-blocking-time");
  const fcp = auditNumeric(audits, "first-contentful-paint");
  const inp = auditNumeric(audits, "interaction-to-next-paint");
  const hasAny = [lcp, cls, tbt, fcp, inp].some((v) => v != null);
  return {
    lcp_ms: lcp != null ? Math.round(lcp) : null,
    cls: cls != null ? Math.round(cls * 1000) / 1000 : null,
    tbt_ms: tbt != null ? Math.round(tbt) : null,
    fcp_ms: fcp != null ? Math.round(fcp) : null,
    inp_ms: inp != null ? Math.round(inp) : null,
    error: hasAny ? null : "no_audits",
  };
}

function countIsoTimestampsThisUtcMonth(timestamps, now) {
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0);
  return timestamps.filter((row) => {
    const t = Date.parse(row);
    return Number.isFinite(t) && t >= start;
  }).length;
}

assert.equal(labCwvRatingMs(2400, 2500, 4000), "good");
assert.equal(labCwvRatingMs(2500, 2500, 4000), "good");
assert.equal(labCwvRatingMs(2501, 2500, 4000), "needs_improvement");
assert.equal(labCwvRatingMs(4000, 2500, 4000), "needs_improvement");
assert.equal(labCwvRatingMs(4001, 2500, 4000), "poor");
assert.equal(labCwvRatingCls(0.1), "good");
assert.equal(labCwvRatingCls(0.11), "needs_improvement");
assert.equal(labCwvRatingCls(0.26), "poor");
assert.equal(labCwvRatingMs(null, 2500, 4000), null);

const wrapped = parseLabCwvFromLighthouse({
  lhr: {
    audits: {
      "largest-contentful-paint": { numericValue: 1800.4 },
      "cumulative-layout-shift": { numericValue: 0.0421 },
      "total-blocking-time": { numericValue: 150 },
      "first-contentful-paint": { numericValue: 900 },
    },
  },
});
assert.equal(wrapped.lcp_ms, 1800);
assert.equal(wrapped.cls, 0.042);
assert.equal(wrapped.tbt_ms, 150);
assert.equal(wrapped.fcp_ms, 900);
assert.equal(wrapped.inp_ms, null);
assert.equal(wrapped.error, null);

const fromData = parseLabCwvFromLighthouse({
  data: {
    audits: {
      "largest-contentful-paint": { numericValue: 2100 },
      "cumulative-layout-shift": { numericValue: 0.01 },
    },
  },
});
assert.equal(fromData.lcp_ms, 2100);
assert.equal(fromData.cls, 0.01);

const empty = parseLabCwvFromLighthouse({ audits: {} });
assert.equal(empty.error, "no_audits");

const now = new Date(Date.UTC(2026, 9, 12));
assert.equal(
  countIsoTimestampsThisUtcMonth(
    ["2026-09-30T23:59:59.000Z", "2026-10-01T00:00:00.000Z", "2026-10-12T01:00:00.000Z"],
    now,
  ),
  2,
);

function labCwvBarPercents(value, goodMax, needsMax) {
  const scale = Math.max(needsMax * 1.6, value, Number.EPSILON);
  return {
    goodEnd: Math.min(100, (goodMax / scale) * 100),
    needsEnd: Math.min(100, (needsMax / scale) * 100),
    valueEnd: Math.min(100, (value / scale) * 100),
  };
}

const lcpBar = labCwvBarPercents(5580, 2500, 4000);
assert.ok(lcpBar.valueEnd > lcpBar.needsEnd);
assert.ok(lcpBar.goodEnd < lcpBar.needsEnd);
const clsBar = labCwvBarPercents(0.006, 0.1, 0.25);
assert.ok(clsBar.valueEnd < clsBar.goodEnd);

console.log("test-observation-lab-cwv: ok");
