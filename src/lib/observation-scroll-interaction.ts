/** スクロール連動の描画変化。連続ショットではない。Observed の Visual ではない。 */

export const SCROLL_INTERACTION_SCHEMA_VERSION = 1 as const;
export const SCROLL_INTERACTION_SOURCE = "browserless_scroll" as const;
export const SCROLL_CHECKPOINT_FRACS = [0, 0.25, 0.5, 0.75, 1] as const;
/** 選択できる既存 Observation の地域数。別エンジンの一括ではない。 */
export const SCROLL_CHECK_MAX_REGIONS = 4 as const;
export const SCROLL_RECT_DELTA_PX = 2;
export const SCROLL_OPACITY_DELTA = 0.02;
export const SCROLL_MIN_DISTANCE_PX = 40;

export type ScrollInteractionStatus =
  | "working"
  | "no_change_observed"
  | "failed"
  | "not_measured"
  | "not_detected"
  | "blocked_for_safety"
  | "playback_not_verifiable";

export type ScrollChangedProperty = "transform" | "opacity" | "visibility" | "bounding_rect";

export type ScrollElementSample = {
  key: string;
  transform: string;
  opacity: number;
  visibility: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ScrollCheckpointSample = {
  frac: number;
  scroll_y: number;
  elements: ScrollElementSample[];
};

export type ScrollInteractionV1 = {
  schema_version: typeof SCROLL_INTERACTION_SCHEMA_VERSION;
  source: typeof SCROLL_INTERACTION_SOURCE;
  type: "scroll";
  measured_at: string;
  requested_url: string;
  requested_region: string;
  status: Exclude<ScrollInteractionStatus, "not_measured">;
  reason: "no_scroll_section" | "no_rendered_change" | "session_error" | null;
  scroll_start: number;
  scroll_end: number;
  checkpoints: number;
  changed_elements: number;
  changes: ScrollChangedProperty[];
  reduced_motion: boolean;
  duration_ms: number | null;
  proxy_bytes: number | null;
};

export type ScrollFunctionPayload = {
  section_found: boolean;
  reduced_motion: boolean;
  checkpoints: ScrollCheckpointSample[];
  error?: string;
};

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function finiteNum(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseElement(raw: unknown): ScrollElementSample | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const key = typeof o.key === "string" ? o.key.trim().slice(0, 180) : "";
  if (!key) return null;
  return {
    key,
    transform: typeof o.transform === "string" ? o.transform.slice(0, 120) : "none",
    opacity: finiteNum(o.opacity, 1),
    visibility: typeof o.visibility === "string" ? o.visibility.slice(0, 24) : "visible",
    x: Math.round(finiteNum(o.x)),
    y: Math.round(finiteNum(o.y)),
    w: Math.round(finiteNum(o.w)),
    h: Math.round(finiteNum(o.h)),
  };
}

function parseCheckpoint(raw: unknown): ScrollCheckpointSample | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const frac = finiteNum(o.frac);
  if (frac < 0 || frac > 1) return null;
  const elements = Array.isArray(o.elements)
    ? o.elements.map(parseElement).filter((row): row is ScrollElementSample => Boolean(row))
    : [];
  return {
    frac,
    scroll_y: Math.max(0, Math.round(finiteNum(o.scroll_y))),
    elements: elements.slice(0, 24),
  };
}

export function elementPropertyChanges(
  start: ScrollElementSample,
  next: ScrollElementSample,
  scrollDelta = 0,
): ScrollChangedProperty[] {
  const out: ScrollChangedProperty[] = [];
  if (start.transform !== next.transform) out.push("transform");
  if (Math.abs(start.opacity - next.opacity) >= SCROLL_OPACITY_DELTA) out.push("opacity");
  if (start.visibility !== next.visibility) out.push("visibility");
  const expectedY = start.y - scrollDelta;
  const rectMoved =
    Math.abs(start.x - next.x) >= SCROLL_RECT_DELTA_PX ||
    Math.abs(expectedY - next.y) >= SCROLL_RECT_DELTA_PX ||
    Math.abs(start.w - next.w) >= SCROLL_RECT_DELTA_PX ||
    Math.abs(start.h - next.h) >= SCROLL_RECT_DELTA_PX;
  if (rectMoved) out.push("bounding_rect");
  return out;
}

export function summarizeScrollCheckpoints(checkpoints: ScrollCheckpointSample[]): {
  scrollStart: number;
  scrollEnd: number;
  changedElements: number;
  changes: ScrollChangedProperty[];
} {
  if (checkpoints.length === 0) {
    return { scrollStart: 0, scrollEnd: 0, changedElements: 0, changes: [] };
  }
  const first = checkpoints[0]!;
  const last = checkpoints[checkpoints.length - 1]!;
  const byKey = new Map<string, { sample: ScrollElementSample; scrollY: number }[]>();
  for (const point of checkpoints) {
    for (const el of point.elements) {
      const list = byKey.get(el.key) ?? [];
      list.push({ sample: el, scrollY: point.scroll_y });
      byKey.set(el.key, list);
    }
  }
  const changeSet = new Set<ScrollChangedProperty>();
  let changedElements = 0;
  for (const samples of byKey.values()) {
    const origin = samples[0]!;
    const props = new Set<ScrollChangedProperty>();
    for (const sample of samples.slice(1)) {
      const scrollDelta = sample.scrollY - origin.scrollY;
      for (const prop of elementPropertyChanges(origin.sample, sample.sample, scrollDelta)) props.add(prop);
    }
    if (props.size === 0) continue;
    changedElements += 1;
    for (const prop of props) changeSet.add(prop);
  }
  return {
    scrollStart: first.scroll_y,
    scrollEnd: last.scroll_y,
    changedElements,
    changes: [...changeSet],
  };
}

export function scrollCheckEvidence(checkpoints: ScrollCheckpointSample[]): {
  selector?: string;
  actions: ["SCROLL"];
  t0?: ScrollElementSample;
  t1?: ScrollElementSample;
  changes: ScrollChangedProperty[];
} | null {
  if (checkpoints.length === 0) return null;
  const byKey = new Map<string, { sample: ScrollElementSample; scrollY: number }[]>();
  for (const point of checkpoints) {
    for (const el of point.elements) {
      const list = byKey.get(el.key) ?? [];
      list.push({ sample: el, scrollY: point.scroll_y });
      byKey.set(el.key, list);
    }
  }
  let sampled: { selector: string; t0: ScrollElementSample; t1: ScrollElementSample } | null = null;
  for (const [key, rows] of byKey) {
    const origin = rows[0];
    const last = rows[rows.length - 1];
    if (!origin || !last) continue;
    if (!sampled) sampled = { selector: key, t0: origin.sample, t1: last.sample };
    for (const row of rows.slice(1)) {
      const changes = elementPropertyChanges(origin.sample, row.sample, row.scrollY - origin.scrollY);
      if (changes.length > 0) {
        return {
          selector: key,
          actions: ["SCROLL"],
          t0: origin.sample,
          t1: row.sample,
          changes,
        };
      }
    }
  }
  if (sampled) {
    return { selector: sampled.selector, actions: ["SCROLL"], t0: sampled.t0, t1: sampled.t1, changes: [] };
  }
  return { actions: ["SCROLL"], changes: [] };
}

export function decideScrollStatus(input: {
  sectionFound: boolean;
  checkpoints: ScrollCheckpointSample[];
  sessionError?: boolean;
}): {
  status: Exclude<ScrollInteractionStatus, "not_measured">;
  reason: ScrollInteractionV1["reason"];
} {
  if (input.sessionError) return { status: "failed", reason: "session_error" };
  const summary = summarizeScrollCheckpoints(input.checkpoints);
  const scrolled = summary.scrollEnd - summary.scrollStart >= SCROLL_MIN_DISTANCE_PX;
  if (summary.changedElements > 0 && summary.changes.length > 0) {
    return { status: "working", reason: null };
  }
  if (!input.sectionFound) return { status: "failed", reason: "no_scroll_section" };
  if (!scrolled) return { status: "failed", reason: "session_error" };
  return { status: "no_change_observed", reason: "no_rendered_change" };
}

export function parseScrollPayload(raw: unknown): ScrollFunctionPayload {
  const root =
    raw && typeof raw === "object" && "data" in raw ? (raw as { data: unknown }).data : raw;
  const obj = root && typeof root === "object" ? (root as Record<string, unknown>) : {};
  const checkpoints = Array.isArray(obj.checkpoints)
    ? obj.checkpoints.map(parseCheckpoint).filter((row): row is ScrollCheckpointSample => Boolean(row))
    : [];
  return {
    section_found: obj.section_found === true,
    reduced_motion: obj.reduced_motion === true,
    checkpoints: checkpoints.slice(0, SCROLL_CHECKPOINT_FRACS.length),
    error: typeof obj.error === "string" ? obj.error.slice(0, 120) : undefined,
  };
}

export function buildScrollInteractionFromPayload(input: {
  payload: ScrollFunctionPayload;
  requestedUrl: string;
  requestedRegion: string;
  measuredAt: string;
  durationMs: number;
  proxyBytes: number | null;
}): ScrollInteractionV1 {
  const decided = decideScrollStatus({
    sectionFound: input.payload.section_found,
    checkpoints: input.payload.checkpoints,
    sessionError: Boolean(input.payload.error),
  });
  const summary = summarizeScrollCheckpoints(input.payload.checkpoints);
  return {
    schema_version: SCROLL_INTERACTION_SCHEMA_VERSION,
    source: SCROLL_INTERACTION_SOURCE,
    type: "scroll",
    measured_at: input.measuredAt,
    requested_url: input.requestedUrl,
    requested_region: input.requestedRegion,
    status: decided.status,
    reason: decided.reason,
    scroll_start: summary.scrollStart,
    scroll_end: summary.scrollEnd,
    checkpoints: input.payload.checkpoints.length,
    changed_elements: summary.changedElements,
    changes: summary.changes,
    reduced_motion: input.payload.reduced_motion,
    duration_ms: input.durationMs,
    proxy_bytes: input.proxyBytes,
  };
}

export function parseScrollInteractionFromUnknown(raw: unknown): ScrollInteractionV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.schema_version !== SCROLL_INTERACTION_SCHEMA_VERSION) return null;
  if (o.source !== SCROLL_INTERACTION_SOURCE) return null;
  if (o.type !== "scroll") return null;
  if (typeof o.measured_at !== "string" || typeof o.requested_url !== "string") return null;
  const status =
    o.status === "working" || o.status === "no_change_observed" || o.status === "failed"
      ? o.status
      : null;
  if (!status) return null;
  const changes = Array.isArray(o.changes)
    ? o.changes.filter(
        (row): row is ScrollChangedProperty =>
          row === "transform" || row === "opacity" || row === "visibility" || row === "bounding_rect",
      )
    : [];
  const reason =
    o.reason === "no_scroll_section" || o.reason === "no_rendered_change" || o.reason === "session_error"
      ? o.reason
      : null;
  return {
    schema_version: SCROLL_INTERACTION_SCHEMA_VERSION,
    source: SCROLL_INTERACTION_SOURCE,
    type: "scroll",
    measured_at: o.measured_at,
    requested_url: o.requested_url,
    requested_region: typeof o.requested_region === "string" ? o.requested_region : "",
    status,
    reason,
    scroll_start: Math.max(0, Math.round(finiteNum(o.scroll_start))),
    scroll_end: Math.max(0, Math.round(finiteNum(o.scroll_end))),
    checkpoints: Math.max(0, Math.round(finiteNum(o.checkpoints))),
    changed_elements: Math.max(0, Math.round(finiteNum(o.changed_elements))),
    changes,
    reduced_motion: o.reduced_motion === true,
    duration_ms: finiteOrNull(o.duration_ms),
    proxy_bytes: finiteOrNull(o.proxy_bytes),
  };
}

export function parseScrollRunTimes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is string => typeof row === "string" && row.length > 0).slice(-80);
}

export function appendScrollRunTime(existing: string[], measuredAt: string): string[] {
  return [...parseScrollRunTimes(existing), measuredAt].slice(-80);
}
