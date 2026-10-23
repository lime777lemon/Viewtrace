import { journeyCustomerConclusion, journeyRunEvidence } from "../src/lib/journey-conclusion";

const checkoutFail = [
  { id: "search", kind: "search", status: "pass", url_after: "https://shop.example/search", runtime_observed: true, runtime: [] },
  { id: "product", kind: "navigation", status: "pass", url_after: "https://shop.example/products/1", runtime_observed: true, runtime: [] },
  {
    id: "cart",
    kind: "add_to_cart",
    status: "pass",
    url_after: "https://shop.example/cart",
    before_text: "0",
    after_text: "1",
    network: [{ method: "POST", path: "/cart", status: 200, type: "fetch", duration_ms: 40, transfer_bytes: 20, failure: null, third_party: false, api: true }],
    runtime_observed: true,
    runtime: [],
  },
  { id: "open-cart", kind: "navigation", status: "pass", url_after: "https://shop.example/cart", runtime_observed: true, runtime: [] },
  {
    id: "checkout",
    kind: "checkout",
    status: "fail",
    url_after: "https://shop.example/cart",
    network: [{ method: "POST", path: "/checkout", status: 500, type: "fetch", duration_ms: 80, transfer_bytes: 12, failure: "failed", third_party: false, api: true }],
    runtime_observed: true,
    runtime: [{ kind: "console_error", message: "checkout failed" }],
  },
];
const defined = [
  { id: "search", expect_url: "/search" },
  { id: "product", expect_url: "/products" },
  { id: "cart", expect_url: "/cart" },
  { id: "open-cart", expect_url: "/cart" },
  { id: "checkout", expect_url: "/checkout" },
];

const withUpload = journeyCustomerConclusion({
  region: "US-NY",
  stage: "city",
  device: "mobile",
  steps: [{ id: "open", kind: "open_url", status: "pass" }, { id: "file", kind: "upload", status: "not_measured" }],
  locale: "en",
});
if (withUpload !== "A customer in New York using mobile completed this journey.") throw new Error(withUpload ?? "upload");

const conclusion = journeyCustomerConclusion({ region: "US-NY", stage: "city", device: "mobile", steps: checkoutFail, locale: "en" });
if (conclusion !== "A customer in New York using mobile cannot complete checkout.") throw new Error(conclusion ?? "missing");

const country = journeyCustomerConclusion({ region: "US-NY", stage: "country", device: "mobile", steps: checkoutFail, locale: "en" });
if (!country?.includes("United States") || country.includes("New York")) throw new Error(country ?? "country");

const unverified = journeyCustomerConclusion({ region: "US-NY", stage: "no_proxy", device: "mobile", steps: checkoutFail, locale: "en" });
if (unverified?.includes("New York") || !unverified?.includes("not verified")) throw new Error(unverified ?? "proxy");

const passed = journeyCustomerConclusion({
  region: "US-NY",
  stage: "city",
  device: "mobile",
  steps: checkoutFail.map((step) => ({ ...step, status: "pass" })),
  locale: "en",
});
if (passed !== "A customer in New York using mobile completed this journey.") throw new Error(passed ?? "pass");

const blocked = journeyCustomerConclusion({
  region: "US-NY",
  stage: "city",
  device: "mobile",
  steps: [{ kind: "checkout", status: "blocked_for_safety" }],
  locale: "en",
});
if (blocked?.includes("cannot complete")) throw new Error(blocked ?? "blocked");

const lines = journeyRunEvidence({ steps: checkoutFail, defined, locale: "en" }).map((line) => `${line.label}: ${line.value}`);
for (const expected of [
  "Request: POST /cart · 200",
  "Cart count: 0 → 1",
  "URL: /cart loaded",
  "Checkout: clicked",
  "Request: POST /checkout · 500",
  "Expected checkout page: not reached",
  "Console error: 1",
]) {
  if (!lines.includes(expected)) throw new Error(`missing ${expected}\n${lines.join("\n")}`);
}

const words = journeyRunEvidence({
  steps: [{ kind: "add_to_cart", status: "pass", before_text: "empty", after_text: "added", runtime_observed: true, runtime: [] }],
  locale: "en",
});
if (words.some((line) => line.label === "Cart count")) throw new Error("text is not a count");

console.log("ok");
