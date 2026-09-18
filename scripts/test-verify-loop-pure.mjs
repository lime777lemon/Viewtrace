import assert from "node:assert/strict";

const OBSERVATION_NEW_PREFIX = "/dashboard/observations/new";

function buildObservationNewPathFromNormalizedUrl(normalizedUrl) {
  const params = new URLSearchParams();
  params.set("url", normalizedUrl);
  return `${OBSERVATION_NEW_PREFIX}?${params.toString()}`;
}

function isVerifyLoopNextPath(path) {
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (!path.startsWith(OBSERVATION_NEW_PREFIX)) return false;
  if (path.includes("://")) return false;
  return path.length <= 2000;
}

function sanitizeVerifyEventMetadata(raw) {
  if (!raw) return {};
  const blocked = new Set([
    "email",
    "ip",
    "ip_address",
    "url",
    "raw_url",
    "submitted_url",
    "password",
    "phone",
    "name",
    "full_name",
  ]);
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    const k = key.toLowerCase();
    if (blocked.has(k)) continue;
    if (typeof value === "string" && /@/.test(value)) continue;
    out[key] = value;
  }
  return out;
}

function uniqueSessions(rows, type) {
  const set = new Set();
  for (const row of rows) {
    if (row.event_type === type) set.add(row.anonymous_session_id);
  }
  return set.size;
}

function ratio(num, den) {
  if (den <= 0) return null;
  return num / den;
}

function computeVerifyFunnel(rows) {
  const counts = {
    verify_view: uniqueSessions(rows, "verify_view"),
    verify_cta_click: uniqueSessions(rows, "verify_cta_click"),
    url_submitted: uniqueSessions(rows, "url_submitted"),
    signup_started: uniqueSessions(rows, "signup_started"),
    signup_completed: uniqueSessions(rows, "signup_completed"),
    first_observation_created: uniqueSessions(rows, "first_observation_created"),
  };
  return {
    counts,
    rates: {
      ctaClickRate: ratio(counts.verify_cta_click, counts.verify_view),
      urlSubmissionRate: ratio(counts.url_submitted, counts.verify_cta_click),
      signupConversionRate: ratio(counts.signup_completed, counts.url_submitted),
      firstObservationConversionRate: ratio(counts.first_observation_created, counts.url_submitted),
    },
  };
}

assert.equal(
  buildObservationNewPathFromNormalizedUrl("https://example.com/path"),
  "/dashboard/observations/new?url=https%3A%2F%2Fexample.com%2Fpath",
);
assert.equal(isVerifyLoopNextPath("/dashboard/observations/new?url=https%3A%2F%2Fa.com"), true);
assert.equal(isVerifyLoopNextPath("https://evil.com"), false);
assert.equal(isVerifyLoopNextPath("//evil.com"), false);
assert.equal(isVerifyLoopNextPath("/login"), false);

const meta = sanitizeVerifyEventMetadata({
  email: "a@b.com",
  url: "https://secret.example",
  via: "verify_form",
  logged_in: true,
});
assert.equal("email" in meta, false);
assert.equal("url" in meta, false);
assert.equal(meta.via, "verify_form");
assert.equal(meta.logged_in, true);

const funnel = computeVerifyFunnel([
  { anonymous_session_id: "s1", event_type: "verify_view" },
  { anonymous_session_id: "s1", event_type: "verify_view" },
  { anonymous_session_id: "s1", event_type: "verify_cta_click" },
  { anonymous_session_id: "s1", event_type: "url_submitted" },
  { anonymous_session_id: "s1", event_type: "signup_started" },
  { anonymous_session_id: "s1", event_type: "signup_completed" },
  { anonymous_session_id: "s1", event_type: "first_observation_created" },
  { anonymous_session_id: "s2", event_type: "verify_view" },
]);
assert.equal(funnel.counts.verify_view, 2);
assert.equal(funnel.counts.verify_cta_click, 1);
assert.equal(funnel.rates.ctaClickRate, 0.5);
assert.equal(funnel.rates.urlSubmissionRate, 1);
assert.equal(funnel.rates.signupConversionRate, 1);
assert.equal(funnel.rates.firstObservationConversionRate, 1);

console.log("verify-loop pure tests ok");
