import { readFileSync } from "node:fs";
import { buildJourneyFunctionCode } from "../src/lib/browserless-journey-function";
import { browserlessPathEndpoint } from "../src/lib/browserless-geo-endpoint";
import { journeyRunStatus, type JourneyStepEvidence } from "../src/lib/journey-runner";
import type { JourneyStepDefinition } from "../src/lib/journey-definition";

function loadEnvLocal() {
  let text = "";
  try {
    text = readFileSync(".env.local", "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = value;
  }
}

const blank: Omit<JourneyStepDefinition, "id" | "kind"> = {
  selector: "",
  value: "",
  url: "",
  wait_ms: 8000,
  permitted_side_effect: null,
  expect_selector: "",
  expect_text: "",
  expect_visible: false,
  expect_url: "",
};

const fixtureHtml = `<!doctype html>
<html><head><meta charset="utf-8"></head><body>
<form id="signup-form">
  <input id="name" name="name" required>
  <input id="email" name="email" type="email" required>
  <input id="signup-pass" name="password" type="password" required>
  <button id="signup" type="submit">Create account</button>
</form>
<p id="signed-up" hidden></p>
<form id="login-form">
  <input id="user" name="user">
  <input id="pass" type="password">
  <button id="login" type="submit">Login</button>
</form>
<p id="account" hidden></p>
<button id="add-cart" type="button">Add to cart</button>
<p id="cart" hidden></p>
<button id="checkout" type="button">Checkout</button>
<section id="review" hidden><p id="review-line"></p><button id="place-order" type="button">Place order</button></section>
<p id="done" hidden></p>
<script>
var account = null;
document.getElementById("signup-form").addEventListener("submit", function (event) {
  event.preventDefault();
  account = { email: document.getElementById("email").value, password: document.getElementById("signup-pass").value };
  document.getElementById("signed-up").textContent = "Account created";
  document.getElementById("signed-up").hidden = false;
});
document.getElementById("login-form").addEventListener("submit", function (event) {
  event.preventDefault();
  var user = document.getElementById("user").value;
  var pass = document.getElementById("pass").value;
  if (account && user === account.email && pass === account.password) {
    document.getElementById("account").textContent = "Signed in";
    document.getElementById("account").hidden = false;
  }
});
document.getElementById("add-cart").addEventListener("click", function () {
  if (document.getElementById("account").hidden) return;
  document.getElementById("cart").textContent = "1";
  document.getElementById("cart").hidden = false;
});
document.getElementById("checkout").addEventListener("click", function () {
  if (document.getElementById("cart").textContent !== "1") return;
  document.getElementById("review-line").textContent = "Sample · 1";
  document.getElementById("review").hidden = false;
});
document.getElementById("place-order").addEventListener("click", function () {
  if (document.getElementById("review").hidden) return;
  document.getElementById("done").textContent = "Order placed";
  document.getElementById("done").hidden = false;
});
</script>
</body></html>`;

const fixtureSteps: JourneyStepDefinition[] = [
  { ...blank, id: "signup-name", kind: "fill", selector: "#name", value: "Probe" },
  { ...blank, id: "signup-email", kind: "fill", selector: "#email", value: "probe@example.com" },
  { ...blank, id: "signup-password", kind: "fill", selector: "#signup-pass", value: "probe-pass" },
  { ...blank, id: "signup", kind: "click", selector: "#signup", expect_selector: "#signed-up", expect_text: "Account created", expect_visible: true },
  { ...blank, id: "login-user", kind: "fill", selector: "#user", value: "probe@example.com" },
  { ...blank, id: "login-password", kind: "fill", selector: "#pass", value: "probe-pass" },
  { ...blank, id: "login", kind: "click", selector: "#login", expect_selector: "#account", expect_text: "Signed in", expect_visible: true },
  { ...blank, id: "add-cart", kind: "click", selector: "#add-cart", expect_selector: "#cart", expect_text: "1", expect_visible: true },
  { ...blank, id: "checkout", kind: "click", selector: "#checkout", expect_selector: "#review-line", expect_text: "Sample · 1", expect_visible: true },
  { ...blank, id: "place-order", kind: "click", selector: "#place-order", permitted_side_effect: "place_order", expect_selector: "#done", expect_text: "Order placed", expect_visible: true },
];

const storeSteps: JourneyStepDefinition[] = [
  { ...blank, id: "open", kind: "open_url", url: "https://www.saucedemo.com/" },
  { ...blank, id: "login-user", kind: "fill", selector: "#user-name", value: "standard_user" },
  { ...blank, id: "login-password", kind: "fill", selector: "#password", value: "secret_sauce" },
  { ...blank, id: "login", kind: "click", selector: "#login-button", expect_url: "inventory.html" },
  { ...blank, id: "add-cart", kind: "click", selector: "#add-to-cart-sauce-labs-backpack", expect_selector: ".shopping_cart_badge", expect_text: "1" },
  { ...blank, id: "cart", kind: "click", selector: ".shopping_cart_link", expect_url: "cart.html" },
  { ...blank, id: "checkout", kind: "click", selector: "#checkout", expect_url: "checkout-step-one.html" },
  { ...blank, id: "first", kind: "fill", selector: "#first-name", value: "Probe" },
  { ...blank, id: "last", kind: "fill", selector: "#last-name", value: "Viewtrace" },
  { ...blank, id: "postal", kind: "fill", selector: "#postal-code", value: "10001" },
  { ...blank, id: "continue", kind: "click", selector: "#continue", expect_url: "checkout-step-two.html" },
  { ...blank, id: "finish", kind: "click", selector: "#finish", expect_selector: ".complete-header", expect_text: "Thank you for your order" },
];

function summarize(steps: JourneyStepEvidence[]) {
  return steps.map((step) => ({
    id: step.id,
    kind: step.kind,
    status: step.status,
    detail: step.detail,
    before_visible: step.before_visible,
    after_visible: step.after_visible,
    before_text: step.before_text,
    after_text: step.after_text,
    url_after: step.url_after,
  }));
}

async function run(input: { name: string; url: string; html?: string; steps: JourneyStepDefinition[] }) {
  const href = browserlessPathEndpoint("/function");
  if (!href) return { name: input.name, ok: false, error: "browserless_not_configured" };
  const endpoint = new URL(href);
  endpoint.searchParams.set("timeout", "90000");
  const started = Date.now();
  const response = await fetch(endpoint.href, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      code: buildJourneyFunctionCode(),
      context: {
        url: input.url,
        html: input.html,
        device_class: "desktop",
        steps: input.steps,
        credentials: {},
      },
    }),
  });
  const durationMs = Date.now() - started;
  if (!response.ok) {
    const detail = await response.text();
    return { name: input.name, ok: false, status: response.status, durationMs, detail: detail.slice(0, 240) };
  }
  const raw = await response.json() as { steps?: unknown; data?: { steps?: unknown } };
  const body = raw.data && typeof raw.data === "object" ? raw.data : raw;
  const steps = Array.isArray(body.steps) ? body.steps as JourneyStepEvidence[] : [];
  return {
    name: input.name,
    ok: true,
    durationMs,
    status: journeyRunStatus(steps),
    steps: summarize(steps),
  };
}

async function main() {
  loadEnvLocal();
  const only = process.argv[2] || "";
  const jobs = [
    only === "store" ? null : run({
      name: "signup-login-cart-checkout",
      url: "https://viewtrace.net/tests/journey",
      html: fixtureHtml,
      steps: fixtureSteps,
    }),
    only === "fixture" ? null : run({
      name: "saucedemo",
      url: "https://www.saucedemo.com/",
      steps: storeSteps,
    }),
  ].filter((job): job is ReturnType<typeof run> => job != null);
  const results = await Promise.all(jobs);
  console.log(JSON.stringify(results, null, 2));
  if (results.some((result) => result.ok !== true || result.status !== "passed")) process.exit(1);
}

main();
