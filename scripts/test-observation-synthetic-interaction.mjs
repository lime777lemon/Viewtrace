import assert from "node:assert/strict";

const UNSAFE =
  "logout|log[-_ ]?out|sign[-_ ]?out|sign[-_ ]?off|delete|remove|unsubscribe|checkout|cart|buy|purchase|pay|payment|submit|donate|password|download|unsubscribe|cancel.?account|退会|ログアウト|削除|購入|買う|カート|決済|支払い|送信|登録する";

function isUnsafe(raw) {
  return new RegExp(UNSAFE, "i").test(raw);
}

assert.equal(isUnsafe("Log out"), true);
assert.equal(isUnsafe("Checkout now"), true);
assert.equal(isUnsafe("購入する"), true);
assert.equal(isUnsafe("Features"), false);
assert.equal(isUnsafe("Menu"), false);

function parseRow(raw) {
  if (!raw || typeof raw !== "object") return null;
  const label = typeof raw.label === "string" ? raw.label.trim().slice(0, 80) : "";
  if (!label) return null;
  const n = typeof raw.latency_ms === "number" && Number.isFinite(raw.latency_ms) ? Math.round(raw.latency_ms) : null;
  return {
    label,
    kind: raw.kind === "nav" || raw.kind === "link" || raw.kind === "button" ? raw.kind : "button",
    latency_ms: n != null && n >= 0 ? n : null,
    navigated: raw.navigated === true,
    error: typeof raw.error === "string" && raw.error ? raw.error : null,
  };
}

const wrapped = parseRow({ label: "Navigation menu", kind: "nav", latency_ms: 142.4, navigated: false });
assert.equal(wrapped.label, "Navigation menu");
assert.equal(wrapped.kind, "nav");
assert.equal(wrapped.latency_ms, 142);

const fromFn = {
  data: {
    skipped_unsafe: 4,
    interactions: [
      { label: "Navigation menu", kind: "nav", latency_ms: 142, navigated: false, error: null },
      { label: "Features", kind: "link", latency_ms: 118, navigated: true, error: null },
    ],
  },
};
const rows = fromFn.data.interactions.map(parseRow);
assert.equal(rows.length, 2);
assert.equal(rows[0].latency_ms, 142);
assert.equal(fromFn.data.skipped_unsafe, 4);

console.log("test-observation-synthetic-interaction: ok");
