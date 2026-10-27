/** Thin page capability — not Puppeteer / Playwright / Browserless. */

export interface InteractionPage {
  evaluate<T, A extends unknown[] = []>(
    fn: (...args: A) => T | Promise<T>,
    ...args: A
  ): Promise<T>;

  wait(ms: number): Promise<void>;

  /** Move pointer in viewport coordinates (not selector hover API). */
  mouseMove(x: number, y: number): Promise<void>;
}
