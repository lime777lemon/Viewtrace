import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { buildJourneyFunctionCode } from "../src/lib/browserless-journey-function";
import { journeyStepReport, parseJourneySteps, validateJourneySteps } from "../src/lib/journey-definition";

const start = "https://example.com/";
const steps = parseJourneySteps([
  { id: "s1", kind: "open_url", url: start },
  { id: "s2", kind: "assert_url", value: "https://example.com/cart" },
  { id: "s3", kind: "assert_present", selector: "#summary" },
  { id: "s4", kind: "assert_text", selector: "h1", value: "Order summary" },
  { id: "s5", kind: "assert_attribute", selector: "a.pay", expect_attribute: "href", value: "/pay" },
  { id: "s6", kind: "assert_page_text", value: "Order summary" },
  { id: "s7", kind: "hover", selector: ".menu" },
  { id: "s8", kind: "key", selector: "input", value: "Tab" },
  { id: "s9", kind: "drag", selector: ".item", expect_selector: ".cart" },
]);

const invalid = validateJourneySteps(start, steps);
if (invalid) throw new Error(`valid journey rejected: ${invalid}`);
if (steps[4]?.expect_attribute !== "href") throw new Error("attribute name was dropped");

const badKey = parseJourneySteps([
  { kind: "open_url", url: start },
  { kind: "key", value: "a" },
]);
if (validateJourneySteps(start, badKey) !== "key_not_allowed") throw new Error("disallowed key was accepted");

const missingAttr = parseJourneySteps([
  { kind: "open_url", url: start },
  { kind: "assert_attribute", selector: "a", value: "/pay" },
]);
if (validateJourneySteps(start, missingAttr) !== "attribute_required") throw new Error("missing attribute was accepted");

const code = buildJourneyFunctionCode();
for (const needle of [
  'kind === "assert_present"',
  'kind === "assert_attribute"',
  'kind === "assert_page_text"',
  'kind === "hover"',
  'kind === "key"',
  'kind === "drag"',
  "url_not_expected",
  "found === want",
  "text.indexOf(expected)",
  "el.getAttribute(name)",
]) {
  if (!code.includes(needle)) throw new Error(`generated journey is missing ${needle}`);
}
if (code.includes("found.includes(expected)")) throw new Error("element text still uses a substring match");

writeFileSync("/tmp/viewtrace-journey-fn.mjs", code);
const checked = spawnSync("node", ["--check", "/tmp/viewtrace-journey-fn.mjs"], { encoding: "utf8" });
if (checked.status !== 0) throw new Error(checked.stderr || checked.stdout || "generated function did not parse");

const textReport = journeyStepReport({
  kind: "assert_text",
  status: "fail",
  detail: "text_mismatch",
  url_after: "https://example.com/cart",
  after_text: "Cart empty",
  selector: "h1",
}, steps[3] ?? null, 3, "ja");
const textValues = textReport.lines.map((line) => line.value);
if (!textValues.includes("Order summary") || !textValues.includes("Cart empty") || !textValues.includes("要素の文字が期待と一致しない")) {
  throw new Error(JSON.stringify(textReport, null, 2));
}

const urlReport = journeyStepReport({
  kind: "assert_url",
  status: "fail",
  detail: "url_not_expected",
  url_after: "https://example.com/bag",
  selector: "",
}, steps[1] ?? null, 1, "ja");
const urlValues = urlReport.lines.map((line) => line.value);
if (!urlValues.includes("https://example.com/cart") || !urlValues.includes("https://example.com/bag") || !urlValues.includes("URL が期待と一致しない")) {
  throw new Error(JSON.stringify(urlReport, null, 2));
}

const presentReport = journeyStepReport({
  kind: "assert_present",
  status: "pass",
  detail: "section",
  url_after: "https://example.com/cart",
  after_visible: true,
  selector: "#summary",
}, steps[2] ?? null, 2, "ja");
if (!presentReport.lines.some((line) => line.value.includes("存在する"))) {
  throw new Error(JSON.stringify(presentReport, null, 2));
}

console.log("journey assertions ok");
