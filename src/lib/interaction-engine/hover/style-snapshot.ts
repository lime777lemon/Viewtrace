/** Rendered style sample for hover verify (browser-context shape). */

export type HoverStyleSnapshot = {
  transform: string;
  opacity: string;
  visibility: string;
  display: string;
  bg: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
  expanded: string | null;
  hidden: string | null;
  selected: string | null;
  open: string;
};

export function styleSnapInDocument(sel: string): HoverStyleSnapshot | null {
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
}

export function hoverStyleChanged(a: HoverStyleSnapshot | null, b: HoverStyleSnapshot | null): boolean {
  if (!a || !b) return false;
  return (
    a.transform !== b.transform ||
    a.opacity !== b.opacity ||
    a.visibility !== b.visibility ||
    a.display !== b.display ||
    a.bg !== b.bg ||
    a.color !== b.color ||
    a.expanded !== b.expanded ||
    a.hidden !== b.hidden ||
    a.selected !== b.selected ||
    a.open !== b.open ||
    Math.abs(a.x - b.x) >= 2 ||
    Math.abs(a.y - b.y) >= 2 ||
    Math.abs(a.w - b.w) >= 2 ||
    Math.abs(a.h - b.h) >= 2
  );
}
