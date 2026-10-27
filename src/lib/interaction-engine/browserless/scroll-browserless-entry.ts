import { interactionPageFromPuppeteer } from "@/lib/interaction-engine/adapters/puppeteer-interaction-page";
import { runScrollInteractionCheck } from "@/lib/interaction-engine/scroll/run-scroll-interaction-check";

type BrowserlessPage = {
  evaluate<T, A extends unknown[]>(fn: (...args: A) => T | Promise<T>, ...args: A): Promise<T>;
};

/** Invoked inside Browserless /function (bundled IIFE). */
export async function runScrollInteractionCheckForBrowserless(
  page: BrowserlessPage,
  ctx: {
    fracs: number[];
    detectScrollHint: boolean;
    sleep: (ms: number) => Promise<void>;
  },
) {
  const interactionPage = interactionPageFromPuppeteer(page, ctx.sleep);
  return runScrollInteractionCheck(interactionPage, {
    fracs: ctx.fracs,
    detectScrollHint: ctx.detectScrollHint,
  });
}
