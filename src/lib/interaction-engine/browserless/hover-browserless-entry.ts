import { interactionPageFromPuppeteer } from "@/lib/interaction-engine/adapters/puppeteer-interaction-page";
import { runHoverInteractionCheck } from "@/lib/interaction-engine/hover/run-hover-interaction-check";

type BrowserlessPage = {
  evaluate<T, A extends unknown[]>(fn: (...args: A) => T | Promise<T>, ...args: A): Promise<T>;
  mouse?: {
    move(x: number, y: number): Promise<void>;
  };
};

/** Invoked inside Browserless /function (bundled IIFE). */
export async function runHoverInteractionCheckForBrowserless(
  page: BrowserlessPage,
  ctx: {
    hit: unknown;
    sleep: (ms: number) => Promise<void>;
  },
) {
  const interactionPage = interactionPageFromPuppeteer(page, ctx.sleep);
  return runHoverInteractionCheck(interactionPage, { detectHit: ctx.hit });
}
