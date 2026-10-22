import assert from "node:assert/strict";
import { parseSessionSignals } from "../src/lib/session-signals";

const parsed = parseSessionSignals({
  http: {
    status: 200,
    final_url: "https://example.com/",
    redirect_count: 1,
    content_type: "text/html",
    robots_header: "",
    loaded: true,
    timed_out: false,
  },
  resources: { script: 2, stylesheet: 1, image: 3, font: 1, xhr: 0, fetch: 1, other: 0, failed: 1, status_4xx: 1, status_5xx: 0, transfer_bytes: 1200 },
  errors: { console_error: 1, pageerror: 0, request_failed: 1 },
  performance: { ttfb_ms: 80, dom_content_loaded_ms: 200, load_ms: 400, fcp_ms: 180, lcp_ms: 320, cls: 0.01, long_tasks: 2 },
  structured_data: { types: ["Organization"], syntax_errors: 0 },
});

assert.ok(parsed);
assert.equal(parsed.http.status, 200);
assert.equal(parsed.resources.script, 2);
assert.equal(parsed.resources.failed, 1);
assert.equal(parsed.errors.console_error, 1);
assert.equal(parsed.performance.lcp_ms, 320);
assert.equal(parsed.structured_data.syntax_errors, 0);
assert.equal(parseSessionSignals(null), null);

console.log("ok");
