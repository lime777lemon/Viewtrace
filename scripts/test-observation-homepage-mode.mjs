import assert from "node:assert/strict";

function parseHomepageObservationMode(raw) {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value === "live_check" || value === "share_clip") return value;
  return "still";
}

function isHomepageVideoContentType(contentType) {
  const ct = (contentType ?? "").trim().toLowerCase();
  return ct.startsWith("video/");
}

function homepageObservationModeFromConditions(conditions) {
  const mode = conditions?.homepage_observation?.mode;
  if (mode === "live_check" || mode === "share_clip") return mode;
  const surface = conditions?.engine?.browserless?.api_surface;
  if (surface === "live_bql") return "live_check";
  if (surface === "screencast_v2") return "share_clip";
  return "still";
}

assert.equal(parseHomepageObservationMode(null), "still");
assert.equal(parseHomepageObservationMode("still"), "still");
assert.equal(parseHomepageObservationMode("live_check"), "live_check");
assert.equal(parseHomepageObservationMode("share_clip"), "share_clip");
assert.equal(parseHomepageObservationMode("burst"), "still");
assert.equal(isHomepageVideoContentType("video/webm"), true);
assert.equal(isHomepageVideoContentType("image/webp"), false);
assert.equal(
  homepageObservationModeFromConditions({
    homepage_observation: { mode: "live_check", sequential_stills: false },
  }),
  "live_check",
);
assert.equal(
  homepageObservationModeFromConditions({
    engine: { browserless: { api_surface: "screencast_v2" } },
  }),
  "share_clip",
);
assert.equal(
  homepageObservationModeFromConditions({
    engine: { browserless: { api_surface: "screenshot_v2" } },
  }),
  "still",
);

console.log("ok");
