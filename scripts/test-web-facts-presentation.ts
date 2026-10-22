import assert from "node:assert/strict";
import { presentWebFacts } from "../src/lib/web-facts-presentation";
import type { ObservationWebFactsV1, ObservationWebResourceFactV1 } from "../src/lib/observation-web-facts";

function resource(
  key: ObservationWebResourceFactV1["key"],
  url: string,
  status: number | null,
  present: boolean | null,
  error: ObservationWebResourceFactV1["error"] = null,
): ObservationWebResourceFactV1 {
  return {
    key,
    url,
    status,
    present,
    content_type: present ? "text/plain" : null,
    bytes_read: present ? 80 : 0,
    sha256: present ? "abc" : null,
    truncated: false,
    redirects: [],
    error,
  };
}

const facts: ObservationWebFactsV1 = {
  schema_version: 1,
  observed_at: "2026-10-22T11:37:00.000Z",
  target_host: "americanmedical.ai",
  network_path: "server_direct",
  note: "Separate from screenshot capture and requested region",
  html: {
    sample_sha256: "798e2061fc5366f25dd1389bfa02a71d9a33f5c1617e8fdb5b77dd2d87b0f66e",
    sample_bytes: 6591,
    sample_truncated: false,
    hash_scope: "head_or_prefix",
  },
  http: {
    status: 200,
    final_url: "https://www.americanmedical.ai/",
    via_proxy: false,
    headers: {
      server: "Vercel",
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
      "strict-transport-security": "max-age=63072000",
    },
  },
  dns: {
    hostname: "americanmedical.ai",
    resolver_scope: "server_system",
    records: {
      a: ["216.150.16.193", "216.150.1.193"],
      aaaa: [],
      cname: [],
      mx: [
        "5 alt2.aspmx.l.google.com",
        "10 alt4.aspmx.l.google.com",
        "10 alt3.aspmx.l.google.com",
        "1 aspmx.l.google.com",
        "5 alt1.aspmx.l.google.com",
      ],
      ns: ["lee.ns.cloudflare.com", "june.ns.cloudflare.com"],
      txt: [
        "v=spf1 include:_spf.google.com -all",
        "google-site-verification=hTgHj8qIvCD_hFX5mEd19ywuNWkmAAK2vDcKN1ubNcY",
      ],
      caa: [],
    },
    errors: [],
    truncated: false,
  },
  robots: {
    ...resource("robots_txt", "https://americanmedical.ai/robots.txt", 200, true),
    directives: {
      user_agents: ["*"],
      allow: ["/"],
      disallow: ["/api/", "/dev/", "/dev"],
      sitemaps: ["https://ami-website-mocha.vercel.app/sitemap.xml"],
      groups: [],
    },
  },
  well_known: [
    resource("security_txt", "https://americanmedical.ai/.well-known/security.txt", 404, false),
    resource("assetlinks_json", "https://americanmedical.ai/.well-known/assetlinks.json", 404, false),
    resource("apple_app_site_association", "https://americanmedical.ai/apple-app-site-association", 404, false),
    resource("openid_configuration", "https://americanmedical.ai/.well-known/openid-configuration", 404, false),
    resource(
      "mta_sts_txt",
      "https://mta-sts.americanmedical.ai/.well-known/mta-sts.txt",
      null,
      null,
      "dns_no_public_address",
    ),
  ],
};

const ja = presentWebFacts(facts, "ja");
const summary = ja.sections.flatMap((section) => section.rows.map((row) => `${row.label}=${row.value}`)).join("\n");

assert.match(ja.http.value, /200 · OK/);
assert.equal(ja.http.url, "https://www.americanmedical.ai/");
assert.match(summary, /Server=Vercel/);
assert.match(summary, /HTTPS=有効/);
assert.match(summary, /robots\.txt=✓ あり/);
assert.match(summary, /Sitemap=⚠ 1件/);
assert.match(summary, /security\.txt=検出なし/);
assert.match(summary, /DNS=✓ 正常/);
assert.match(summary, /アドレス=2/);
assert.match(summary, /メール=Google/);
assert.match(summary, /SPF=✓ あり/);
assert.match(summary, /ネームサーバ=Cloudflare/);
assert.equal(summary.includes("216.150.16.193"), false);
assert.equal(summary.includes("aspmx"), false);
assert.equal(summary.includes("server_direct"), false);
assert.equal(summary.includes("798e2061"), false);
assert.equal(ja.attention.length, 1);
assert.equal(ja.attention[0]?.title, "Sitemap が別のホストを指しています");
assert.equal(ja.attention[0]?.detail, "ami-website-mocha.vercel.app");

const standards = ja.technical.find((block) => block.id === "standards");
assert.ok(standards);
const mta = standards.rows.find((row) => row.label === "MTA-STS");
assert.match(mta?.value ?? "", /確認できず/);
assert.equal(ja.attention.some((item) => item.id === "mta"), false);
const securityDetail = standards.rows.find((row) => row.label === "security.txt");
assert.match(securityDetail?.value ?? "", /検出なし/);
assert.match(ja.raw.map((block) => block.rows.map((row) => row.value).join(" ")).join(" "), /798e2061/);
assert.match(ja.raw.map((block) => block.rows.map((row) => row.value).join(" ")).join(" "), /server_direct/);

const sameHost = presentWebFacts(
  {
    ...facts,
    robots: {
      ...facts.robots,
      directives: { ...facts.robots.directives, sitemaps: ["https://www.americanmedical.ai/sitemap.xml"] },
    },
  },
  "en",
);
assert.equal(sameHost.attention.length, 0);
const apexSitemap = presentWebFacts(
  {
    ...facts,
    robots: {
      ...facts.robots,
      directives: { ...facts.robots.directives, sitemaps: ["https://americanmedical.ai/sitemap.xml"] },
    },
  },
  "en",
);
assert.equal(apexSitemap.attention.length, 0);
assert.match(sameHost.sections[0]?.rows.find((row) => row.id === "sitemap")?.value ?? "", /1 found/);

const absentStandards = presentWebFacts(
  {
    ...facts,
    http: { ...facts.http, status: 200, final_url: "https://example.com/" },
    robots: {
      ...facts.robots,
      directives: { ...facts.robots.directives, sitemaps: [] },
    },
  },
  "en",
);
assert.equal(absentStandards.attention.length, 0);
assert.equal(absentStandards.sections[0]?.rows.find((row) => row.id === "security")?.tone, "neutral");

console.log("ok");
