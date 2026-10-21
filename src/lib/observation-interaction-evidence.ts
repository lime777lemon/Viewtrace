/** Shared verify helpers. Detected is never Working. Cookie chrome is not Load animation. */

export const COOKIE_NOISE_PATTERN_SOURCE =
  "cookie|consent|gdpr|onetrust|privacy.?banner|cookie-banner|cookiebanner";

export const INTERACTION_ACTIONS = [
  "LOAD",
  "WAIT",
  "SCROLL",
  "HOVER",
  "MOUSE_MOVE",
  "SAFE_CLICK",
  "FOCUS",
  "INPUT",
  "PLAY",
  "DRAG",
  "SWIPE",
] as const;

export type InteractionAction = (typeof INTERACTION_ACTIONS)[number];

export type InteractionElementState = {
  key: string;
  opacity: number;
  transform: string;
  currentTime?: number;
  visibility: string;
  display: string;
  x: number;
  y: number;
  w: number;
  h: number;
  expanded?: string | null;
  selected?: string | null;
  index?: number;
  hidden?: string | null;
  className?: string;
};

export type InteractionEvidence = {
  actions?: InteractionAction[];
  selector?: string;
  t0?: Partial<InteractionElementState> | null;
  t1?: Partial<InteractionElementState> | null;
  changes?: string[];
  frame_hashes?: string[];
  note?: string;
  restore?: "ok" | "failed";
};

export function isCookieNoiseKey(key: string): boolean {
  return new RegExp(COOKIE_NOISE_PATTERN_SOURCE, "i").test(key);
}

export function elementStateChanges(
  start: InteractionElementState,
  next: InteractionElementState,
): string[] {
  const out: string[] = [];
  if (start.transform !== next.transform) out.push("transform");
  if (Math.abs(start.opacity - next.opacity) >= 0.02) out.push("opacity");
  if (start.visibility !== next.visibility) out.push("visibility");
  if (start.display !== next.display) out.push("display");
  if (
    Math.abs(start.x - next.x) >= 2 ||
    Math.abs(start.y - next.y) >= 2 ||
    Math.abs(start.w - next.w) >= 2 ||
    Math.abs(start.h - next.h) >= 2
  ) {
    out.push("bounding_rect");
  }
  if ((start.expanded ?? null) !== (next.expanded ?? null)) out.push("aria-expanded");
  if ((start.selected ?? null) !== (next.selected ?? null)) out.push("aria-selected");
  if ((start.hidden ?? null) !== (next.hidden ?? null)) out.push("hidden");
  return out;
}

export function classifyTimedMotion(
  pairs: { key: string; props: string[] }[],
): {
  loadKeys: string[];
  delayedKeys: string[];
} {
  const delayedKeys: string[] = [];
  const loadKeys: string[] = [];
  for (const row of pairs) {
    if (row.props.length === 0) continue;
    if (isCookieNoiseKey(row.key)) delayedKeys.push(row.key);
    else if (
      row.props.includes("opacity") ||
      row.props.includes("transform") ||
      row.props.includes("visibility")
    ) {
      loadKeys.push(row.key);
    } else if (row.props.includes("display") || row.props.includes("bounding_rect")) {
      delayedKeys.push(row.key);
    }
  }
  return { loadKeys, delayedKeys };
}

export function accordionDidWork(input: {
  expandedBefore: string | null;
  expandedAfter: string | null;
  panelHiddenBefore: boolean;
  panelHiddenAfter: boolean;
  panelHeightBefore: number;
  panelHeightAfter: number;
}): boolean {
  if (input.expandedBefore === "false" && input.expandedAfter === "true") return true;
  if (input.panelHiddenBefore && !input.panelHiddenAfter) return true;
  return input.panelHeightAfter - input.panelHeightBefore >= 8;
}

export function parseInteractionEvidence(raw: unknown): InteractionEvidence | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const actions = Array.isArray(o.actions)
    ? o.actions.filter((row): row is InteractionAction =>
        INTERACTION_ACTIONS.includes(row as InteractionAction),
      )
    : undefined;
  const changes = Array.isArray(o.changes)
    ? o.changes.filter((row): row is string => typeof row === "string").slice(0, 16)
    : undefined;
  const frame_hashes = Array.isArray(o.frame_hashes)
    ? o.frame_hashes.filter((row): row is string => typeof row === "string").slice(0, 8)
    : undefined;
  return {
    actions: actions && actions.length ? actions : undefined,
    selector: typeof o.selector === "string" ? o.selector.slice(0, 180) : undefined,
    t0: o.t0 && typeof o.t0 === "object" ? (o.t0 as InteractionEvidence["t0"]) : undefined,
    t1: o.t1 && typeof o.t1 === "object" ? (o.t1 as InteractionEvidence["t1"]) : undefined,
    changes,
    frame_hashes,
    note: typeof o.note === "string" ? o.note.slice(0, 180) : undefined,
    restore: o.restore === "ok" || o.restore === "failed" ? o.restore : undefined,
  };
}
