import type { InteractionPage } from "@/lib/interaction-engine/interaction-page";

type PuppeteerLikePage = {
  evaluate<T, A extends unknown[]>(fn: (...args: A) => T | Promise<T>, ...args: A): Promise<T>;
  mouse?: {
    move(x: number, y: number): Promise<void>;
  };
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
    mouseMove: async (x, y) => {
      try {
        if (page.mouse?.move) {
          await page.mouse.move(x, y);
          return;
        }
      } catch {
        /* fall through to synthetic pointer events */
      }
      await page.evaluate(
        ({ px, py }: { px: number; py: number }) => {
          const opts: MouseEventInit = {
            bubbles: true,
            clientX: px,
            clientY: py,
            view: window,
          };
          const target = document.elementFromPoint(px, py);
          if (!target) return;
          target.dispatchEvent(new MouseEvent("mousemove", opts));
          target.dispatchEvent(new MouseEvent("mouseover", opts));
          target.dispatchEvent(new MouseEvent("mouseenter", opts));
        },
        { px: x, py: y },
      );
    },
  };
}
