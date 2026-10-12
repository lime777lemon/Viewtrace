import assert from "node:assert/strict";

function resolveBrowserlessResidentialTarget(regionValue) {
  const rv = String(regionValue).trim();
  const us = rv.match(/^US-([A-Z]{2})$/);
  if (us) {
    const code = us[1];
    const cities = { CA: "losangeles", FL: "miami" };
    const names = { CA: "california", FL: "florida" };
    return {
      country: "us",
      state: names[code],
      stateCode: code,
      city: cities[code],
    };
  }
  if (/^[A-Z]{2}$/.test(rv)) {
    return { country: rv.toLowerCase() };
  }
  return null;
}

function buildBrowserlessResidentialSearchParams(regionRaw, includeState, includeCity = false) {
  const target = resolveBrowserlessResidentialTarget(regionRaw);
  if (!target) return null;
  const params = new URLSearchParams();
  params.set("proxy", "residential");
  params.set("proxyCountry", target.country);
  if (includeState && target.state) {
    params.set("proxyState", target.state);
  } else if (includeCity && target.city) {
    params.set("proxyCity", target.city);
  }
  params.set("proxySticky", "true");
  return params;
}

const usCountry = buildBrowserlessResidentialSearchParams("US-CA", false);
assert.equal(usCountry.get("proxy"), "residential");
assert.equal(usCountry.get("proxyCountry"), "us");
assert.equal(usCountry.has("proxyState"), false);
assert.equal(usCountry.has("proxyCity"), false);

const usState = buildBrowserlessResidentialSearchParams("US-CA", true);
assert.equal(usState.get("proxyState"), "california");
assert.equal(usState.has("proxyCity"), false);

const usCity = buildBrowserlessResidentialSearchParams("US-FL", false, true);
assert.equal(usCity.get("proxyCountry"), "us");
assert.equal(usCity.get("proxyCity"), "miami");
assert.equal(usCity.has("proxyState"), false);

const jp = buildBrowserlessResidentialSearchParams("JP", true);
assert.equal(jp.get("proxyCountry"), "jp");
assert.equal(jp.has("proxyState"), false);
assert.equal(jp.has("proxyCity"), false);

console.log("observation-browserless-proxy-params ok");
