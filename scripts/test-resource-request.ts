import assert from "node:assert/strict";
import {
  classifyRequestFailure,
  formatResourceRequest,
  selectResourceRequests,
} from "../src/lib/resource-request";

assert.equal(classifyRequestFailure("net::ERR_TIMED_OUT", null), "timeout");
assert.equal(classifyRequestFailure("net::ERR_CONNECTION_TIMED_OUT", null), "timeout");
assert.equal(classifyRequestFailure("net::ERR_ABORTED", null), "aborted");
assert.equal(classifyRequestFailure("net::ERR_BLOCKED_BY_CLIENT", null), "blocked");
assert.equal(classifyRequestFailure("blocked by CORS policy: Access-Control-Allow-Origin", null), "cors");
assert.equal(classifyRequestFailure("net::ERR_FAILED", 0), "failed");
assert.equal(classifyRequestFailure("", 500), "failed");
assert.equal(classifyRequestFailure("", 200), null);

const images = Array.from({ length: 12 }, (_, index) => ({
  method: "GET",
  path: `/static/${index}.png`,
  status: 200,
  type: "image",
}));
const selected = selectResourceRequests([
  ...images,
  { method: "POST", path: "/api/cart?session=secret", status: 200, type: "fetch", duration_ms: 30, transfer_bytes: 120 },
  { method: "POST", path: "/api/checkout", status: 500, type: "fetch", duration_ms: 80, failure: "failed" },
  { method: "GET", path: "cdn.example.com/font.woff2", status: null, type: "font", failure: "timeout", third_party: true },
]);
assert.equal(selected.length, 8);
assert.deepEqual(
  selected.filter((row) => row.api || row.failure).map((row) => formatResourceRequest(row)),
  [
    "POST /api/cart · 200 · 30 ms · 120 B",
    "POST /api/checkout · 500 · failed · 80 ms",
    "GET cdn.example.com/font.woff2 · failed · timeout",
  ],
);
assert.equal(selected.some((row) => row.path.includes("secret")), false);
assert.equal(selected.filter((row) => row.type === "image").length, 5);

console.log("ok");
