import assert from "node:assert/strict";
import type { CaptureConditionsV1 } from "../src/lib/capture-conditions";
import { presentCaptureConditions, regionalVerification } from "../src/lib/capture-conditions-presentation";

function conditions(patch: Partial<CaptureConditionsV1> & { geo: CaptureConditionsV1["geo"] }): CaptureConditionsV1 {
  return {
    schema_version: 1,
    captured_at: "2026-10-23T09:42:00.000Z",
    region_input: "US-NY",
    region_label: "US · New York",
    full_page_requested: true,
    device_class: "desktop",
    browser: {
      family: "chromium",
      channel: "headless",
      user_agent: "Mozilla/5.0",
      accept_language: "en-US",
    },
    viewport: { width: null, height: null, device_scale_factor: 1, source: "browserless_implicit_default" },
    engine: {
      name: "browserless",
      browserless: {
        endpoint_host: "production-sfo.browserless.io",
        api_surface: "screenshot_v2",
        wait_until: "networkidle2",
        goto_timeout_ms: 30000,
        upstream_image_format: "png",
        storage_format: "webp",
        webp_quality: 80,
      },
    },
    result: {
      image_width_px: 784,
      image_height_px: 7455,
      snapshot_bytes: 352300,
      snapshot_content_type: "image/webp",
      snapshot_sha256_present: true,
    },
    cost_signals: {
      duration_ms: 40800,
      estimated_time_units: 4,
      proxy_bytes: null,
      proxy_bytes_measured_attempts: 0,
      fallback: true,
      screenshot_bytes: 352300,
      attempts: 3,
    },
    ...patch,
  };
}

const fallback = conditions({
  geo: { country: null, state: null, proxy_mode: "retry_without_proxy", proxy_provider: null, proxy_sticky: null },
});
assert.equal(regionalVerification(fallback), "not_verified");
const fallbackView = presentCaptureConditions(fallback, "en");
assert.equal(fallbackView.customer.region, "US · New York");
assert.equal(fallbackView.customer.regionalVerificationLabel, "Not verified");
assert.equal(fallbackView.customer.environment, "Desktop · Chromium");
assert.equal(fallbackView.customer.viewport, "Browser default");
assert.equal(fallbackView.technical.engine, "Browserless");
assert.equal(fallbackView.technical.api, "screenshot_v2");
assert.equal(JSON.stringify(fallbackView).includes("production-sfo.browserless.io"), false);
assert.equal(JSON.stringify(fallbackView.customer).includes("attempts"), false);
assert.equal(JSON.stringify(fallbackView.customer).includes("proxy"), false);

const verified = conditions({
  geo: {
    country: "us",
    state: "NY",
    proxy_mode: "browserless_residential",
    proxy_provider: "browserless",
    proxy_sticky: true,
    state_verified: true,
  },
  cost_signals: {
    duration_ms: 12000,
    estimated_time_units: 1,
    proxy_bytes: 1000,
    proxy_bytes_measured_attempts: 1,
    fallback: false,
    screenshot_bytes: 1000,
    attempts: 1,
  },
});
assert.equal(regionalVerification(verified), "verified");

const countryOnly = conditions({
  geo: { country: "us", state: null, proxy_mode: "browserless_residential", proxy_provider: "browserless", proxy_sticky: true },
});
assert.equal(regionalVerification(countryOnly), "not_verified");

const copiedState = conditions({
  geo: { country: "us", state: "NY", proxy_mode: "browserless_residential", proxy_provider: "browserless", proxy_sticky: true },
});
assert.equal(regionalVerification(copiedState), "not_verified");

const rejected = conditions({
  geo: {
    country: "us",
    state: null,
    proxy_mode: "browserless_residential",
    proxy_provider: "browserless",
    proxy_sticky: true,
    state_verified: false,
    state_targeting_rejected: true,
  },
});
const rejectedView = presentCaptureConditions(rejected, "ja");
assert.equal(rejectedView.customer.regionalVerificationLabel, "未確認");
assert.equal(rejectedView.customer.regionalNote, "State-level proxying unavailable on current provider plan");
const verifiedView = presentCaptureConditions(verified, "ja");
assert.equal(verifiedView.customer.regionalVerificationLabel, "Screenshot を州単位で確認済み");
assert.match(verifiedView.customer.regionalNote ?? "", /Screenshot/);

console.log("ok");
