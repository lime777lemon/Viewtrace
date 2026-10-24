import assert from "node:assert/strict";
import { buildInteractionFunctionCode } from "../src/lib/browserless-interaction-function";
import { buildEvidenceReportFacts } from "../src/lib/evidence-report";
import type { Observation } from "../src/lib/demo/observations";
import { TOGGLE_STATE_SOURCE } from "../src/lib/toggle-state";

const api = new Function(`${TOGGLE_STATE_SOURCE}\nreturn { isPanelVisible, isFullyOpen, panelShift, openedPair, toggleClosed };`)() as {
  isPanelVisible: (panel: Record<string, unknown> | null) => boolean;
  isFullyOpen: (panel: Record<string, unknown> | null) => boolean;
  panelShift: (before: Record<string, unknown> | null, after: Record<string, unknown> | null) => boolean;
  openedPair: (before: { panels: unknown[] }, after: { panels: unknown[] }) => { before: { selector: string }; after: { selector: string } } | null;
  toggleClosed: (opened: { selector: string }, later: { panels: Array<Record<string, unknown>> }) => boolean;
};

const hidden = { exists: true, visible: false, selector: "#mobile-menu", opacity: "0", visibility: "hidden", display: "none", h: 0, w: 0, open: "0", hidden: "true" };
const shown = { exists: true, visible: true, selector: "#mobile-menu", opacity: "1", visibility: "visible", display: "block", h: 320, w: 280, open: "1", hidden: "false" };
const nav = { exists: true, visible: true, selector: "nav", opacity: "1", visibility: "visible", display: "flex", h: 64, w: 1200, open: "0" };

const flat = { exists: true, selector: "#mobile-menu", opacity: "1", visibility: "visible", display: "block", h: 0, w: 280, open: "0" };
const ariaOnly = { ...hidden, hidden: "false" };
const modalOn = { ...nav, selector: "#dialog", role: "dialog", modal: "true" };
assert.equal(api.isPanelVisible(flat), false);
assert.equal(api.isPanelVisible(shown), true);
assert.equal(api.isFullyOpen(shown), true);
assert.equal(api.isFullyOpen({ ...shown, opacity: "0.4" }), false);
assert.equal(api.panelShift(hidden, shown), true);
assert.equal(api.panelShift(flat, { ...flat, h: 284 }), true);
assert.equal(api.panelShift(hidden, ariaOnly), false);
assert.equal(api.panelShift(nav, modalOn), false);
assert.equal(api.panelShift(nav, nav), false);
assert.equal(
  api.openedPair({ panels: [nav, hidden] }, { panels: [nav, shown] })?.after.selector,
  "#mobile-menu",
);
assert.equal(api.openedPair({ panels: [nav] }, { panels: [nav] }), null);
assert.equal(
  api.openedPair(
    { panels: [] },
    { panels: [{ exists: true, visible: true, selector: "div", opacity: "1", visibility: "visible", display: "block", h: 40, w: 40, role: "" }] },
  ),
  null,
);
assert.ok(api.openedPair(
  { panels: [] },
  { panels: [{ exists: true, visible: true, selector: "dialog", opacity: "1", visibility: "visible", display: "block", h: 200, w: 400, role: "dialog", modal: "true", open: "1" }] },
));
assert.equal(api.toggleClosed(shown, { panels: [{ ...shown, visibility: "hidden", h: 0 }] }), true);
assert.equal(api.toggleClosed(shown, { panels: [shown] }), false);

const code = buildInteractionFunctionCode();
assert.match(code, /async function verifyToggle/);
assert.match(code, /aria-controls/);
assert.match(code, /open verified, close verified/);
assert.match(code, /data-vt-close/);
assert.match(code, /menu present, no safe trigger/);
assert.match(code, /dialog present, no safe trigger/);
assert.match(code, /passive watch, no pointer or click/);
assert.match(code, /el.tagName === "A" \|\| el.getAttribute\("role"\) === "menuitem"/);

const report = buildEvidenceReportFacts({
  observation: {
    id: "menu",
    capturedAt: "2026-10-24T10:00:00.000Z",
    url: "https://example.com",
    regionValue: "",
    regionLabel: "",
    status: "success",
  } as Observation,
  locale: "ja",
  siblings: [],
  behaviorTypes: [
    {
      type: "menu",
      detected: true,
      status: "working",
      evidence: {
        actions: ["SAFE_CLICK"],
        selector: "#mobile-menu",
        note: "open verified, close verified",
        toggle: { open: "working", close: "working", close_by: "escape" },
        t0: { visibility: "hidden", opacity: 0, expanded: "false", h: 0, exists: false },
        t1: { visibility: "visible", opacity: 1, expanded: "true", h: 284, exists: true },
        timing: { response_ms: 83, open_ms: 290, in_viewport: true },
        window: {
          executed: true,
          samples: [{ at_ms: 0, changed: false }, { at_ms: 83, changed: true }],
          rendered_changes: ["visibility"],
          visual_changed: null,
          network_count: 0,
          runtime_errors: 0,
          request_failed: 0,
          duration_ms: 290,
        },
      },
    },
  ],
});
const lines = report.behavior?.[0]?.lines?.join("\n") ?? "";
assert.match(lines, /#mobile-menu/);
assert.match(lines, /開く: 成功/);
assert.match(lines, /閉じる: 成功/);
assert.match(lines, /閉じ方: Escape/);
assert.match(lines, /開く前/);
assert.match(lines, /visible: false/);
assert.match(lines, /height: 0/);
assert.match(lines, /aria-expanded: false/);
assert.match(lines, /開いた後/);
assert.match(lines, /visible: true/);
assert.match(lines, /height: 284/);
assert.match(lines, /DOM: absent → present/);
assert.match(lines, /応答: 83ms/);
assert.match(lines, /表示完了: 290ms/);
assert.match(lines, /ビューポート内/);
assert.match(lines, /コンソールエラー: 0/);
assert.match(code, /function isFullyOpen/);
assert.match(code, /response_ms/);
assert.match(code, /function safeList/);
assert.match(code, /safeList\(menuNodes.slice\(0, 24\), 3\)/);
assert.match(code, /safeList\(modalNodes.slice\(0, 24\), 3\)/);
assert.match(code, /\.slice\(0, 3\)/);
assert.match(code, /Date\.now\(\) - clickAt > 1200/);
assert.match(code, /function isPanelVisible/);
assert.match(code, /no_change_observed/);
assert.match(code, /close: closed \? "working" : "failed"/);
assert.match(code, /status: pair \? "working" : "no_change_observed"/);
const closedFailed = buildEvidenceReportFacts({
  observation: {
    id: "menu-close",
    capturedAt: "2026-10-24T10:00:00.000Z",
    url: "https://example.com",
    regionValue: "",
    regionLabel: "",
    status: "success",
  } as Observation,
  locale: "ja",
  siblings: [],
  behaviorTypes: [
    {
      type: "menu",
      detected: true,
      status: "working",
      evidence: {
        actions: ["SAFE_CLICK"],
        selector: "#mobile-menu",
        toggle: { open: "working", close: "failed" },
        t0: { visibility: "hidden", expanded: "false", h: 0 },
        t1: { visibility: "visible", expanded: "true", h: 284 },
      },
    },
  ],
});
const failedLines = closedFailed.behavior?.[0]?.lines?.join("\n") ?? "";
assert.equal(closedFailed.behavior?.[0]?.status, "working");
assert.match(failedLines, /開く: 成功/);
assert.match(failedLines, /閉じる: 失敗/);
assert.doesNotMatch(failedLines, /閉じ方/);

console.log("toggle state ok");
