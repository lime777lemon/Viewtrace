import assert from "node:assert/strict";
import type { CaptureConditionsV1 } from "../src/lib/capture-conditions";
import type { Observation } from "../src/lib/demo/observations";
import { buildEvidenceReportFacts } from "../src/lib/evidence-report";
import type { JourneyRunFacts } from "../src/lib/observation-measure-ledger";
import type { InteractionTypeRow } from "../src/lib/observation-regional-interaction";
import type { SyntheticInteractionV1 } from "../src/lib/observation-synthetic-interaction";
import type { SessionSignalsV1 } from "../src/lib/session-signals";

function observation(partial: Partial<Observation> & Pick<Observation, "id" | "capturedAt">): Observation {
  return {
    url: "https://example.com/pricing",
    regionValue: "US-CA",
    regionLabel: "US · California",
    status: "success",
    ...partial,
  };
}

function conditions(partial: Partial<CaptureConditionsV1>): CaptureConditionsV1 {
  return partial as CaptureConditionsV1;
}

const current = observation({
  id: "current",
  capturedAt: "2026-10-24T10:00:00.000Z",
  pageTitle: "Stored title",
  snapshotSha256: "bbb",
  captureConditions: conditions({
    region_input: "US-CA",
    region_label: "US · California",
    full_page_requested: true,
    viewport: { width: 1280, height: 800, device_scale_factor: 1, source: "playwright_worker_1280x800" },
    geo: { country: "us", state: null, proxy_mode: "browserless_residential", proxy_provider: "browserless", proxy_sticky: null },
    html_signals: {
      document_title: "Now",
      meta_description: null,
      canonical_url: "https://example.com/pricing",
      robots_meta: "index",
      x_robots_tag: null,
      og_title: null,
      og_description: null,
      og_image: "https://example.com/now.png",
      json_ld_types: [],
      http_status: 200,
      final_url: "https://example.com/pricing",
    },
  }),
});

const previous = observation({
  id: "previous",
  capturedAt: "2026-10-20T10:00:00.000Z",
  snapshotSha256: "aaa",
  captureConditions: conditions({
    region_input: "US-CA",
    full_page_requested: true,
    viewport: { width: 1280, height: 800, device_scale_factor: 1, source: "playwright_worker_1280x800" },
    html_signals: {
      document_title: "Then",
      meta_description: null,
      canonical_url: "https://example.com/pricing",
      robots_meta: "index",
      x_robots_tag: null,
      og_title: null,
      og_description: null,
      og_image: "https://example.com/then.png",
      json_ld_types: [],
    },
  }),
});

const otherRegion = observation({
  id: "japan",
  capturedAt: "2026-10-23T10:00:00.000Z",
  regionValue: "JP-13",
  regionLabel: "Japan · Tokyo",
  snapshotSha256: "ccc",
});

const session = {
  http: { status: 503, final_url: "https://example.com/other", redirect_count: null, content_type: null, robots_header: null, loaded: true, timed_out: false },
  connection: { dns_ms: 0, tls_ms: null, protocol: null, secure: false },
} as SessionSignalsV1;

const facts = buildEvidenceReportFacts({
  observation: current,
  locale: "ja",
  siblings: [previous, otherRegion, current],
  session,
  behaviorTypes: [
    { type: "hover", detected: true, status: "working" },
    { type: "carousel", detected: true, status: "not_detected" },
    { type: "video", detected: false, status: "not_measured" },
  ] satisfies InteractionTypeRow[],
  synthetic: {
    interactions: [{ label: "Pricing", kind: "link", latency_ms: 120, navigated: true, error: null }],
    error: null,
  } as SyntheticInteractionV1,
  journeyRuns: [
    {
      region: "JP-13",
      deviceClass: "desktop",
      status: "passed",
      steps: [{ id: "jp", kind: "click", status: "pass" }],
    },
    {
      region: "US-CA",
      deviceClass: "desktop",
      status: "passed",
      steps: [
        { id: "skip", kind: "click", status: "not_run" },
        { id: "go", kind: "open_url", status: "pass" },
      ],
    },
  ] as JourneyRunFacts[],
});

assert.equal(facts.region.requested, "US · California");
assert.equal(facts.region.observed, "米国");
assert.equal(facts.region.observed?.includes("California"), false);
assert.equal(facts.reachability.http, "200");
assert.equal(facts.reachability.finalUrl, "https://example.com/pricing");
assert.equal(facts.reachability.pageTitle, "Now");
assert.equal(facts.reachability.dns, "0 ms");
assert.equal(facts.reachability.tls, "TLS なし");
assert.equal(facts.detected?.fields.find((row) => row.key === "screenshot")?.verdict, "changed");
assert.equal(facts.detected?.fields.find((row) => row.key === "title")?.verdict, "changed");
assert.equal(facts.detected?.fields.find((row) => row.key === "ogImage")?.verdict, "changed");
assert.equal(facts.detected?.fields.find((row) => row.key === "canonical")?.verdict, "same");
assert.equal(facts.behavior?.map((row) => row.status).join(","), "working,not_detected");
assert.deepEqual(facts.journey?.map((row) => row.status), ["pass", "pass"]);

const stateObserved = buildEvidenceReportFacts({
  observation: observation({
    id: "state",
    capturedAt: "2026-10-24T10:00:00.000Z",
    captureConditions: conditions({
      region_input: "US-CA",
      geo: { country: "us", state: "California", proxy_mode: "browserless_residential", proxy_provider: "browserless", proxy_sticky: null },
    }),
  }),
  locale: "ja",
  siblings: [],
});
assert.equal(stateObserved.region.observed, "米国 · California");
assert.equal(stateObserved.detected, null);
assert.equal(stateObserved.reachability.finalUrl, null);
assert.equal(stateObserved.reachability.http, null);
assert.equal(stateObserved.behavior, null);
assert.equal(stateObserved.journey, null);

const unmeasured = buildEvidenceReportFacts({
  observation: observation({ id: "plain", capturedAt: "2026-10-24T10:00:00.000Z", pageTitle: "Only stored" }),
  locale: "en",
  siblings: [otherRegion],
});
assert.equal(unmeasured.region.observed, null);
assert.equal(unmeasured.reachability.pageTitle, "Only stored");
assert.equal(unmeasured.reachability.dns, null);
assert.equal(unmeasured.reachability.tls, null);
assert.equal(unmeasured.detected, null);

const safe = buildEvidenceReportFacts({
  observation: current,
  locale: "en",
  siblings: [],
  synthetic: { interactions: [], error: "no_safe_target" } as unknown as SyntheticInteractionV1,
});
assert.deepEqual(safe.journey, [{ label: "", status: "no_safe_target" }]);

console.log("evidence report ok");
