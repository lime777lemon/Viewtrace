import assert from "node:assert/strict";
import { finalizePageSeoScore } from "../src/lib/observation-page-seo-score";
import {
  buildObservationSeoFacts,
  decideRobotsPath,
  type ObservationSeoFactsV1,
} from "../src/lib/observation-seo-facts";
import {
  parseRobotsDirectives,
  type ObservationWebFactsV1,
} from "../src/lib/observation-web-facts";
import {
  extractHtmlHeadSignals,
  readHtmlPreviewDocument,
  type HtmlHeadSignalsV1,
} from "../src/lib/url-preview";

function signals(partial: Partial<HtmlHeadSignalsV1> = {}): HtmlHeadSignalsV1 {
  return {
    document_title: null,
    meta_description: null,
    canonical_url: null,
    robots_meta: null,
    x_robots_tag: null,
    og_title: null,
    og_description: null,
    og_image: null,
    json_ld_types: [],
    ...partial,
  };
}

function robotsFact(text: string): ObservationWebFactsV1["robots"] {
  return {
    key: "robots_txt",
    url: "https://example.com/robots.txt",
    status: 200,
    present: true,
    content_type: "text/plain",
    bytes_read: text.length,
    sha256: null,
    truncated: false,
    redirects: [],
    error: null,
    directives: parseRobotsDirectives(text),
  };
}

function webFacts(
  robots: ObservationWebFactsV1["robots"],
  http?: Partial<ObservationWebFactsV1["http"]>,
): ObservationWebFactsV1 {
  return {
    schema_version: 1,
    observed_at: "2026-10-21T00:00:00.000Z",
    target_host: "example.com",
    network_path: "server_direct",
    note: "Separate from screenshot capture and requested region",
    html: {
      sample_sha256: null,
      sample_bytes: 0,
      sample_truncated: false,
      hash_scope: "head_or_prefix",
    },
    http: {
      status: 200,
      final_url: "https://example.com/private/secret",
      via_proxy: false,
      headers: {},
      ...http,
    },
    dns: {
      hostname: "example.com",
      resolver_scope: "server_system",
      records: { a: [], aaaa: [], cname: [], mx: [], ns: [], txt: [], caa: [] },
      errors: [],
      truncated: false,
    },
    robots,
    well_known: [],
  };
}

function row(facts: ObservationSeoFactsV1, id: ObservationSeoFactsV1["facts"][number]["id"]) {
  const found = facts.facts.find((item) => item.id === id);
  assert.ok(found, id);
  return found;
}

const robotsText = `
User-agent: *
Disallow: /private
Allow: /private/public
Sitemap: https://example.com/sitemap.xml

User-agent: Googlebot
Disallow: /
`;
const directives = parseRobotsDirectives(robotsText);
assert.equal(decideRobotsPath(directives, "/private/secret").state, "disallowed");
assert.equal(decideRobotsPath(directives, "/private/public").state, "allowed");
assert.equal(decideRobotsPath(directives, "/blog").state, "allowed");
assert.equal(
  decideRobotsPath(
    parseRobotsDirectives("User-agent: *\nDisallow: /fish\nAllow: /fish\n"),
    "/fish",
  ).state,
  "allowed",
);
assert.equal(
  decideRobotsPath(parseRobotsDirectives("User-agent: Googlebot\nDisallow: /secret\n"), "/secret").state,
  "unknown",
);

const facts = buildObservationSeoFacts({
  requestedUrl: "https://example.com/private/secret",
  html: signals({
    document_title: null,
    meta_description: "A page",
    canonical_url: "https://example.com/other",
    robots_meta: "none",
    html_lang: "en",
    final_url: "https://example.com/private/secret",
    http_status: 200,
  }),
  webFacts: webFacts(robotsFact(robotsText)),
});
assert.ok(facts);
assert.equal(facts.scope, "single_url");
assert.equal("score" in facts, false);
assert.equal(row(facts, "document_title").state, "absent");
assert.equal(row(facts, "meta_description").state, "present");
assert.equal(row(facts, "canonical_vs_final").state, "mismatch");
assert.equal(row(facts, "noindex").state, "present");
assert.equal(row(facts, "nofollow").state, "present");
assert.equal(row(facts, "robots_txt_path").state, "disallowed");
assert.equal(row(facts, "sitemap_declared").state, "present");
assert.match(row(facts, "sitemap_declared").value ?? "", /sitemap\.xml/);
assert.equal(row(facts, "requested_vs_final").state, "match");

const headerOnly = buildObservationSeoFacts({
  requestedUrl: "https://example.com/",
  html: null,
  webFacts: webFacts(robotsFact("User-agent: *\nAllow: /\n"), {
    status: 200,
    final_url: "https://example.com/",
    headers: { "x-robots-tag": "noindex" },
  }),
});
assert.ok(headerOnly);
assert.equal(row(headerOnly, "document_title").state, "unknown");
assert.equal(row(headerOnly, "x_robots_tag").state, "present");
assert.equal(row(headerOnly, "noindex").state, "present");
assert.equal(row(headerOnly, "noindex").source, "http");

assert.equal(
  buildObservationSeoFacts({ requestedUrl: "https://example.com/", html: null, webFacts: null }),
  null,
);

function scoredHtml(partial: Partial<HtmlHeadSignalsV1> = {}): HtmlHeadSignalsV1 {
  return signals({
    document_title: "Title",
    meta_description: "Description",
    canonical_url: "https://example.com/",
    robots_meta: "index,follow",
    html_lang: "en",
    viewport: "width=device-width",
    og_title: "Title",
    og_description: "Description",
    og_image: "https://example.com/og.png",
    json_ld_types: ["WebPage"],
    h1_count: 1,
    body_scan: "complete",
    http_status: 200,
    final_url: "https://example.com/",
    ...partial,
  });
}

const perfect = buildObservationSeoFacts({
  requestedUrl: "https://example.com/",
  html: scoredHtml(),
  webFacts: webFacts(robotsFact("User-agent: *\nAllow: /\n"), {
    status: 200,
    final_url: "https://example.com/",
  }),
});
assert.ok(perfect?.page_seo_score);
assert.equal(perfect.page_seo_score.score, 100);
assert.equal(perfect.page_seo_score.possible, 100);
assert.equal(perfect.page_seo_score.not_measured_count, 0);
assert.equal(perfect.page_seo_score.label, "page_seo_score");
assert.equal(perfect.page_seo_score.scope, "single_url");

const mixed = buildObservationSeoFacts({
  requestedUrl: "https://example.com/private/secret",
  html: scoredHtml({
    h1_count: 3,
    og_image: null,
    json_ld_types: [],
    canonical_url: "https://example.com/other",
    final_url: "https://example.com/private/secret",
  }),
  webFacts: webFacts(robotsFact("User-agent: *\nDisallow: /private\n"), {
    status: 200,
    final_url: "https://example.com/private/secret",
  }),
});
const mixedScore = mixed?.page_seo_score;
assert.ok(mixedScore);
assert.equal(mixedScore.signals.find((row) => row.id === "h1")?.earned, 5);
assert.equal(mixedScore.signals.find((row) => row.id === "h1")?.detail, "Multiple");
assert.equal(mixedScore.signals.find((row) => row.id === "open_graph")?.earned, 4);
assert.equal(mixedScore.signals.find((row) => row.id === "structured_data")?.earned, 0);
assert.equal(mixedScore.signals.find((row) => row.id === "robots_txt")?.earned, 0);
assert.equal(mixedScore.signals.find((row) => row.id === "canonical")?.earned, 5);

const withoutRobots = buildObservationSeoFacts({
  requestedUrl: "https://example.com/",
  html: scoredHtml(),
  webFacts: null,
});
const withoutRobotsScore = withoutRobots?.page_seo_score;
assert.ok(withoutRobotsScore);
const robotsSignal = withoutRobotsScore.signals.find((row) => row.id === "robots_txt");
assert.equal(robotsSignal?.verdict, "not_measured");
assert.equal(robotsSignal?.earned, null);
assert.equal(withoutRobotsScore.possible, 90);
assert.equal(withoutRobotsScore.score, 100);

const partialH1 = buildObservationSeoFacts({
  requestedUrl: "https://example.com/",
  html: scoredHtml({ h1_count: 1, body_scan: "partial" }),
  webFacts: webFacts(robotsFact("User-agent: *\nAllow: /\n"), {
    status: 200,
    final_url: "https://example.com/",
  }),
});
const partialScore = partialH1?.page_seo_score;
assert.ok(partialScore);
assert.equal(partialScore.signals.find((row) => row.id === "h1")?.verdict, "not_measured");
assert.equal(partialScore.possible, 90);

const formula = finalizePageSeoScore([
  { id: "title", weight: 85, earned: 70, verdict: "partial", detail: null },
  { id: "robots_txt", weight: 15, earned: null, verdict: "not_measured", detail: null },
]);
assert.equal(formula.score, 82);
assert.equal(formula.earned, 70);
assert.equal(formula.possible, 85);
assert.equal(formula.measured_count, 1);
assert.equal(formula.not_measured_count, 1);

function textStream(parts: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index >= parts.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(parts[index]));
      index += 1;
    },
  });
}

void (async () => {
  const scanned = await readHtmlPreviewDocument(
    textStream([
      "<html><head><title>T</title></head>",
      '<body><h1>A</h1><h1>B</h1><script type="application/ld+json">{"@type":"Article"}</script></body>',
    ]),
  );
  assert.equal(scanned.complete, true);
  assert.equal(scanned.head.includes("<h1"), false);
  const scannedSignals = extractHtmlHeadSignals(scanned.head, "https://example.com/", null, 200, {
    html: scanned.body,
    complete: scanned.complete,
  });
  assert.equal(scannedSignals.h1_count, 2);
  assert.equal(scannedSignals.body_scan, "complete");
  assert.deepEqual(scannedSignals.json_ld_types, ["Article"]);
  console.log("test-observation-seo-facts: ok");
})().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
