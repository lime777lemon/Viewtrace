import assert from "node:assert/strict";
import { buildStateSessionFunction } from "../src/lib/state-session-function";
import { runStateMeasurementSession } from "../src/lib/state-measurement-session";
import { decodoStateParameter, decodoStateProxyUrl } from "../src/lib/state-proxy-provider";

const screenshotOnly = buildStateSessionFunction(["screenshot"]);
assert.equal(screenshotOnly.includes("runInteraction"), false);
assert.equal(screenshotOnly.includes("runJourney"), false);
assert.ok(screenshotOnly.indexOf("ipwho.is") < screenshotOnly.indexOf("page.screenshot"));
assert.ok(screenshotOnly.includes("if (requireState && !matched) return"));

const withInteraction = buildStateSessionFunction(["screenshot", "interaction"]);
assert.ok(withInteraction.includes("async function runInteraction(page, context)"));
assert.ok(withInteraction.indexOf("ipwho.is") < withInteraction.indexOf("await runInteraction"));
assert.equal(withInteraction.includes("runJourney"), false);

process.env.BROWSERLESS_TOKEN = "state-session-test";
process.env.BROWSERLESS_SCREENSHOT_URL = "https://example.test/screenshot";
delete process.env.VIEWTRACE_GEO_PROXY_URL_TEMPLATE;

async function main() {
const calls: string[] = [];
const png = Buffer.from("png-bytes").toString("base64");

const rejected = await runStateMeasurementSession({
  url: "https://example.com/",
  region: "US-CA",
  measures: ["screenshot"],
  countryFallback: true,
  fetchImpl: async (url) => {
    const href = String(url);
    calls.push(href);
    if (href.includes("proxyState=")) {
      return new Response("plan rejected", { status: 401 });
    }
    return new Response(JSON.stringify({
      matched: false,
      country: "US",
      state: null,
      measurements: ["screenshot"],
      png,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  },
});
assert.equal(rejected.stateVerified, false);
assert.equal(rejected.stateTargetingRejected, true);
assert.equal(rejected.fallbackLevel, "country");
assert.equal(rejected.geoAttempts, 2);
assert.ok(rejected.png);
assert.equal(calls.filter((href) => href.includes("proxyState=")).length, 1);
assert.equal(calls.filter((href) => href.includes("proxyCountry=")).length, 2);

calls.length = 0;
const verified = await runStateMeasurementSession({
  url: "https://example.com/",
  region: "US-CA",
  measures: ["screenshot", "interaction"],
  countryFallback: true,
  fetchImpl: async () => new Response(JSON.stringify({
    matched: true,
    country: "US",
    state: "CA",
    measurements: ["screenshot", "interaction"],
    png,
    interaction: { types: [] },
  }), { status: 200, headers: { "Content-Type": "application/json" } }),
});
assert.equal(verified.stateVerified, true);
assert.equal(verified.fallbackLevel, "state");
assert.deepEqual(verified.verifiedMeasurements, ["screenshot", "interaction"]);
assert.equal(verified.geoAttempts, 1);
assert.ok(verified.interaction);

assert.equal(decodoStateParameter("US-CA"), "us_california");
assert.equal(decodoStateParameter("US-NY"), "us_new_york");
assert.equal(decodoStateParameter("US-RI"), "us_rhode_island");
process.env.VIEWTRACE_DECODO_PROXY_USERNAME = "viewtrace";
process.env.VIEWTRACE_DECODO_PROXY_PASSWORD = "test-pass";
const first = decodoStateProxyUrl("US-CA", "abc123");
const second = decodoStateProxyUrl("US-TX", "def456");
assert.ok(first && second);
const firstUrl = new URL(first);
const secondUrl = new URL(second);
assert.equal(firstUrl.hostname, "gate.decodo.com");
assert.equal(firstUrl.port, "7000");
assert.equal(firstUrl.username, "user-viewtrace-country-us-state-us_california-session-abc123-sessionduration-15");
assert.equal(secondUrl.username, "user-viewtrace-country-us-state-us_texas-session-def456-sessionduration-15");
assert.notEqual(firstUrl.username, secondUrl.username);

const decodoCalls: string[] = [];
const decodoRun = await runStateMeasurementSession({
  url: "https://example.com/",
  region: "US-CA",
  measures: ["screenshot"],
  countryFallback: true,
  fetchImpl: async (url) => {
    const href = String(url);
    decodoCalls.push(href);
    const endpoint = new URL(href);
    if (endpoint.searchParams.has("proxyState")) {
      return new Response("plan rejected", { status: 401 });
    }
    const proxy = endpoint.searchParams.get("externalProxyServer");
    if (proxy) {
      return new Response(JSON.stringify({
        matched: false,
        country: "US",
        state: "NV",
        measurements: [],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({
      matched: false,
      country: "US",
      state: null,
      measurements: ["screenshot"],
      png,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  },
});
assert.equal(decodoRun.stateVerified, false);
assert.equal(decodoRun.stateTargetingRejected, false);
assert.equal(decodoRun.fallbackLevel, "country");
assert.equal(decodoRun.geoAttempts, 5);
assert.ok(decodoCalls[0]?.includes("proxyState="));
const sticky = decodoCalls
  .map((href) => new URL(href).searchParams.get("externalProxyServer"))
  .filter((value): value is string => Boolean(value))
  .map((value) => new URL(value).username);
assert.equal(sticky.length, 3);
assert.equal(new Set(sticky).size, 3);
assert.ok(sticky.every((user) => user.includes("state-us_california-session-")));
delete process.env.VIEWTRACE_DECODO_PROXY_USERNAME;
delete process.env.VIEWTRACE_DECODO_PROXY_PASSWORD;

console.log("state session ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
