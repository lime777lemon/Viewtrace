import type { HoverDetectHit } from "@/lib/interaction-engine/hover/types";

/** Normalize session detect output (selector + safety flag only). */
export function detectHoverHit(raw: unknown): HoverDetectHit {
  if (typeof raw === "string" && raw.trim()) {
    return { selector: raw.trim(), blocked: false };
  }
  if (!raw || typeof raw !== "object") {
    return { selector: null, blocked: false };
  }
  const o = raw as Record<string, unknown>;
  const selector =
    typeof o.selector === "string" && o.selector.trim() ? o.selector.trim() : null;
  return {
    selector,
    blocked: Boolean(o.blocked),
  };
}
