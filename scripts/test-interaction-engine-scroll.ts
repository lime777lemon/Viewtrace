import assert from "node:assert/strict";
import { runScrollInteractionCheck } from "../src/lib/interaction-engine/scroll/run-scroll-interaction-check";
import type { InteractionPage } from "../src/lib/interaction-engine/interaction-page";
import { verifyScrollTypeRow } from "../src/lib/interaction-engine/scroll/verify";
import type { ScrollCheckpointSample } from "../src/lib/observation-scroll-interaction";

function mockPage(handlers: {
  section?: { found: boolean; top: number; range: number; reduced: boolean };
  keys?: string[];
  samples?: ScrollCheckpointSample[];
}): InteractionPage {
  let scrollY = 0;
  return {
    async evaluate(fn, ...args) {
      const src = fn.toString();
      if (src.includes("offsetHeight") && src.includes("prefers-reduced-motion")) {
        return handlers.section ?? { found: false, top: 0, range: 800, reduced: false };
      }
      if (src.includes("document.images")) return 2;
      if (src.includes("picked.push")) return handlers.keys ?? ["#hero"];
      if (src.includes("scroll_y")) {
        const selectors = args[0] as string[];
        const fracArg = scrollY;
        const point =
          handlers.samples?.find((p) => Math.abs(p.scroll_y - fracArg) < 5) ??
          handlers.samples?.[0];
        return {
          scroll_y: scrollY,
          elements: point?.elements ?? [],
        };
      }
      if (src.includes("window.scrollTo")) {
        scrollY = typeof args[0] === "number" ? args[0] : (args[0] as { top: number }).top;
      }
      return undefined;
    },
    wait: async () => {},
    mouseMove: async () => {},
  } as InteractionPage;
}

const workingSamples: ScrollCheckpointSample[] = [
  {
    frac: 0,
    scroll_y: 0,
    elements: [
      {
        key: "#hero",
        transform: "none",
        opacity: 1,
        visibility: "visible",
        x: 0,
        y: 0,
        w: 100,
        h: 100,
      },
    ],
  },
  {
    frac: 1,
    scroll_y: 400,
    elements: [
      {
        key: "#hero",
        transform: "matrix(1,0,0,1,0,-40)",
        opacity: 1,
        visibility: "visible",
        x: 0,
        y: -40,
        w: 100,
        h: 100,
      },
    ],
  },
];

const typeRow = verifyScrollTypeRow({
  section: { found: true, top: 0, range: 400, reduced: false },
  checkpoints: workingSamples,
  detectScrollHint: false,
});
assert.equal(typeRow?.status, "working");

const page = mockPage({
  section: { found: true, top: 0, range: 400, reduced: false },
  keys: ["#hero"],
  samples: workingSamples,
});

async function main() {
  const result = await runScrollInteractionCheck(page, { fracs: [0, 1], detectScrollHint: false });
  assert.equal(result.typeRow?.status, "working");
  assert.ok(result.checkpoints.length >= 1);
  console.log("test-interaction-engine-scroll: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
