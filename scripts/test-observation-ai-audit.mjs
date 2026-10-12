import assert from "node:assert/strict";

const kinds = new Set(["visible", "region_time", "page"]);
const impacts = new Set(["high", "medium", "low"]);
const evidenceIds = new Set([
  "screenshot",
  "detected_facts",
  "title",
  "description",
  "canonical",
  "noindex",
  "robots",
  "og",
  "http_status",
  "html_lang",
  "geo",
  "final_url",
]);

function parseAiAuditNotes(raw) {
  if (!Array.isArray(raw)) return [];
  const notes = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    if (!kinds.has(item.kind) || typeof item.text !== "string" || !item.text.trim()) continue;
    const note = { kind: item.kind, text: item.text.trim().slice(0, 400) };
    if (impacts.has(item.impact)) note.impact = item.impact;
    if (evidenceIds.has(item.evidence)) note.evidence = item.evidence;
    if (typeof item.check === "string" && item.check.trim()) {
      note.check = item.check.trim().slice(0, 400);
    }
    notes.push(note);
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

const structured = parseAiAuditNotes([
  {
    kind: "page",
    text: "noindex があります。検索に出さない指定です。",
    impact: "high",
    evidence: "noindex",
    check: "noindex が意図した設定か確認する。",
    score: 72,
  },
]);
assert.equal(structured[0].impact, "high");
assert.equal(structured[0].evidence, "noindex");
assert.equal(structured[0].check.includes("noindex"), true);
assert.equal("score" in structured[0], false);

assert.deepEqual(
  parseAiAuditNotes([{ kind: "page", text: "x", impact: "critical", evidence: "lighthouse" }]),
  [{ kind: "page", text: "x" }],
);

console.log("observation-ai-audit ok");
