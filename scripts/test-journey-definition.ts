import assert from "node:assert/strict";
import {
  journeyNetworkEvidence,
  journeyCaptureLine,
  journeyOpenPageState,
  journeyStepReport,
  resolveJourneyOpenUrl,
  journeySideEffect,
  journeySideEffectPermitted,
  journeyStepHostAllowed,
  parseJourneySteps,
  validateJourneySteps,
} from "../src/lib/journey-definition";
import { discoveryJourneyCandidates, journeyStepsFromCandidates } from "../src/lib/discovery-to-journey";
import { normalizeUserUrlInput } from "../src/lib/url-preview";
import { journeyAlert, journeyRunStatus, type JourneyStepEvidence } from "../src/lib/journey-runner";
import type { DiscoveryTransitionV1 } from "../src/lib/observation-behavior-discovery";

assert.equal(journeyCaptureLine("US-CA", "city", "en"), "Requested United States · California · Observed United States · California");
assert.equal(journeyCaptureLine("US-CA", "country", "en"), "Requested United States · California · Observed United States");
assert.equal(journeyCaptureLine("JP-13", "city", "ja"), "リクエスト 日本 · 東京 · 観測 日本 · 東京");
assert.equal(journeyCaptureLine("JP-13", "country", "en"), "Requested Japan · Tokyo · Observed Japan");
assert.equal(journeyCaptureLine("US-CA", "no_proxy", "en"), "Requested United States · California · Observed No regional proxy");
assert.equal(journeyOpenPageState({ status: "fail", url_after: "about:blank", detail: "url_mismatch" }, "ja").headline, "ページは表示されていない");
assert.equal(journeyOpenPageState({ status: "fail", url_after: "about:blank", detail: "Navigation timeout" }, "ja").reason, "Navigation timeout");
assert.equal(journeyOpenPageState({ status: "pass", url_after: "https://viewtrace.net/", detail: "https://viewtrace.net/" }, "ja").displayed, true);
assert.equal(resolveJourneyOpenUrl("https://viewtrace.net/", "viewtrace.net"), "https://viewtrace.net/");
assert.equal(resolveJourneyOpenUrl("https://viewtrace.net/", ""), "https://viewtrace.net/");
assert.equal(resolveJourneyOpenUrl("https://viewtrace.net/", "/pricing"), "https://viewtrace.net/pricing");
assert.equal(resolveJourneyOpenUrl("https://viewtrace.net/", "https://evil.test/"), null);
const openFail = journeyStepReport(
  { kind: "open_url", status: "fail", detail: "Protocol error (Page.navigate): Cannot navigate to invalid URL", url_after: "about:blank" },
  { selector: "", url: "viewtrace.net", value: "", expect_text: "", expect_visible: false, expect_url: "", permitted_side_effect: null },
  0,
  "en",
);
assert.equal(openFail.title, "Step 1 · Open URL — Failed");
assert.equal(openFail.lines.find((line) => line.label === "Target")?.value, "viewtrace.net");
assert.equal(openFail.lines.find((line) => line.label === "Current URL")?.value, "about:blank");
assert.equal(openFail.lines.find((line) => line.label === "Reason")?.value, "Invalid URL");
assert.match(openFail.lines.find((line) => line.label === "Evidence")?.value ?? "", /Cannot navigate to invalid URL/);
const blocked = journeyStepReport(
  { kind: "click", status: "blocked_for_safety", selector: "button", detail: "place_order", url_after: null },
  { selector: "button", url: "", value: "", expect_text: "", expect_visible: false, expect_url: "", permitted_side_effect: null },
  4,
  "en",
);
assert.equal(blocked.title, "Step 5 · Click — Blocked");
assert.equal(blocked.lines.find((line) => line.label === "Result")?.value, "No click was executed");
assert.equal(journeySideEffect("Place order"), "place_order");
assert.equal(journeySideEffect("Pay now"), "payment");
assert.equal(journeySideEffect("Delete account"), "delete");
assert.equal(journeySideEffect("Send email"), "external_send");
assert.equal(journeySideEffect("Add to cart"), null);
assert.equal(journeySideEffect("Checkout"), null);
assert.equal(journeySideEffect("Login"), null);
assert.equal(journeySideEffectPermitted("place_order", "place_order"), true);
assert.equal(journeySideEffectPermitted("payment", "place_order"), false);
assert.equal(journeySideEffectPermitted("payment", null), false);
assert.equal(journeySideEffectPermitted(null, null), true);

assert.equal(normalizeUserUrlInput("https://viewtrace.net"), "https://viewtrace.net/");
assert.equal(normalizeUserUrlInput("https://viewtrace．net"), "https://viewtrace.net/");
assert.equal(normalizeUserUrlInput("ｈｔｔｐｓ：／／ｖｉｅｗｔｒａｃｅ．ｎｅｔ"), "https://viewtrace.net/");
assert.equal(normalizeUserUrlInput("https://"), null);
assert.deepEqual(
  journeyNetworkEvidence([
    { method: "GET", path: "/", status: 200 },
    { method: "GET", path: "/_next/static/chunks/app.js", status: 200 },
    { method: "GET", path: "/_next/image", status: 200 },
    { method: "GET", path: "/brand/logo.png", status: 200 },
  ]).map((event) => event.path),
  ["/"],
);
assert.equal(journeyStepHostAllowed("https://example.com/product", "https://example.com/cart"), true);
assert.equal(journeyStepHostAllowed("https://example.com/product", "https://evil.example/cart"), false);

const steps = parseJourneySteps([
  { id: "open", kind: "open_url", url: "https://example.com/product" },
  { id: "login", kind: "click", selector: "#login" },
  { id: "user", kind: "fill", selector: "#email", value: "{{username}}" },
  { id: "order", kind: "click", selector: "#place-order", permitted_side_effect: null },
]);
assert.equal(validateJourneySteps("https://example.com/product", steps), null);
assert.equal(steps[3]?.permitted_side_effect, null);

const step = (id: string, status: JourneyStepEvidence["status"]): JourneyStepEvidence => ({
  id,
  kind: "click",
  status,
  duration_ms: 1,
  url_after: null,
  detail: null,
  rendered_text: null,
  before_text: null,
  after_text: null,
  before_visible: null,
  after_visible: null,
  network: [],
  runtime: [],
});
assert.equal(journeyRunStatus([step("login", "pass"), step("order", "blocked_for_safety"), step("next", "not_run")]), "blocked");
assert.equal(journeyRunStatus([step("login", "fail")]), "failed");
assert.equal(journeyRunStatus([step("cart", "incomplete")]), "incomplete");
assert.equal(journeyRunStatus([step("cart", "pass")]), "passed");

const alert = journeyAlert(
  [step("cart", "pass")],
  [{ ...step("cart", "fail"), detail: "outcome_mismatch" }],
);
assert.equal(alert, "click cart fail");
assert.equal(journeyAlert(null, []), null);

const transition: DiscoveryTransitionV1 = {
  action_id: "a1",
  action: "click",
  selector: "#menu",
  shadow_path: [],
  frame_path: [],
  state_before: "",
  state_after: "",
  started_at: 0,
  rendered: [{ selector: "#panel", changes: ["hidden"], shadow_path: [], frame_path: [] }],
  network: [],
  runtime: [],
};
const candidates = discoveryJourneyCandidates({
  transitions: [transition, { ...transition, selector: "button", action_id: "a2" }],
  blocked: [
    { selector: "#login", text: "Login" },
    { selector: "#checkout", text: "Checkout" },
    { selector: "#pay", text: "Pay now" },
    { selector: "a", text: "Cart" },
  ],
});
assert.deepEqual(candidates.map((row) => [row.selector, row.expect_visible, row.sideEffect]), [
  ["#menu", true, null],
  ["#login", false, null],
  ["#checkout", false, null],
  ["#pay", false, "payment"],
]);
const drafted = journeyStepsFromCandidates("https://example.com/shop", candidates);
assert.equal(drafted[0]?.kind, "open_url");
assert.equal(drafted[1]?.expect_selector, "#panel");
assert.equal(drafted.every((step) => step.permitted_side_effect == null), true);
assert.equal(validateJourneySteps("https://example.com/shop", drafted), null);

console.log("ok");
