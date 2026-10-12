import assert from "node:assert/strict";

const SKIP_EXT =
  /\.(?:pdf|jpe?g|png|gif|webp|svg|ico|zip|mp4|mp3|webm|css|js|mjs|woff2?|ttf|otf|map)(?:[?#]|$)/i;

function extractSameOriginLinks(html, pageUrl, limit) {
  const cap = Math.max(0, Math.min(20, Math.floor(limit)));
  const base = new URL(pageUrl);
  const found = [];
  const seen = new Set([base.href]);
  const re = /<a\b[^>]*\bhref\s*=\s*(["'])([^"']+)\1/gi;
  let m;
  while ((m = re.exec(html)) && found.length < cap) {
    const raw = m[2]?.trim() ?? "";
    if (!raw || raw.startsWith("#") || /^(?:mailto|tel|javascript|data):/i.test(raw)) continue;
    let abs;
    try {
      abs = new URL(raw, base);
    } catch {
      continue;
    }
    if (abs.protocol !== base.protocol || abs.hostname.toLowerCase() !== base.hostname.toLowerCase()) {
      continue;
    }
    if (SKIP_EXT.test(abs.pathname)) continue;
    abs.hash = "";
    if (seen.has(abs.href)) continue;
    seen.add(abs.href);
    found.push(abs.href);
  }
  return found;
}

const html = `
<nav>
  <a href="/about">About</a>
  <a href="/pricing">Pricing</a>
  <a href="https://example.com/about#team">About again</a>
  <a href="https://other.com/x">Other</a>
  <a href="/file.pdf">PDF</a>
  <a href="mailto:hi@example.com">Mail</a>
  <a href="#top">Top</a>
  <a href="/blog/one">Blog</a>
</nav>
`;

const links = extractSameOriginLinks(html, "https://example.com/", 5);
assert.deepEqual(links, [
  "https://example.com/about",
  "https://example.com/pricing",
  "https://example.com/blog/one",
]);

const capped = extractSameOriginLinks(html, "https://example.com/", 2);
assert.equal(capped.length, 2);

assert.deepEqual(extractSameOriginLinks("", "https://example.com/", 5), []);
assert.deepEqual(extractSameOriginLinks(html, "https://example.com/", 0), []);

console.log("test-observation-subpages: ok");
