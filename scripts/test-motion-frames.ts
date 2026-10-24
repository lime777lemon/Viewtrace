import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildInteractionFunctionCode } from "../src/lib/browserless-interaction-function";
import { classifyMotionFrames } from "../src/lib/motion-frames";

const frame = (x: number, opacity = 1, transform = "none", time: number | null = null) => ({
  x,
  y: 10,
  opacity,
  transform,
  time,
});

const moving = classifyMotionFrames([frame(100), frame(108), frame(116), frame(124)]);
assert.equal(moving.continuous, true);
assert.equal(moving.oneShot, false);
assert.ok(moving.changes.includes("bounding_rect"));

const jumped = classifyMotionFrames([frame(100), frame(200), frame(200), frame(200)]);
assert.equal(jumped.continuous, false);
assert.equal(jumped.oneShot, true);

const clockOnly = classifyMotionFrames([
  frame(100, 1, "none", 18),
  frame(100, 1, "none", 168),
  frame(100, 1, "none", 318),
]);
assert.equal(clockOnly.continuous, false);
assert.equal(clockOnly.timeline, true);
assert.deepEqual(clockOnly.changes, []);

const fade = classifyMotionFrames([
  frame(40, 0),
  frame(40, 0.48),
  frame(40, 1),
]);
assert.equal(fade.continuous, true);
assert.ok(fade.changes.includes("opacity"));

const slide = classifyMotionFrames([
  frame(0, 1, "matrix(1, 0, 0, 1, 0, 16)"),
  frame(0, 1, "matrix(1, 0, 0, 1, 0, 8)"),
  frame(0, 1, "matrix(1, 0, 0, 1, 0, 0)"),
]);
assert.equal(slide.continuous, true);
assert.ok(slide.changes.includes("transform"));

const scale = classifyMotionFrames([
  frame(0, 1, "matrix(1, 0, 0, 1, 0, 0)"),
  frame(0, 1, "matrix(1.03, 0, 0, 1.03, 0, 0)"),
  frame(0, 1, "matrix(1.07, 0, 0, 1.07, 0, 0)"),
  frame(0, 1, "matrix(1.1, 0, 0, 1.1, 0, 0)"),
]);
assert.equal(scale.continuous, true);
assert.ok(scale.changes.includes("scale"));

const color = classifyMotionFrames([
  { ...frame(10), color: "rgb(0, 0, 0)" },
  { ...frame(10), color: "rgb(40, 40, 40)" },
  { ...frame(10), color: "rgb(80, 80, 80)" },
  { ...frame(10), color: "rgb(120, 120, 120)" },
]);
assert.equal(color.continuous, true);
assert.ok(color.changes.includes("color"));

const code = buildInteractionFunctionCode();
assert.match(code, /function classifyMotionFrames/);
assert.match(code, /effect\.target/);
assert.match(code, /async function triggerMotion/);
assert.match(code, /transitions >= 2/);
assert.match(code, /sleep\(150\)/);
assert.doesNotMatch(code, /changes\.push\("animation"\)/);
assert.match(code, /visualFrames\("canvas"\)/);
assert.match(code, /visualFrames\("webgl"\)/);

const dir = mkdtempSync(join(tmpdir(), "vt-motion-"));
const file = join(dir, "interaction.mjs");
writeFileSync(file, code);
execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });

console.log("motion frames ok");
