import type { InteractionPage } from "@/lib/interaction-engine/interaction-page";
import type { ScrollSectionInfo } from "@/lib/interaction-engine/scroll/types";
import type { ScrollCheckpointSample } from "@/lib/observation-scroll-interaction";

export async function executeScrollCheckpoints(input: {
  page: InteractionPage;
  section: ScrollSectionInfo;
  fracs: readonly number[];
}): Promise<{
  checkpoints: ScrollCheckpointSample[];
  reveal: boolean;
  lazyWork: boolean;
}> {
  const { page, section, fracs } = input;
  const checkpoints: ScrollCheckpointSample[] = [];
  let reveal = false;
  let lazyWork = false;

  const imgs0 = await page.evaluate(
    () => Array.from(document.images).filter((img) => img.complete && img.naturalWidth > 0).length,
  );

  if (!section.found) {
    const imgs1 = await page.evaluate(
      () => Array.from(document.images).filter((img) => img.complete && img.naturalWidth > 0).length,
    );
    lazyWork = imgs1 > imgs0;
    return { checkpoints, reveal, lazyWork };
  }

  await page.evaluate((info: { top: number }) => {
    window.scrollTo(0, info.top);
  }, { top: section.top });
  await page.wait(280);

  const keys = await page.evaluate(() => {
    const rootCandidates = Array.from(
      document.querySelectorAll("section, [aria-label], main, body"),
    );
    let root: Element = document.body;
    for (const el of rootCandidates) {
      if ((el as HTMLElement).offsetHeight >= window.innerHeight * 1.8) {
        root = el;
        break;
      }
    }
    const all = Array.from(root.querySelectorAll("div, img, p, h1, h2, h3, span")).slice(0, 280);
    const picked: string[] = [];
    for (const el of all) {
      let st: CSSStyleDeclaration;
      try {
        st = getComputedStyle(el);
      } catch {
        continue;
      }
      const interesting =
        (st.transform && st.transform !== "none") ||
        /transform/i.test(st.willChange || "") ||
        Number(st.opacity) < 0.99 ||
        st.visibility === "hidden";
      if (!interesting) continue;
      if (el.id) picked.push("#" + CSS.escape(el.id));
      else {
        const parts: string[] = [];
        let node: Element | null = el;
        while (node && node.nodeType === 1 && parts.length < 6) {
          let sel = node.tagName.toLowerCase();
          const parent: Element | null = node.parentElement;
          if (parent) {
            const same = Array.from(parent.children).filter(
              (c: Element) => c.tagName === node!.tagName,
            );
            if (same.length > 1) sel += `:nth-of-type(${same.indexOf(node) + 1})`;
          }
          parts.unshift(sel);
          node = parent;
        }
        picked.push(parts.join(" > "));
      }
      if (picked.length >= 16) break;
    }
    return picked;
  });

  let firstHidden: string[] = [];
  for (const frac of fracs) {
    const y = Math.round(section.top + section.range * frac);
    await page.evaluate((yy: number) => {
      window.scrollTo(0, yy);
    }, y);
    await page.wait(320);
    const sample = await page.evaluate((selectors: string[]) => {
      const elements: ScrollCheckpointSample["elements"] = [];
      for (const key of selectors) {
        let el: Element | null = null;
        try {
          el = document.querySelector(key);
        } catch {
          el = null;
        }
        if (!el) continue;
        let st: CSSStyleDeclaration;
        try {
          st = getComputedStyle(el);
        } catch {
          continue;
        }
        const r = el.getBoundingClientRect();
        elements.push({
          key: String(key).slice(0, 180),
          transform: String(st.transform || "none").slice(0, 120),
          opacity: Number(st.opacity),
          visibility: String(st.visibility || "visible").slice(0, 24),
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
        });
      }
      return {
        scroll_y: Math.round(window.scrollY || window.pageYOffset || 0),
        elements,
      };
    }, keys);
    checkpoints.push({ frac, scroll_y: sample.scroll_y, elements: sample.elements });
    if (frac === 0) {
      firstHidden = sample.elements
        .filter((el) => el.visibility === "hidden" || el.opacity < 0.05)
        .map((el) => el.key);
    } else {
      for (const el of sample.elements) {
        if (firstHidden.indexOf(el.key) >= 0 && el.visibility !== "hidden" && el.opacity >= 0.05) {
          reveal = true;
        }
      }
    }
  }

  const imgs1 = await page.evaluate(
    () => Array.from(document.images).filter((img) => img.complete && img.naturalWidth > 0).length,
  );
  lazyWork = imgs1 > imgs0;

  return { checkpoints, reveal, lazyWork };
}
