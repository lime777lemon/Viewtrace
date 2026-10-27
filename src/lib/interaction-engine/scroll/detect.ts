import type { InteractionPage } from "@/lib/interaction-engine/interaction-page";
import type { ScrollSectionInfo } from "@/lib/interaction-engine/scroll/types";

export async function detectScrollSection(page: InteractionPage): Promise<ScrollSectionInfo> {
  return page.evaluate(() => {
    const vh = window.innerHeight;
    const nodes = Array.from(
      document.querySelectorAll("section, [aria-label], main, main > div, body > div"),
    );
    let best: Element | null = null;
    let bestScore = 0;
    for (const el of nodes.slice(0, 80)) {
      const h = (el as HTMLElement).offsetHeight;
      if (h < vh * 1.8) continue;
      let sticky = false;
      try {
        if (getComputedStyle(el).position === "sticky") sticky = true;
        if (!sticky) {
          sticky = Array.from(el.querySelectorAll("div, section"))
            .slice(0, 40)
            .some((kid) => getComputedStyle(kid).position === "sticky");
        }
      } catch {
        /* ignore */
      }
      const score = h + (sticky ? vh * 6 : 0);
      if (score > bestScore) {
        best = el;
        bestScore = score;
      }
    }
    const reduced = Boolean(
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    if (!best) {
      const height = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        1,
      );
      return { found: false, top: 0, range: Math.max(1, height - vh), reduced };
    }
    const top = Math.max(0, Math.round(best.getBoundingClientRect().top + window.scrollY));
    return {
      found: true,
      top,
      range: Math.max(1, (best as HTMLElement).offsetHeight - vh),
      reduced,
    };
  });
}
