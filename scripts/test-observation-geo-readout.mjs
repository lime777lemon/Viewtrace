import assert from "node:assert/strict";

const COPY = {
  requestedObserved: "Requested: {requested} / Observed via: {observed}",
};

function countryCodeDisplayName(code) {
  const map = { us: "United States", jp: "Japan" };
  const key = String(code).trim().toLowerCase();
  return map[key] ?? String(code).trim().toUpperCase();
}

function normalizeObservationRegionInput(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function countryLabelFromRegionInput(regionInput) {
  const n = normalizeObservationRegionInput(regionInput);
  if (!n) return null;
  if (/^US-[A-Z]{2}$/.test(n) || n === "US") return countryCodeDisplayName("us");
  if (/^JP-\d{2}$/.test(n) || n === "JP") return countryCodeDisplayName("jp");
  if (/^[A-Z]{2}$/.test(n)) return countryCodeDisplayName(n);
  return null;
}

function observedFromConditions(conditions) {
  if (!conditions) return null;
  const mode = conditions.geo.proxy_mode;
  if (mode === "retry_without_proxy" || mode === "none") return null;
  const country = conditions.geo.country?.trim();
  const state = conditions.geo.state?.trim();
  if (!country) return null;
  const countryLabel = countryCodeDisplayName(country);
  if (state) return `${countryLabel} · ${state}`;
  return countryLabel;
}

function observationGeoReadout({ requestedLabel, captureConditions }) {
  const observedLabel = observedFromConditions(captureConditions);
  if (!captureConditions) {
    return { headline: requestedLabel, distinguish: false, detailLine: null };
  }
  const requestedUsState = /^US-/i.test(captureConditions.region_input);
  const distinguish = Boolean(observedLabel && requestedUsState && !captureConditions.geo.state);
  if (distinguish && observedLabel) {
    return {
      headline: observedLabel,
      distinguish: true,
      detailLine: COPY.requestedObserved
        .replace("{requested}", requestedLabel)
        .replace("{observed}", observedLabel),
    };
  }
  if (observedLabel) {
    return { headline: requestedLabel, distinguish: false, detailLine: null };
  }
  const headline =
    countryLabelFromRegionInput(captureConditions.region_input) ?? requestedLabel;
  return { headline, distinguish: false, detailLine: null };
}

const countryOnlyUsCa = observationGeoReadout({
  requestedLabel: "US · California",
  captureConditions: {
    region_input: "US-CA",
    geo: { country: "us", state: null, proxy_mode: "browserless_residential" },
  },
});
assert.equal(countryOnlyUsCa.distinguish, true);
assert.equal(countryOnlyUsCa.headline, "United States");
assert.equal(countryOnlyUsCa.headline.includes("California"), false);
assert.equal(
  countryOnlyUsCa.detailLine,
  "Requested: US · California / Observed via: United States",
);

const stateApplied = observationGeoReadout({
  requestedLabel: "US · California",
  captureConditions: {
    region_input: "US-CA",
    geo: { country: "us", state: "california", proxy_mode: "browserless_residential" },
  },
});
assert.equal(stateApplied.distinguish, false);
assert.equal(stateApplied.headline, "US · California");

const retry = observationGeoReadout({
  requestedLabel: "US · California",
  captureConditions: {
    region_input: "US-CA",
    geo: { country: null, state: null, proxy_mode: "retry_without_proxy" },
  },
});
assert.equal(retry.distinguish, false);
assert.equal(retry.headline, "United States");
assert.equal(retry.headline.includes("California"), false);
assert.equal(retry.headline.includes("geo proxy"), false);

const japan = observationGeoReadout({
  requestedLabel: "Japan",
  captureConditions: {
    region_input: "JP",
    geo: { country: "jp", state: null, proxy_mode: "browserless_residential" },
  },
});
assert.equal(japan.distinguish, false);
assert.equal(japan.headline, "Japan");

console.log("observation-geo-readout ok");
