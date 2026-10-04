import assert from "node:assert/strict";

function parseAiAuditNotes(raw) {
  const kinds = new Set(["visible", "region_time", "page"]);
  if (!Array.isArray(raw)) return [];
  const notes = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    if (!kinds.has(item.kind) || typeof item.text !== "string" || !item.text.trim()) continue;
    notes.push({ kind: item.kind, text: item.text.trim().slice(0, 400) });
    if (notes.length >= 12) break;
  }
  return notes;
}

assert.deepEqual(parseAiAuditNotes(null), []);
assert.deepEqual(parseAiAuditNotes([{ kind: "page", text: "title が空です。" }]), [
  { kind: "page", text: "title が空です。" },
]);
assert.deepEqual(parseAiAuditNotes([{ kind: "score", text: "55" }]), []);
assert.equal(parseAiAuditNotes(Array.from({ length: 20 }, () => ({ kind: "page", text: "x" }))).length, 12);

console.log("observation-ai-audit ok");
