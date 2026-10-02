import assert from "node:assert/strict";

function text(value) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function classifyHtmlHeadSignals(signals) {
  const blockers = [];
  const gaps = [];
  if (signals.noindex === true) blockers.push("noindex");
  if (typeof signals.http_status === "number" && signals.http_status >= 400) {
    blockers.push("http_error");
  }
  if (signals.canonical_mismatch === true) blockers.push("canonical_mismatch");
  if (!text(signals.document_title)) gaps.push("title_missing");
  if (!text(signals.meta_description)) gaps.push("description_missing");
  if (!text(signals.og_title) && !text(signals.og_description) && !text(signals.og_image)) {
    gaps.push("og_missing");
  }
  return { blockers, gaps };
}

function watchMetadataChanged(previous, current) {
  if (!previous || !current) return { changed: false, fields: [] };
  const fields = [];
  if (text(previous.document_title) !== text(current.document_title)) fields.push("title");
  if (text(previous.canonical_url) !== text(current.canonical_url)) fields.push("canonical");
  if ((previous.noindex === true) !== (current.noindex === true)) fields.push("noindex");
  return { changed: fields.length > 0, fields };
}

function shouldNotifyWatchOnMetadata(params) {
  if (!params.notifyOnMetadata || params.alreadyNotifiedThisRun) {
    return { send: false, fields: [] };
  }
  const result = watchMetadataChanged(params.previous, params.current);
  return { send: result.changed, fields: result.fields };
}

const empty = classifyHtmlHeadSignals({
  document_title: null,
  meta_description: null,
  canonical_url: null,
  robots_meta: null,
  x_robots_tag: null,
  og_title: null,
  og_description: null,
  og_image: null,
  json_ld_types: [],
});
assert.deepEqual(empty.blockers, []);
assert.deepEqual(empty.gaps, ["title_missing", "description_missing", "og_missing"]);

const blocked = classifyHtmlHeadSignals({
  document_title: "Home",
  meta_description: "Hello",
  canonical_url: "https://example.com/a",
  robots_meta: "noindex",
  x_robots_tag: null,
  og_title: "OG",
  og_description: null,
  og_image: null,
  json_ld_types: [],
  http_status: 403,
  noindex: true,
  canonical_mismatch: true,
});
assert.deepEqual(blocked.blockers, ["noindex", "http_error", "canonical_mismatch"]);
assert.deepEqual(blocked.gaps, []);

const same = watchMetadataChanged(
  { document_title: " A  title ", canonical_url: "https://example.com/", noindex: false },
  { document_title: "A title", canonical_url: "https://example.com/", noindex: null },
);
assert.equal(same.changed, false);

const changed = watchMetadataChanged(
  { document_title: "Old", canonical_url: "https://example.com/a", noindex: false },
  { document_title: "New", canonical_url: "https://example.com/b", noindex: true },
);
assert.deepEqual(changed.fields, ["title", "canonical", "noindex"]);

assert.equal(
  shouldNotifyWatchOnMetadata({
    notifyOnMetadata: false,
    alreadyNotifiedThisRun: false,
    previous: { document_title: "A" },
    current: { document_title: "B" },
  }).send,
  false,
);
assert.equal(
  shouldNotifyWatchOnMetadata({
    notifyOnMetadata: true,
    alreadyNotifiedThisRun: true,
    previous: { document_title: "A" },
    current: { document_title: "B" },
  }).send,
  false,
);
assert.equal(
  shouldNotifyWatchOnMetadata({
    notifyOnMetadata: true,
    alreadyNotifiedThisRun: false,
    previous: { document_title: "A" },
    current: { document_title: "B" },
  }).send,
  true,
);
assert.equal(watchMetadataChanged(undefined, { document_title: "B" }).changed, false);

console.log("ok: observation-html-signals-readout");
