/** Shared verify helpers. Detected is never Working. Cookie chrome is not Load animation. */

import { parseAnimationObservation, parseVideoObservation, type AnimationObservation, type VideoObservation } from "@/lib/behavior-observation";
import { parseMotionTrace, type MotionTraceEvidence } from "@/lib/motion-frames";
import { parseMotionDriver, type MotionDriverEvidence } from "@/lib/motion-driver";
import { selectResourceRequests, type ResourceRequestV1 } from "@/lib/resource-request";

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
  exists?: boolean;
};

/** One real-browser action: before, the action, then later samples. Network success is not a rendered change. */
export type ActionEvidenceWindow = {
  executed: boolean;
  samples: Array<{ at_ms: number; changed: boolean }>;
  rendered_changes: string[];
  visual_changed: boolean | null;
  network_count: number;
  requests?: ResourceRequestV1[];
  runtime_errors: number;
  request_failed: number;
  duration_ms: number;
};

/** Open stays Working when the panel opens. Close is a separate result and does not change that. */
export type InteractionToggleEvidence = {
  open: "working";
  close: "working" | "failed";
  close_by?: "button" | "close" | "escape";
};

/** Times from the click this check already performed. Missing means that moment was not observed. */
export type InteractionUxTiming = {
  response_ms: number;
  open_ms?: number;
  in_viewport?: boolean;
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
  timing?: InteractionUxTiming;
  toggle?: InteractionToggleEvidence;
  window?: ActionEvidenceWindow;
  animation?: AnimationObservation;
  video?: VideoObservation;
  driver?: MotionDriverEvidence;
  trace?: MotionTraceEvidence;
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
    timing: parseUxTiming(o.timing),
    toggle: parseToggleEvidence(o.toggle),
    window: parseActionWindow(o.window),
    animation: parseAnimationObservation(o.animation) ?? undefined,
    video: parseVideoObservation(o.video) ?? undefined,
    driver: parseMotionDriver(o.driver) ?? undefined,
    trace: parseMotionTrace(o.trace) ?? undefined,
  };
}

function parseToggleEvidence(raw: unknown): InteractionToggleEvidence | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const row = raw as Record<string, unknown>;
  if (row.open !== "working") return undefined;
  if (row.close !== "working" && row.close !== "failed") return undefined;
  const toggle: InteractionToggleEvidence = { open: "working", close: row.close };
  if (row.close === "working" && (row.close_by === "button" || row.close_by === "close" || row.close_by === "escape")) {
    toggle.close_by = row.close_by;
  }
  return toggle;
}

function parseUxTiming(raw: unknown): InteractionUxTiming | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const row = raw as Record<string, unknown>;
  const response = row.response_ms;
  if (typeof response !== "number" || !Number.isFinite(response) || response < 0) return undefined;
  const timing: InteractionUxTiming = { response_ms: Math.round(response) };
  const open = row.open_ms;
  if (typeof open === "number" && Number.isFinite(open) && open >= 0) timing.open_ms = Math.round(open);
  if (row.in_viewport === true || row.in_viewport === false) timing.in_viewport = row.in_viewport;
  return timing;
}

function parseActionWindow(raw: unknown): ActionEvidenceWindow | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const row = raw as Record<string, unknown>;
  const samples = Array.isArray(row.samples)
    ? row.samples.flatMap((sample) => {
        if (!sample || typeof sample !== "object") return [];
        const point = sample as Record<string, unknown>;
        const at = point.at_ms;
        if (typeof at !== "number" || !Number.isFinite(at)) return [];
        return [{ at_ms: Math.max(0, Math.round(at)), changed: point.changed === true }];
      }).slice(0, 6)
    : [];
  const rendered = Array.isArray(row.rendered_changes)
    ? row.rendered_changes.filter((item): item is string => typeof item === "string").slice(0, 8)
    : [];
  const count = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  return {
    executed: row.executed === true,
    samples,
    rendered_changes: rendered,
    visual_changed: row.visual_changed === true ? true : row.visual_changed === false ? false : null,
    network_count: count(row.network_count),
    requests: selectResourceRequests(row.requests),
    runtime_errors: count(row.runtime_errors),
    request_failed: count(row.request_failed),
    duration_ms: count(row.duration_ms),
  };
}

/**
 * Working requires a rendered or visual change from the action window.
 * A stored row with no window keeps its status.
 * HTTP success alone does not keep Working.
 */
export function confirmMeasuredStatus(
  status: "working" | "no_change_observed" | "failed" | "not_measured" | "not_detected" | "blocked_for_safety" | "playback_not_verifiable",
  evidence: InteractionEvidence | null | undefined,
): typeof status {
  if (status !== "working" || !evidence?.window?.executed) return status;
  const rendered =
    evidence.window.rendered_changes.length > 0 ||
    evidence.window.samples.some((row) => row.changed) ||
    (evidence.changes?.length ?? 0) > 0 ||
    (evidence.frame_hashes?.length ?? 0) >= 2;
  if (rendered || evidence.window.visual_changed === true) return "working";
  return "no_change_observed";
}
