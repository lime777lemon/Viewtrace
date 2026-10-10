import assert from "node:assert/strict";

const CRITICAL = 25;
const IMPORTANT = 10;
const MINOR = 3;

function text(value) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function hasAny(signals) {
  return Boolean(
    signals.document_title ||
      signals.meta_description ||
      signals.canonical_url ||
      signals.robots_meta ||
      signals.x_robots_tag ||
      signals.og_title ||
      signals.og_description ||
      signals.og_image ||
      signals.html_lang ||
      signals.viewport ||
      signals.twitter_card ||
      (signals.http_status != null && signals.http_status > 0) ||
      signals.noindex === true ||
      signals.canonical_mismatch === true,
  );
}

function scorePageSignals(signals) {
  if (!signals || !hasAny(signals)) return null;
  const reasons = [];
  if (typeof signals.http_status === "number" && signals.http_status >= 400) {
    reasons.push({ id: "http_error", points: CRITICAL });
  }
  if (signals.noindex === true) reasons.push({ id: "noindex", points: CRITICAL });
  if (signals.canonical_mismatch === true) reasons.push({ id: "canonical_mismatch", points: CRITICAL });
  if (!text(signals.document_title)) reasons.push({ id: "title_missing", points: IMPORTANT });
  if (!text(signals.meta_description)) reasons.push({ id: "description_missing", points: IMPORTANT });
  if (!text(signals.canonical_url)) reasons.push({ id: "canonical_missing", points: IMPORTANT });
  if (!text(signals.robots_meta) && !text(signals.x_robots_tag)) {
    reasons.push({ id: "robots_missing", points: IMPORTANT });
  }
  const ogTitle = text(signals.og_title);
  const ogDescription = text(signals.og_description);
  const ogImage = text(signals.og_image);
  if (!ogTitle && !ogDescription && !ogImage) {
    reasons.push({ id: "og_missing", points: IMPORTANT });
  } else {
    if (!ogTitle) reasons.push({ id: "og_title_missing", points: MINOR });
    if (!ogDescription) reasons.push({ id: "og_description_missing", points: MINOR });
    if (!ogImage) reasons.push({ id: "og_image_missing", points: MINOR });
  }
  if (!text(signals.html_lang)) reasons.push({ id: "lang_missing", points: MINOR });
  if (!text(signals.viewport)) reasons.push({ id: "viewport_missing", points: MINOR });
  if (
    !text(signals.twitter_card) &&
    !text(signals.twitter_title) &&
    !text(signals.twitter_description) &&
    !text(signals.twitter_image)
  ) {
    reasons.push({ id: "twitter_missing", points: MINOR });
  }
  if (!text(signals.final_url)) reasons.push({ id: "final_url_missing", points: MINOR });
  const score = Math.max(0, 100 - reasons.reduce((sum, row) => sum + row.points, 0));
  const band = score >= 85 ? "good" : score >= 60 ? "review" : "attention";
  return { score, band, reasons };
}

const healthy = {
  document_title: "Hello",
  meta_description: "Desc",
  canonical_url: "https://example.com/",
  robots_meta: "index,follow",
  og_title: "Hello",
  og_description: "Desc",
  og_image: "https://example.com/og.jpg",
  html_lang: "en",
  viewport: "width=device-width",
  twitter_card: "summary",
  http_status: 200,
  final_url: "https://example.com/",
  noindex: false,
  canonical_mismatch: false,
};

assert.equal(scorePageSignals(null), null);
assert.equal(scorePageSignals({}), null);

const full = scorePageSignals(healthy);
assert.equal(full.score, 100);
assert.equal(full.band, "good");
assert.equal(full.reasons.length, 0);

const noindex = scorePageSignals({ ...healthy, noindex: true });
assert.equal(noindex.score, 75);
assert.equal(noindex.band, "review");
assert.ok(noindex.reasons.some((row) => row.id === "noindex"));

const httpError = scorePageSignals({ ...healthy, http_status: 503 });
assert.equal(httpError.score, 75);

const titleOnly = scorePageSignals({ ...healthy, document_title: "" });
assert.equal(titleOnly.score, 90);
assert.equal(titleOnly.band, "good");

const gaps = scorePageSignals({
  ...healthy,
  document_title: "",
  meta_description: "",
  og_title: "",
  og_description: "",
  og_image: "",
});
assert.equal(gaps.score, 70);
assert.equal(gaps.band, "review");

const stacked = scorePageSignals({
  ...healthy,
  noindex: true,
  http_status: 500,
  document_title: "",
});
assert.equal(stacked.score, 40);
assert.equal(stacked.band, "attention");

console.log("ok");
