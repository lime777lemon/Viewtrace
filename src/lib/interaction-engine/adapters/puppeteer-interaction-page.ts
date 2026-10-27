import type { InteractionPage } from "@/lib/interaction-engine/interaction-page";

type PuppeteerLikePage = {
  evaluate<T, A extends unknown[]>(fn: (...args: A) => T | Promise<T>, ...args: A): Promise<T>;
};

export function interactionPageFromPuppeteer(
  page: PuppeteerLikePage,
  waitFn?: (ms: number) => Promise<void>,
): InteractionPage {
  const wait =
    waitFn ??
    ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  return {
    evaluate: (fn, ...args) => page.evaluate(fn, ...args),
    wait,
  };
}
