import assert from "node:assert/strict";
import { buildBehaviorDiff } from "../src/lib/observation-behavior-diff";
import { presentInteractionHealth } from "../src/lib/interaction-health-presentation";
import {
  buildMeasurementRecord,
  pageSeoFromSignals,
} from "../src/lib/measurement-record";
import { presentSearchSocial } from "../src/lib/search-social-presentation";
import type { HtmlHeadSignalsV1 } from "../src/lib/url-preview";
import type { RegionalInteractionCheckV1 } from "../src/lib/observation-regional-interaction";

function signals(overrides: Partial<HtmlHeadSignalsV1> = {}): HtmlHeadSignalsV1 {
  return {
    document_title: "Title",
    meta_description: "Description",
    canonical_url: "https://example.com/",
    robots_meta: null,
    x_robots_tag: null,
    og_title: "OG",
    og_description: "OG description",
    og_image: "https://example.com/og.jpg",
    json_ld_types: ["Organization"],
    html_lang: "en",
    viewport: "width=device-width",
    http_status: 200,
    final_url: "https://example.com/",
    noindex: null,
    canonical_mismatch: false,
    ...overrides,
  };
}

const full = pageSeoFromSignals(signals());
assert.equal(full?.scoring_version, "page-seo-v1");
assert.equal(full?.score, 100);
assert.equal(full?.earned_points, 100);
assert.equal(full?.possible_points, 100);
assert.equal(full?.measured_signals, 9);
assert.equal(full?.signals.find((row) => row.id === "noindex")?.status, "observed_absent");
assert.equal(full?.signals.find((row) => row.id === "noindex")?.earned, 15);

const withoutHttp = pageSeoFromSignals(signals({ http_status: null }));
assert.equal(withoutHttp?.possible_points, 90);
assert.equal(withoutHttp?.earned_points, 90);
assert.equal(withoutHttp?.score, 100);
assert.equal(withoutHttp?.signals.find((row) => row.id === "http")?.earned, null);

const noTitle = pageSeoFromSignals(signals({ document_title: null }));
assert.equal(noTitle?.signals.find((row) => row.id === "title")?.status, "observed_absent");
assert.equal(noTitle?.signals.find((row) => row.id === "title")?.earned, 0);
assert.equal(noTitle?.earned_points, 85);
assert.equal(noTitle?.possible_points, 100);
assert.equal(noTitle?.score, 85);

assert.equal(pageSeoFromSignals(null), null);

const slashOnly = buildMeasurementRecord({
  signals: signals({
    canonical_url: "https://example.com",
    final_url: "https://example.com/",
    canonical_mismatch: true,
  }),
});
assert.equal(slashOnly?.canonical_comparison.comparable, true);
assert.equal(slashOnly?.canonical_comparison.normalized_match, true);
assert.equal(slashOnly?.canonical_comparison.host_match, true);
assert.equal(slashOnly?.seo.signals.find((row) => row.id === "canonical")?.earned, 15);
assert.equal(slashOnly?.seo.score, 100);

const hostMismatch = buildMeasurementRecord({
  signals: signals({
    canonical_url: "https://ami-website-mocha.vercel.app/",
    final_url: "https://www.americanmedical.ai/",
    canonical_mismatch: true,
  }),
});
assert.equal(hostMismatch?.canonical_comparison.comparable, true);
assert.equal(hostMismatch?.canonical_comparison.normalized_match, false);
assert.equal(hostMismatch?.canonical_comparison.host_match, false);
assert.equal(hostMismatch?.seo.signals.find((row) => row.id === "canonical")?.status, "observed");
assert.equal(hostMismatch?.seo.signals.find((row) => row.id === "canonical")?.earned, 0);
assert.equal(hostMismatch?.seo.earned_points, 85);
assert.equal(hostMismatch?.seo.possible_points, 100);
assert.equal(hostMismatch?.seo.score, 85);

const record = buildMeasurementRecord({ signals: signals() });
assert.equal(record?.manifest.metadata.title, "measured");
assert.equal(record?.manifest.metadata.h1, "not_measured");
assert.equal(record?.manifest.metadata.robots_txt, "not_measured");

const social = presentSearchSocial({
  signals: signals({ og_title: null, twitter_title: "Twitter only" }),
});
assert.equal(social.social.title, "");
assert.equal(social.twitter?.title, "Twitter only");

function check(status: "working" | "not_detected" | "no_change_observed"): RegionalInteractionCheckV1 {
  return {
    schema_version: 1,
    source: "browserless_interaction_check",
    measured_at: "2026-10-22T00:00:00.000Z",
    requested_url: "https://example.com/",
    requested_region: "US-WA",
    types: [{ type: "swipe", detected: true, status }],
    scroll: null,
    duration_ms: 1000,
    proxy_bytes: null,
  } as RegionalInteractionCheckV1;
}

const missing = buildBehaviorDiff(check("working"), check("not_detected"), "prev");
assert.equal(missing.transitions[0]?.kind, "regression");
const health = presentInteractionHealth({ diff: missing, check: check("not_detected") });
assert.equal(health?.signal, "problem");
assert.equal(health?.problems.length, 1);

const desktop = check("working");
const mobile = check("working");
desktop.discovery = {
  environment: {
    device_class: "desktop",
    viewport: { width: 1440, height: 900 },
    pointer: "mouse",
    touch: false,
    locale: "en-US",
    timezone: "America/Los_Angeles",
    prefers_reduced_motion: false,
  },
} as RegionalInteractionCheckV1["discovery"];
mobile.discovery = {
  environment: {
    device_class: "mobile",
    viewport: { width: 390, height: 844 },
    pointer: "touch",
    touch: true,
    locale: "en-US",
    timezone: "America/Los_Angeles",
    prefers_reduced_motion: false,
  },
} as RegionalInteractionCheckV1["discovery"];
const mismatched = buildBehaviorDiff(desktop, mobile, "prev");
assert.equal(mismatched.comparison, "environment_mismatch");
assert.equal(mismatched.map_diffs.length, 0);
assert.equal(presentInteractionHealth({ diff: mismatched, check: mobile }), null);

console.log("ok");
