import assert from "node:assert/strict";
import {
  filterPublicResponseHeaders,
  hasPublicObservationAddress,
  parseRobotsDirectives,
  type ObservationDnsFactsV1,
} from "../src/lib/observation-web-facts";
import { isBlockedPreviewHost } from "../src/lib/url-preview";

for (const host of [
  "localhost",
  "127.0.0.1",
  "10.0.0.1",
  "100.64.0.1",
  "169.254.169.254",
  "192.168.1.1",
  "198.18.0.1",
  "203.0.113.10",
  "::1",
  "fc00::1",
  "fe80::1",
  "2001:db8::1",
  "::ffff:127.0.0.1",
]) {
  assert.equal(isBlockedPreviewHost(host), true, `${host} must be blocked`);
}
assert.equal(isBlockedPreviewHost("93.184.216.34"), false);
assert.equal(isBlockedPreviewHost("2606:2800:220:1:248:1893:25c8:1946"), false);

const dnsBase: ObservationDnsFactsV1 = {
  hostname: "example.com",
  resolver_scope: "server_system",
  records: { a: [], aaaa: [], cname: [], mx: [], ns: [], txt: [], caa: [] },
  errors: [],
  truncated: false,
};
assert.equal(
  hasPublicObservationAddress({
    ...dnsBase,
    records: { ...dnsBase.records, a: ["127.0.0.1"] },
  }),
  false,
);
assert.equal(
  hasPublicObservationAddress({
    ...dnsBase,
    records: { ...dnsBase.records, a: ["93.184.216.34"] },
  }),
  true,
);

assert.deepEqual(
  filterPublicResponseHeaders({
    "Content-Type": "text/html",
    "Set-Cookie": "session=secret",
    Authorization: "Bearer secret",
    "X-Robots-Tag": "noindex",
  }),
  {
    "content-type": "text/html",
    "x-robots-tag": "noindex",
  },
);

const robots = parseRobotsDirectives(`
  User-agent: *
  Disallow: /private
  Allow: /private/public
  Sitemap: https://example.com/sitemap.xml
  # ignored
`);
assert.deepEqual(robots, {
  user_agents: ["*"],
  allow: ["/private/public"],
  disallow: ["/private"],
  sitemaps: ["https://example.com/sitemap.xml"],
  groups: [
    {
      user_agents: ["*"],
      allow: ["/private/public"],
      disallow: ["/private"],
    },
  ],
});

console.log("test-observation-web-facts: ok");
