import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Observation } from "../src/lib/demo/observations";
import { buildEvidenceReportFacts } from "../src/lib/evidence-report";
import { buildInteractionFunctionCode } from "../src/lib/browserless-interaction-function";
import { classifyMotionDriver, motionDriverFactLines, parseMotionDriver } from "../src/lib/motion-driver";
import { parseInteractionEvidence } from "../src/lib/observation-interaction-evidence";

const base = {
  renderedContinuous: true,
  cssAnimation: false,
  cssTransition: false,
  styleMutations: 0,
  classMutations: 0,
  attributeMutations: 0,
  rafStyleMutations: 0,
  waapi: false,
};

assert.equal(
  classifyMotionDriver({ ...base, styleMutations: 4, rafStyleMutations: 4 }),
  "js_driven",
);
assert.equal(
  classifyMotionDriver({ ...base, classMutations: 1, cssTransition: true }),
  "js_triggered_css",
);
assert.equal(classifyMotionDriver({ ...base, cssAnimation: true }), "css_driven");
assert.equal(classifyMotionDriver({ ...base, waapi: true }), "waapi");
assert.equal(
  classifyMotionDriver({ ...base, styleMutations: 1, cssTransition: true }),
  "js_triggered_css",
);
assert.equal(classifyMotionDriver({ ...base, renderedContinuous: false, styleMutations: 4, rafStyleMutations: 4 }), null);
assert.equal(classifyMotionDriver({ ...base, gsap: true } as never), null);

const stored = parseMotionDriver({
  implementation: "js_driven",
  raf_callbacks: 4,
  raf_style_mutations: 4,
  style_mutations: 4,
  class_mutations: 0,
  css_animation: false,
  css_transition: false,
  waapi: false,
  gsap: true,
});
assert.equal(stored?.implementation, "js_driven");
assert.equal(parseMotionDriver({ implementation: "js_driven", gsap: true }), null);
assert.equal(parseMotionDriver({ ...stored, implementation: "proven" })?.implementation, null);

const lines = motionDriverFactLines(stored!, "ja");
assert.match(lines.join("\n"), /JS がフレームごとに描画を更新/);
assert.match(lines.join("\n"), /requestAnimationFrame: 計測中に 4 回/);
assert.match(lines.join("\n"), /CSS animation: 観測していない/);
assert.match(lines.join("\n"), /補助: GSAP は存在する/);
assert.doesNotMatch(lines.join("\n"), /100%/);

const evidence = parseInteractionEvidence({
  driver: stored,
  animation: { detected: true, time_before: 18, time_after: 318 },
});
assert.equal(evidence?.driver?.implementation, "js_driven");
assert.equal(evidence?.animation?.time_after, 318);

const report = buildEvidenceReportFacts({
  observation: {
    id: "driver",
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
      type: "js_animation",
      detected: true,
      status: "working",
      evidence: { driver: stored },
    },
  ],
});
assert.equal(report.behavior?.[0]?.driver?.implementation, "js_driven");
assert.match(motionDriverFactLines(report.behavior![0]!.driver!, "en").join("\n"), /JS-driven/);

const code = buildInteractionFunctionCode();
assert.match(code, /data-bs-toggle='tab'/);
assert.match(code, /data-tippy-content/);
assert.match(code, /tabs present, no safe trigger/);
assert.match(code, /tooltip present, no safe trigger/);
assert.match(code, /data-drawer/);
assert.match(code, /data-micromodal-trigger/);
assert.match(code, /menu present, no safe trigger/);
assert.match(code, /dialog present, no safe trigger/);
assert.match(code, /passive watch, no pointer or click/);
assert.doesNotMatch(code, /cursor_follow_retired/);
assert.match(code, /data-aos/);
assert.match(code, /data-framer-name/);
assert.match(code, /data-w-id/);
assert.match(code, /transitionDuration \|\| "0"\)\.split\(","\)/);
assert.match(code, /function installMotionDriver/);
assert.match(code, /function classifyMotionDriver/);
assert.match(code, /evaluateOnNewDocument\(installMotionDriver\)/);
assert.match(code, /window\.requestAnimationFrame = function/);
assert.doesNotMatch(code, /100%/);

const dir = mkdtempSync(join(tmpdir(), "vt-driver-"));
const file = join(dir, "interaction.mjs");
writeFileSync(file, code);
execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });

console.log("motion driver ok");
