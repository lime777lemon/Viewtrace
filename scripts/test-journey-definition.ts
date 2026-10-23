import assert from "node:assert/strict";
import {
  commerceJourneyInputs,
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
import { parseJourneyEvidence } from "../src/lib/journey-step-evidence";
import { journeyRecipe } from "../src/lib/journey-verifiers";
import { journeyMeasurementLines, journeyRegionStatusDiff } from "../src/lib/journey-measurement";
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
assert.equal(
  resolveJourneyOpenUrl("https://viewtrace.net/", "https://viewtrace.net/dashboard/observations/new?region={{region}}")?.includes("region="),
  true,
);
assert.equal(parseJourneySteps(Array.from({ length: 12 }, (_, index) => ({
  id: `s${index}`,
  kind: index === 0 ? "open_url" : "wait",
  url: index === 0 ? "https://viewtrace.net/" : "",
  wait_ms: 60000,
}))).length, 12);
assert.equal(parseJourneySteps([{ kind: "wait", wait_ms: 60000 }])[0]?.wait_ms, 60000);
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

const login = parseJourneySteps([{
  id: "login",
  kind: "login",
  selector: "#login-button",
  inputs: [
    { role: "username", selector: "#user-name", value: "{{username}}" },
    { role: "password", selector: "#password", value: "raw-secret" },
  ],
  expect_url: "inventory.html",
}])[0];
assert.equal(login?.inputs?.find((input) => input.role === "password")?.value, "{{password}}");
assert.equal(validateJourneySteps("https://www.saucedemo.com/", [{
  id: "open",
  kind: "open_url",
  selector: "",
  value: "",
  url: "https://www.saucedemo.com/",
  wait_ms: 1000,
  permitted_side_effect: null,
  expect_selector: "",
  expect_text: "",
  expect_visible: false,
  expect_url: "",
}, {
  id: "login",
  kind: "login",
  selector: "#login-button",
  value: "",
  url: "",
  wait_ms: 8000,
  permitted_side_effect: null,
  expect_selector: "",
  expect_text: "",
  expect_visible: false,
  expect_url: "",
  inputs: commerceJourneyInputs("login").map((input, index) => ({ ...input, selector: index === 0 ? "#user" : "#pass" })),
}]), "outcome_required");
assert.equal(validateJourneySteps("https://www.saucedemo.com/", [{
  id: "open",
  kind: "open_url",
  selector: "",
  value: "",
  url: "https://www.saucedemo.com/",
  wait_ms: 1000,
  permitted_side_effect: null,
  expect_selector: "",
  expect_text: "",
  expect_visible: false,
  expect_url: "",
}, login!]), null);
const loginReport = journeyStepReport(
  { kind: "login", status: "pass", selector: "#login-button", detail: null, url_after: "https://www.saucedemo.com/inventory.html", before_text: "", after_text: "" },
  { selector: "#login-button", url: "", value: "", expect_text: "", expect_visible: false, expect_url: "inventory.html", permitted_side_effect: null },
  1,
  "ja",
);
assert.equal(loginReport.title, "手順 2 · ログイン — 成功");
assert.equal(loginReport.lines.find((line) => line.label === "操作")?.value, "ログイン `#login-button`");

assert.equal(normalizeUserUrlInput("https://viewtrace.net"), "https://viewtrace.net/");
assert.equal(normalizeUserUrlInput("https://viewtrace．net"), "https://viewtrace.net/");
assert.equal(normalizeUserUrlInput("ｈｔｔｐｓ：／／ｖｉｅｗｔｒａｃｅ．ｎｅｔ"), "https://viewtrace.net/");
assert.equal(normalizeUserUrlInput("https://"), null);
assert.deepEqual(
  journeyNetworkEvidence([
    { method: "GET", path: "/", status: 200 },
    { method: "GET", path: "/_next/static/chunks/app.js", status: 200, type: "script" },
    { method: "GET", path: "/brand/logo.png?w=10", status: 200, type: "image" },
    { method: "POST", path: "/api/checkout?token=secret", status: 500, type: "fetch" },
  ]).map((event) => `${event.method} ${event.path} ${event.status}`),
  ["GET / 200", "GET /_next/static/chunks/app.js 200", "GET /brand/logo.png 200", "POST /api/checkout 500"],
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

const evidence = parseJourneyEvidence([
  { kind: "url_changed", summary: "https://a.example/ → https://b.example/" },
  { kind: "url_changed", summary: "duplicate" },
  { kind: "not_a_kind", summary: "ignored" },
  { kind: "http_status", summary: "   " },
  { kind: "console_error", summary: "probe-console" },
  { kind: "input_value", summary: "entered" },
]);
assert.deepEqual(evidence.map((item) => item.kind), ["url_changed", "console_error", "input_value"]);
assert.equal(evidence[2]?.summary, "entered");
const evidenceReport = journeyStepReport({
  kind: "click",
  status: "pass",
  detail: null,
  url_after: "https://example.com/",
  evidence,
}, { selector: "#go", url: "", value: "", expect_text: "done", expect_visible: false, expect_url: "", permitted_side_effect: null }, 0, "en");
assert.equal(evidenceReport.lines.some((line) => line.label === "URL changed" && line.value.includes("https://b.example/")), true);
assert.equal(evidenceReport.lines.some((line) => line.label === "Console error occurred"), true);
assert.equal(evidenceReport.lines.some((line) => line.label === "Download occurred"), false);
const japaneseEvidence = journeyStepReport({
  kind: "open_url",
  status: "pass",
  detail: null,
  url_after: "https://example.com/",
  evidence: [{ kind: "http_status", summary: "200 /" }],
}, null, 0, "ja");
assert.equal(japaneseEvidence.lines.some((line) => line.label === "HTTPステータス" && line.value === "200 /"), true);
const gated = parseJourneySteps([
  { kind: "open_url", url: "https://example.com/" },
  { kind: "click", selector: "#go", evidence_screenshot: true, evidence_video: "yes" },
]);
assert.equal(gated[0]?.evidence_screenshot, false);
assert.equal(gated[0]?.evidence_video, false);
assert.equal(gated[1]?.evidence_screenshot, true);
assert.equal(gated[1]?.evidence_video, false);

const searchSteps = parseJourneySteps([
  { kind: "open_url", url: "https://example.com/" },
  { kind: "search", selector: "#q", value: "coat" },
]);
assert.equal(validateJourneySteps("https://example.com/", searchSteps), "outcome_required");
searchSteps[1] = { ...searchSteps[1]!, expect_url: "/search" };
assert.equal(validateJourneySteps("https://example.com/", searchSteps), null);

const open = { kind: "open_url" as const, url: "https://example.com/" };
const language = parseJourneySteps([open, { kind: "language_switch", selector: "#lang" }]);
assert.equal(validateJourneySteps("https://example.com/", language), "outcome_required");
language[1] = { ...language[1]!, expect_lang: "en" };
assert.equal(validateJourneySteps("https://example.com/", language), null);
const currency = parseJourneySteps([open, { kind: "currency_switch", selector: "#usd" }]);
assert.equal(validateJourneySteps("https://example.com/", currency), "outcome_required");
currency[1] = { ...currency[1]!, expect_text: "$10.00" };
assert.equal(validateJourneySteps("https://example.com/", currency), null);
const region = parseJourneySteps([open, { kind: "region_switch", selector: "#region", value: "New York" }]);
assert.equal(validateJourneySteps("https://example.com/", region), null);
const download = parseJourneySteps([open, { kind: "download", selector: "#file" }]);
assert.equal(validateJourneySteps("https://example.com/", download), null);
assert.deepEqual(journeyRecipe("language_switch")?.pass, ["html_lang", "visible_text", "url"]);
assert.equal(journeyRecipe("language_switch")?.action, "click_or_select");
assert.deepEqual(journeyRecipe("currency_switch")?.pass, ["currency_display", "visible_text"]);
assert.deepEqual(journeyRecipe("region_switch")?.pass, ["element_state", "visible_text", "url"]);
assert.deepEqual(journeyRecipe("download")?.pass, ["download"]);
assert.equal(journeyRecipe("download")?.action, "click");
assert.deepEqual(journeyRecipe("language_switch")?.record, ["network", "runtime", "dom"]);
const upload = parseJourneySteps([open, { kind: "upload", selector: "input[type=file]" }]);
assert.equal(validateJourneySteps("https://example.com/", upload), null);
assert.equal(upload[1]?.upload_custom, null);
const uploadSubmit = parseJourneySteps([open, { kind: "upload", selector: "#file", upload_submit: true }]);
assert.equal(validateJourneySteps("https://example.com/", uploadSubmit), "upload_file_required");
const uploadSample = parseJourneySteps([open, { kind: "upload", selector: "#file", upload_sample: "sample_txt", upload_submit: true }]);
assert.equal(validateJourneySteps("https://example.com/", uploadSample), "upload_confirm_required");
uploadSample[1] = { ...uploadSample[1]!, confirm_selector: "#send", expect_text: "Upload complete" };
assert.equal(validateJourneySteps("https://example.com/", uploadSample), null);
const huge = parseJourneySteps([open, { kind: "upload", selector: "#file", upload_custom: { name: "big.txt", mime: "text/plain", base64: "A".repeat(90_000) } }]);
assert.equal(huge[1]?.upload_custom, null);
const uploadDrop = parseJourneySteps([open, { kind: "upload", selector: "#pad", upload_sample: "sample_csv", upload_drop: true }]);
assert.equal(uploadDrop[1]?.upload_sample, "sample_csv");
assert.equal(validateJourneySteps("https://example.com/", uploadDrop), "outcome_required");
uploadDrop[1] = { ...uploadDrop[1]!, expect_text: "Imported" };
assert.equal(validateJourneySteps("https://example.com/", uploadDrop), null);
const png = parseJourneySteps([open, { kind: "upload", selector: "#file", upload_sample: "sample_png" }]);
assert.equal(png[1]?.upload_sample, "sample_png");
const dropReport = journeyStepReport({
  kind: "upload",
  status: "not_measured",
  detail: "drop_not_permitted",
  url_after: "https://example.com/",
}, { selector: "#pad", url: "", value: "", expect_text: "", expect_visible: false, expect_url: "", permitted_side_effect: null }, 0, "en");
assert.equal(dropReport.lines.find((line) => line.label === "Result")?.value, "Not measured — dropping a file can send it to the target website. Permit drop to measure this.");
const uploadReport = journeyStepReport({
  kind: "upload",
  status: "not_measured",
  detail: "file_not_provided",
  url_after: "https://example.com/",
}, { selector: "input[type=file]", url: "", value: "", expect_text: "", expect_visible: false, expect_url: "", permitted_side_effect: null }, 0, "en");
assert.equal(uploadReport.lines.some((line) => line.label === "Result" && line.value === "Not measured — file upload requires an explicitly provided test file."), true);
const downloadFacts = journeyStepReport({
  kind: "download",
  status: "pass",
  detail: null,
  url_after: "https://example.com/",
  evidence: [{ kind: "download", summary: "download=started | status=200 | type=text/csv | filename=prices.csv | disposition=attachment; filename=\"prices.csv\"" }],
}, { selector: "#file", url: "", value: "", expect_text: "", expect_visible: false, expect_url: "", permitted_side_effect: null }, 0, "en");
assert.equal(downloadFacts.lines.find((line) => line.label === "Content-Disposition")?.value, "attachment; filename=\"prices.csv\"");
assert.equal(downloadFacts.lines.find((line) => line.label === "Content-Type")?.value, "text/csv");
assert.equal(downloadFacts.lines.find((line) => line.label === "filename")?.value, "prices.csv");
assert.equal(downloadFacts.lines.find((line) => line.label === "response status")?.value, "200");
assert.equal(downloadFacts.lines.find((line) => line.label === "download")?.value, "started");
const downloadReport = journeyStepReport({
  kind: "download",
  status: "fail",
  detail: "download_not_started",
  url_after: "https://example.com/",
}, { selector: "#file", url: "", value: "", expect_text: "", expect_visible: false, expect_url: "", permitted_side_effect: null }, 0, "en");
assert.equal(downloadReport.lines.some((line) => line.value === "Download did not start"), true);

const ledger = journeyMeasurementLines({
  status: "fail",
  evidence: [
    { kind: "request_failed", summary: "POST /checkout 500" },
    { kind: "console_error", summary: "checkout" },
    { kind: "rendered_heading", summary: "visible" },
  ],
  network: [{ status: 500 }, { status: 200 }],
  evidenceScreenshot: false,
  evidenceVideo: false,
  locale: "en",
});
assert.equal(ledger.find((line) => line.label === "Measured · Video")?.value, "not applicable");
assert.equal(ledger.find((line) => line.label === "Measured · Visual")?.value, "not applicable");
assert.equal(ledger.find((line) => line.label === "Measured · Network")?.value, "measured");
assert.equal(ledger.find((line) => line.label === "Observed · Failed requests")?.value, "1");
assert.equal(ledger.find((line) => line.label === "Observed · Heading")?.value, "visible");
const blockedLedger = journeyMeasurementLines({ status: "blocked_for_safety", locale: "ja" });
assert.equal(blockedLedger.every((line) => line.value === "測っていない"), true);

const regionDiff = journeyRegionStatusDiff([
  { region: "Tokyo", steps: [{ id: "checkout", kind: "checkout", status: "pass" }] },
  { region: "New York", steps: [{ id: "checkout", kind: "checkout", status: "fail" }] },
]);
assert.equal(regionDiff.length, 1);
assert.equal(regionDiff[0]?.differs, true);

console.log("ok");
