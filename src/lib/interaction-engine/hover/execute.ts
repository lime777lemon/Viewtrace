import type { InteractionPage } from "@/lib/interaction-engine/interaction-page";
import type { HoverStyleSnapshot } from "@/lib/interaction-engine/hover/style-snapshot";
import type { HoverDetectHit, HoverExecutionResult } from "@/lib/interaction-engine/hover/types";

export async function executeHoverPointer(input: {
  page: InteractionPage;
  hit: HoverDetectHit;
}): Promise<HoverExecutionResult | null> {
  const selector = input.hit.selector;
  if (!selector) return null;

  await input.page.evaluate((sel: string) => {
    const el = document.querySelector(sel);
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ block: "center", inline: "nearest" });
    }
  }, selector);
  await input.page.wait(180);

  const before = await input.page.evaluate((sel: string) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const st = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      transform: String(st.transform || "none"),
      opacity: String(st.opacity || ""),
      visibility: String(st.visibility || ""),
      display: String(st.display || ""),
      bg: String(st.backgroundColor || ""),
      color: String(st.color || ""),
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      expanded: el.getAttribute("aria-expanded"),
      hidden: el.getAttribute("aria-hidden"),
      selected: el.getAttribute("aria-selected"),
      open: el.hasAttribute("open") ? "1" : "0",
    };
  }, selector);

  const center = await input.page.evaluate((sel: string) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!(r.width > 0) || !(r.height > 0)) return null;
    return {
      x: Math.round(r.x + Math.max(1, r.width / 2)),
      y: Math.round(r.y + Math.max(1, r.height / 2)),
    };
  }, selector);

  if (!center) {
    return { selector, before, after: before, pointerMoved: false };
  }

  await input.page.mouseMove(center.x, center.y);
  await input.page.wait(350);

  const after = await input.page.evaluate((sel: string) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const st = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      transform: String(st.transform || "none"),
      opacity: String(st.opacity || ""),
      visibility: String(st.visibility || ""),
      display: String(st.display || ""),
      bg: String(st.backgroundColor || ""),
      color: String(st.color || ""),
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      expanded: el.getAttribute("aria-expanded"),
      hidden: el.getAttribute("aria-hidden"),
      selected: el.getAttribute("aria-selected"),
      open: el.hasAttribute("open") ? "1" : "0",
    };
  }, selector);

  try {
    await input.page.mouseMove(0, 0);
  } catch {
    /* restore best-effort */
  }

  return { selector, before, after, pointerMoved: true };
}

export type { HoverStyleSnapshot };
