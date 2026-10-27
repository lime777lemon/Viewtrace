import assert from "node:assert/strict";
import type { InteractionPage } from "../src/lib/interaction-engine/interaction-page";
import { runHoverInteractionCheck } from "../src/lib/interaction-engine/hover/run-hover-interaction-check";
import { verifyHoverTypeRow } from "../src/lib/interaction-engine/hover/verify";
import type { HoverStyleSnapshot } from "../src/lib/interaction-engine/hover/style-snapshot";

function snap(partial: Partial<HoverStyleSnapshot>): HoverStyleSnapshot {
  return {
    transform: "none",
    opacity: "1",
    visibility: "visible",
    display: "inline-block",
    bg: "rgba(0,0,0,0)",
    color: "rgb(0,0,0)",
    x: 0,
    y: 0,
    w: 10,
    h: 10,
    expanded: null,
    hidden: null,
    selected: null,
    open: "0",
    ...partial,
  };
}

assert.equal(
  verifyHoverTypeRow({
    hit: { selector: null, blocked: false },
    execution: null,
  })?.status,
  "not_detected",
);

assert.equal(
  verifyHoverTypeRow({
    hit: { selector: null, blocked: true },
    execution: null,
  })?.status,
  "blocked_for_safety",
);

let snapCalls = 0;
const page = {
  async evaluate(fn, ...args) {
    const src = fn.toString();
    if (src.includes("scrollIntoView")) return undefined;
    if (src.includes("getBoundingClientRect") && !src.includes("getAttribute")) {
      return { x: 20, y: 30 };
    }
    if (src.includes("getComputedStyle")) {
      snapCalls += 1;
      if (snapCalls === 1) return snap({ color: "rgb(17, 17, 17)" });
      return snap({ color: "rgb(185, 28, 28)", transform: "scale(1.08)" });
    }
    return null;
  },
  wait: async () => {},
  mouseMove: async () => {},
} as InteractionPage;

async function main() {
  const result = await runHoverInteractionCheck(page, {
    detectHit: { selector: "#hover-target", blocked: false },
  });
  assert.equal(result.typeRow?.status, "working");
  assert.ok(result.execution?.pointerMoved);
  console.log("test-interaction-engine-hover: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
