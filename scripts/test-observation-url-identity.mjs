import assert from "node:assert/strict";

function observationUrlIdentity(raw) {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    u.hostname = u.hostname.replace(/\.$/, "").toLowerCase();
    if ((u.protocol === "https:" && u.port === "443") || (u.protocol === "http:" && u.port === "80")) {
      u.port = "";
    }
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.replace(/\/+$/, "") || "/";
    }
    return `${u.protocol}//${u.host}${u.pathname}${u.search}`;
  } catch {
    return null;
  }
}

function same(a, b) {
  return observationUrlIdentity(a) === observationUrlIdentity(b);
}

assert.equal(
  same("https://Example.com/lp/", "https://example.com/lp"),
  true,
);
assert.equal(
  same("https://example.com/lp?utm=a", "https://example.com/lp?utm=b"),
  false,
);
assert.equal(
  same("https://example.com/lp", "https://example.com/other"),
  false,
);
assert.notEqual(
  observationUrlIdentity("https://example.com/a"),
  observationUrlIdentity("https://redirect.example/a"),
);

console.log("observation url identity ok");
