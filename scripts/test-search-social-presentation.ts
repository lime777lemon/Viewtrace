import assert from "node:assert/strict";
import { presentSearchSocial, searchSocialLanguageName } from "../src/lib/search-social-presentation";
import type { HtmlHeadSignalsV1 } from "../src/lib/url-preview";

function signals(overrides: Partial<HtmlHeadSignalsV1> = {}): HtmlHeadSignalsV1 {
  return {
    document_title: "IP Data Intelligence for Developers &amp; Enterprises | IPinfo",
    meta_description: "IPinfo, the trusted global leader in IP address data.",
    canonical_url: "https://ipinfo.io/",
    robots_meta: null,
    x_robots_tag: null,
    og_title: "IPinfo | The Trusted IP Data Provider",
    og_description: "IPinfo delivers fast, accurate, and reliable IP data.",
    og_image: "https://website-cdn.assets.ipinfo.io/images/og/og_homepage.jpg",
    json_ld_types: ["Service", "Organization"],
    html_lang: "en",
    viewport: "width=device-width, initial-scale=1",
    twitter_card: "summary_large_image",
    twitter_title: "IPinfo | The Trusted IP Data Provider",
    twitter_description: "Access trusted IP data.",
    twitter_image: "https://website-cdn.assets.ipinfo.io/images/twitter/twitter_homepage.jpg",
    http_status: 200,
    final_url: "https://ipinfo.io/",
    noindex: null,
    canonical_mismatch: false,
    ...overrides,
  };
}

const view = presentSearchSocial({
  signals: signals(),
  requestedUrl: "https://ipinfo.io/",
  previous: signals({
    document_title: "IP Data Intelligence | IPinfo",
    og_image: "https://website-cdn.assets.ipinfo.io/images/og/old.jpg",
  }),
});

assert.equal(view.search.title, "IP Data Intelligence for Developers & Enterprises | IPinfo");
assert.equal(view.search.host, "ipinfo.io");
assert.equal(view.social.imageUrl.startsWith("https://"), true);
assert.equal(view.twitter?.imageUrl.includes("twitter_homepage"), true);
assert.equal(view.facts.some((fact) => fact.kind === "noindex" && fact.observed === false), true);
assert.equal(view.facts.some((fact) => fact.kind === "canonical" && fact.matches === true), true);
assert.equal(view.facts.some((fact) => fact.kind === "redirect" && fact.observed === false), true);
assert.deepEqual(view.structured, ["Service", "Organization"]);
assert.equal(view.missing.length, 0);
assert.equal(view.compared, true);
assert.deepEqual(
  view.changes.map((row) => row.id),
  ["search_title", "social_image"],
);
assert.equal(searchSocialLanguageName("en", "ja"), "英語");
assert.equal(searchSocialLanguageName("en", "en"), "English");

const same = presentSearchSocial({ signals: signals(), previous: signals() });
assert.equal(same.changes.length, 0);
assert.equal(same.compared, true);

console.log("ok");
