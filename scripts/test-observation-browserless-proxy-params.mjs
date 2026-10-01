import assert from "node:assert/strict";

function resolveBrowserlessResidentialTarget(regionValue) {
  const rv = String(regionValue).trim();
  const us = rv.match(/^US-([A-Z]{2})$/);
  if (us) {
    return { country: "us", state: "california" };
  }
  if (/^[A-Z]{2}$/.test(rv)) {
    return { country: rv.toLowerCase() };
  }
  return null;
}

function buildBrowserlessResidentialSearchParams(regionRaw, includeState) {
  const target = resolveBrowserlessResidentialTarget(regionRaw);
  if (!target) return null;
  const params = new URLSearchParams();
  params.set("proxy", "residential");
  params.set("proxyCountry", target.country);
  if (includeState && target.state) {
    params.set("proxyState", target.state);
  }
  params.set("proxySticky", "true");
  return params;
}

const usCountry = buildBrowserlessResidentialSearchParams("US-CA", false);
assert.equal(usCountry.get("proxy"), "residential");
assert.equal(usCountry.get("proxyCountry"), "us");
assert.equal(usCountry.has("proxyState"), false);

const usState = buildBrowserlessResidentialSearchParams("US-CA", true);
assert.equal(usState.get("proxyState"), "california");

const jp = buildBrowserlessResidentialSearchParams("JP", true);
assert.equal(jp.get("proxyCountry"), "jp");
assert.equal(jp.has("proxyState"), false);

console.log("observation-browserless-proxy-params ok");
