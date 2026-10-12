import assert from "node:assert/strict";

function p75Ms(metric) {
  const p = metric?.percentiles?.p75;
  const n = typeof p === "number" ? p : typeof p === "string" ? Number(p) : NaN;
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function p75Cls(metric) {
  const p = metric?.percentiles?.p75;
  const n = typeof p === "number" ? p : typeof p === "string" ? Number(p) : NaN;
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 1000) / 1000;
}

function parseCruxRecord(raw, fallbackScope) {
  const record = raw?.record && typeof raw.record === "object" ? raw.record : raw;
  const metrics = record?.metrics && typeof record.metrics === "object" ? record.metrics : {};
  const key = record?.key && typeof record.key === "object" ? record.key : {};
  const keyUrl = typeof key.url === "string" ? key.url : null;
  const keyOrigin = typeof key.origin === "string" ? key.origin : null;
  const scope = keyUrl ? "url" : keyOrigin ? "origin" : fallbackScope;
  return {
    scope,
    crux_key: keyUrl ?? keyOrigin,
    inp_ms: p75Ms(metrics.interaction_to_next_paint),
    lcp_ms: p75Ms(metrics.largest_contentful_paint),
    cls: p75Cls(metrics.cumulative_layout_shift),
  };
}

const urlRecord = parseCruxRecord(
  {
    record: {
      key: { url: "https://example.com/pricing" },
      metrics: {
        interaction_to_next_paint: { percentiles: { p75: 184.4 } },
        largest_contentful_paint: { percentiles: { p75: 2100 } },
        cumulative_layout_shift: { percentiles: { p75: 0.0421 } },
      },
    },
  },
  "url",
);
assert.equal(urlRecord.scope, "url");
assert.equal(urlRecord.inp_ms, 184);
assert.equal(urlRecord.lcp_ms, 2100);
assert.equal(urlRecord.cls, 0.042);

const originRecord = parseCruxRecord(
  {
    record: {
      key: { origin: "https://example.com" },
      metrics: {
        interaction_to_next_paint: { percentiles: { p75: 175 } },
      },
    },
  },
  "url",
);
assert.equal(originRecord.scope, "origin");
assert.equal(originRecord.crux_key, "https://example.com");
assert.equal(originRecord.inp_ms, 175);

function uniqueUrls(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function cruxUrlQueryCandidates(pageUrl) {
  const extra = [];
  const u = new URL(pageUrl);
  if (u.pathname === "/" && !u.search && !u.hash) {
    extra.push(u.origin, `${u.origin}/`);
  }
  return uniqueUrls([pageUrl, ...extra]);
}

function cruxOriginQueryCandidates(origin) {
  const extra = [];
  const u = new URL(origin);
  if (u.hostname.startsWith("www.")) {
    u.hostname = u.hostname.slice(4);
    extra.push(u.origin);
  } else if (u.hostname.includes(".")) {
    u.hostname = `www.${u.hostname}`;
    extra.push(u.origin);
  }
  return uniqueUrls([origin, ...extra]);
}

assert.deepEqual(cruxUrlQueryCandidates("https://viewtrace.net/"), [
  "https://viewtrace.net/",
  "https://viewtrace.net",
]);
assert.deepEqual(cruxOriginQueryCandidates("https://viewtrace.net"), [
  "https://viewtrace.net",
  "https://www.viewtrace.net",
]);
assert.deepEqual(cruxOriginQueryCandidates("https://www.nytimes.com"), [
  "https://www.nytimes.com",
  "https://nytimes.com",
]);

console.log("test-observation-field-cwv: ok");
