import assert from "node:assert/strict";
import { buildInteractionFunctionCode } from "../src/lib/browserless-interaction-function";
import { htmlSignalsFromRendered, parseRenderedPage } from "../src/lib/browser-rendered-page";
import { buildMeasurementRecord } from "../src/lib/measurement-record";
import { confirmMeasuredStatus } from "../src/lib/observation-interaction-evidence";
import { sessionTypeRows } from "../src/lib/observation-regional-interaction";

const networkOnly = confirmMeasuredStatus("working", {
  actions: ["SAFE_CLICK"],
  changes: [],
  window: {
    executed: true,
    samples: [{ at_ms: 100, changed: false }, { at_ms: 300, changed: false }, { at_ms: 1000, changed: false }],
    rendered_changes: [],
    visual_changed: false,
    network_count: 1,
    runtime_errors: 0,
    request_failed: 0,
    duration_ms: 1000,
  },
});
assert.equal(networkOnly, "no_change_observed");

const visual = confirmMeasuredStatus("working", {
  window: {
    executed: true,
    samples: [{ at_ms: 300, changed: false }],
    rendered_changes: ["visual"],
    visual_changed: true,
    network_count: 0,
    runtime_errors: 0,
    request_failed: 0,
    duration_ms: 300,
  },
});
assert.equal(visual, "working");

assert.equal(confirmMeasuredStatus("working", { changes: ["state"] }), "working");

const rows = sessionTypeRows(
  [
    {
      type: "swipe",
      detected: true,
      status: "working",
      evidence: {
        actions: ["SWIPE"],
        changes: [],
        window: {
          executed: true,
          samples: [{ at_ms: 1000, changed: false }],
          rendered_changes: [],
          visual_changed: false,
          network_count: 0,
          runtime_errors: 0,
          request_failed: 0,
          duration_ms: 1000,
        },
      },
    },
  ],
  null,
);
assert.equal(rows.find((row) => row.type === "swipe")?.status, "no_change_observed");

const page = parseRenderedPage(
  {
    title: "Rendered title",
    description: null,
    canonical: "https://example.com/",
    robots: null,
    viewport: "width=device-width",
    lang: "en",
    og_title: "OG",
    og_description: "OG body",
    og_image: "https://example.com/og.jpg",
    h1: [],
    json_ld_types: [],
    robots_txt: { status: "observed_absent", http_status: 404 },
  },
  { status: 200, final_url: "https://example.com/", content_type: "text/html", robots_header: "", redirect_chain: [] },
);
assert.ok(page);
const signals = htmlSignalsFromRendered(page!);
assert.equal(signals.document_title, "Rendered title");
assert.equal(signals.meta_description, null);
assert.equal(signals.http_status, 200);
assert.equal(signals.h1_count, 0);
assert.equal(signals.body_scan, "complete");
const measured = buildMeasurementRecord({ signals, robotsTxt: page!.robots_txt });
assert.equal(measured?.fields.description.status, "observed_absent");
assert.equal(measured?.fields.h1.status, "observed_absent");
assert.equal(measured?.fields.robots_txt.status, "observed_absent");
assert.equal(measured?.source, "http_document");
assert.equal(measured?.seo.signals.find((row) => row.id === "description")?.earned, 0);

const code = buildInteractionFunctionCode();
assert.match(code, /visual_captures/);
assert.match(code, /robots_txt/);
assert.match(code, /100, 300, 1000/);

console.log("ok");
