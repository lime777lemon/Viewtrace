import type { InteractionCheckType } from "@/lib/observation-regional-interaction";

/** Independent ways a page can reveal behavior before it is classified. */
export const DISCOVERY_SOURCES = [
  "dom",
  "style",
  "animation",
  "media",
  "frame",
  "scroll",
  "actionable",
] as const;

export type DiscoverySource = (typeof DISCOVERY_SOURCES)[number];

const RENDERED_SOURCES = new Set<DiscoverySource>(["dom", "style", "animation", "media", "frame", "scroll"]);

export type DiscoveryRegion = { x: number; y: number; w: number; h: number };

export type DiscoveryObservation = {
  selector: string;
  source: DiscoverySource;
  changes: string[];
  t0: Record<string, unknown> | null;
  t1: Record<string, unknown> | null;
  region: DiscoveryRegion | null;
  /** Safe action that revealed this change, when state exploration caused it. */
  action?: string | null;
  /** Shadow hosts from the document down to this element. */
  shadow_path?: string[];
  /** Same-origin iframe elements from the document down to this element. */
  frame_path?: string[];
};

export type DiscoveryTraversalV1 = {
  shadow_open: number;
  shadow_closed: number;
  same_origin_frames: number;
  cross_origin_frames: number;
};

export type UnreadableSurfaceV1 = {
  selector: string;
  shadow_path: string[];
  frame_path: string[];
  reason: "closed_shadow" | "cross_origin_frame";
};

export function behaviorLocationKey(row: {
  selector: string;
  shadow_path?: readonly string[] | null;
  frame_path?: readonly string[] | null;
}): string {
  const shadow = (row.shadow_path ?? []).join(">");
  const frame = (row.frame_path ?? []).join(">");
  if (!shadow && !frame) return row.selector;
  return `${row.selector}|f:${frame}|s:${shadow}`;
}

function asPath(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((part): part is string => typeof part === "string" && part.length > 0).slice(0, 4);
}

export type StateExplorationV1 = {
  ran: boolean;
  steps: number;
  revealed: number;
};

export type DiscoveryEnvironmentV1 = {
  device_class: "desktop" | "mobile";
  viewport: { width: number; height: number };
  pointer: "mouse" | "touch";
  touch: boolean;
  locale: string;
  timezone: string;
  prefers_reduced_motion: boolean;
};

export type TemporalBehaviorV1 = {
  selector: string;
  kind: "animation" | "delayed" | "periodic" | "visual" | "media";
  first_seen_at: number;
  last_changed_at: number;
  samples: Array<{ t: number; hash?: string; change?: string }>;
  observation_window_ms: number;
  sampling_reason: "settled" | "still_active" | "delayed_candidate" | "periodic" | "time_limit";
};

export type TemporalObservationV1 = {
  ran: boolean;
  window_ms: number;
  completed_through_ms: number;
  reason: "skipped" | "settled" | "still_active" | "delayed_candidate" | "periodic" | "time_limit";
  behaviors: TemporalBehaviorV1[];
};

export type ExplorationExhaustionV1 = {
  status: "completed" | "incomplete" | "skipped";
  reason:
    | "skipped"
    | "no_unexplored_safe_candidates"
    | "action_budget"
    | "state_limit"
    | "time_limit"
    | "depth_limit";
  discovered: number;
  executed: number;
  unexplored: number;
  unexplored_reasons: Array<{ selector: string; reason: "action_budget" | "state_limit" | "time_limit" | "depth_limit" }>;
};

export type CoverageManifestV1 = {
  region: string;
  environment: DiscoveryEnvironmentV1 | null;
  temporal_window_ms: number | null;
  temporal_reason: string;
  state_exploration: number | null;
  safe_actions_discovered: number | null;
  safe_actions_executed: number | null;
  exploration: "exhausted" | "incomplete" | "skipped";
  discovery: {
    dom: "measured" | "skipped";
    computed_style: "measured" | "skipped";
    web_animations: "measured" | "skipped";
    media: "measured" | "skipped";
    visual_regions: "measured" | "skipped";
    scroll: "measured" | "skipped";
    actions: "measured" | "skipped";
    network: "measured" | "skipped";
    console_runtime: "measured" | "skipped";
    open_shadow: "measured" | "skipped";
    same_origin_frames: "measured" | "skipped";
  };
  boundaries: {
    closed_shadow: number;
    cross_origin_frames: number;
    blocked_for_safety: number;
    unexplored_candidates: number;
  };
  statement: "measured_within_scope" | "scan_recorded";
};

export type DiscoveryRoute = { ran: boolean; hits: number };

export type DiscoveryRoutes = Record<DiscoverySource, DiscoveryRoute>;

export type UnknownChangeClass =
  | "unknown_rendered_motion"
  | "unknown_dom_change"
  | "unknown_style_change"
  | "unknown_media_change";

export type BehaviorClassification = InteractionCheckType | UnknownChangeClass | "actionable";

export function isUnknownChange(value: string): value is UnknownChangeClass {
  return (
    value === "unknown_rendered_motion" ||
    value === "unknown_dom_change" ||
    value === "unknown_style_change" ||
    value === "unknown_media_change"
  );
}

/** Visual or frame evidence is rendered motion. Other unclassified changes keep their evidence source. */
export function unknownChangeClass(sources: readonly DiscoverySource[], changes: readonly string[]): UnknownChangeClass {
  if (sources.includes("frame") || changes.includes("frame")) return "unknown_rendered_motion";
  if (sources.includes("media")) return "unknown_media_change";
  if (sources.includes("style") || sources.includes("animation") || sources.includes("scroll")) return "unknown_style_change";
  return "unknown_dom_change";
}

export type BehaviorMapEntry = {
  selector: string;
  sources: DiscoverySource[];
  changes: string[];
  actions: string[];
  t0: Record<string, unknown> | null;
  t1: Record<string, unknown> | null;
  region: DiscoveryRegion | null;
  shadow_path?: string[];
  frame_path?: string[];
  classification: BehaviorClassification;
};

export type BehaviorClaim = {
  type: InteractionCheckType;
  selector: string;
  changes: string[];
};

export function emptyDiscoveryRoutes(): DiscoveryRoutes {
  return {
    dom: { ran: false, hits: 0 },
    style: { ran: false, hits: 0 },
    animation: { ran: false, hits: 0 },
    media: { ran: false, hits: 0 },
    frame: { ran: false, hits: 0 },
    scroll: { ran: false, hits: 0 },
    actionable: { ran: false, hits: 0 },
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asRegion(value: unknown): DiscoveryRegion | null {
  const row = asRecord(value);
  if (!row) return null;
  const num = (key: string) => (typeof row[key] === "number" && Number.isFinite(row[key] as number) ? (row[key] as number) : null);
  const x = num("x");
  const y = num("y");
  const w = num("w");
  const h = num("h");
  if (x == null || y == null || w == null || h == null) return null;
  return { x, y, w, h };
}

export function parseDiscoveryObservation(raw: unknown): DiscoveryObservation | null {
  const row = asRecord(raw);
  if (!row || typeof row.selector !== "string" || !row.selector) return null;
  if (!DISCOVERY_SOURCES.includes(row.source as DiscoverySource)) return null;
  return {
    selector: row.selector.slice(0, 180),
    source: row.source as DiscoverySource,
    changes: Array.isArray(row.changes)
      ? row.changes.filter((change): change is string => typeof change === "string").slice(0, 8)
      : [],
    t0: asRecord(row.t0),
    t1: asRecord(row.t1),
    region: asRegion(row.region),
    action: typeof row.action === "string" && row.action ? row.action.slice(0, 24) : null,
    shadow_path: asPath(row.shadow_path),
    frame_path: asPath(row.frame_path),
  };
}

export function parseDiscoveryTraversal(raw: unknown): DiscoveryTraversalV1 | null {
  const row = asRecord(raw);
  if (!row) return null;
  const num = (key: string) => (typeof row[key] === "number" && Number.isFinite(row[key] as number) ? (row[key] as number) : 0);
  return {
    shadow_open: num("shadow_open"),
    shadow_closed: num("shadow_closed"),
    same_origin_frames: num("same_origin_frames"),
    cross_origin_frames: num("cross_origin_frames"),
  };
}

export function parseUnreadableSurfaces(raw: unknown): UnreadableSurfaceV1[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 6).flatMap((item) => {
    const row = asRecord(item);
    if (!row || typeof row.selector !== "string" || !row.selector) return [];
    if (row.reason !== "closed_shadow" && row.reason !== "cross_origin_frame") return [];
    return [
      {
        selector: row.selector.slice(0, 180),
        shadow_path: asPath(row.shadow_path),
        frame_path: asPath(row.frame_path),
        reason: row.reason,
      },
    ];
  });
}

export type DiscoveryNetworkEvidenceV1 = {
  method: string;
  path: string;
  status: number | null;
  failed: boolean;
  duration_ms: number | null;
};

export type DiscoveryRuntimeEvidenceV1 = {
  kind: "console_error" | "pageerror" | "requestfailed";
  message: string;
};

export type DiscoveryRenderedEvidenceV1 = {
  selector: string;
  changes: string[];
  shadow_path: string[];
  frame_path: string[];
};

/** One safe action, with the network and runtime events that started inside its window. */
export type DiscoveryTransitionV1 = {
  action_id: string;
  action: string;
  selector: string;
  shadow_path: string[];
  frame_path: string[];
  state_before: string;
  state_after: string;
  started_at: number;
  rendered: DiscoveryRenderedEvidenceV1[];
  network: DiscoveryNetworkEvidenceV1[];
  runtime: DiscoveryRuntimeEvidenceV1[];
};

const NETWORK_NOISE = /analytics|beacon|collect|gtm|googletagmanager|doubleclick|hotjar|segment|mixpanel|heartbeat|\/ping|favicon/i;

function asStringList(value: unknown, cap: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0).slice(0, cap);
}

function parseRenderedEvidence(value: unknown): DiscoveryRenderedEvidenceV1[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 4).flatMap((item) => {
    const row = asRecord(item);
    if (!row || typeof row.selector !== "string" || !row.selector) return [];
    return [
      {
        selector: row.selector.slice(0, 180),
        changes: asStringList(row.changes, 4),
        shadow_path: asPath(row.shadow_path),
        frame_path: asPath(row.frame_path),
      },
    ];
  });
}

function parseNetworkEvidence(value: unknown, cap = 4): DiscoveryNetworkEvidenceV1[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, cap).flatMap((item) => {
    const row = asRecord(item);
    if (!row || typeof row.method !== "string" || typeof row.path !== "string") return [];
    const status = typeof row.status === "number" && Number.isFinite(row.status) ? row.status : null;
    return [
      {
        method: row.method.slice(0, 12),
        path: row.path.slice(0, 120),
        status,
        failed: row.failed === true || (status != null && status >= 400),
        duration_ms: typeof row.duration_ms === "number" && Number.isFinite(row.duration_ms) ? Math.max(0, Math.round(row.duration_ms)) : null,
      },
    ];
  });
}

function parseRuntimeEvidence(value: unknown, cap = 4): DiscoveryRuntimeEvidenceV1[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, cap).flatMap((item) => {
    const row = asRecord(item);
    if (!row || typeof row.message !== "string" || !row.message) return [];
    if (row.kind !== "console_error" && row.kind !== "pageerror" && row.kind !== "requestfailed") return [];
    return [{ kind: row.kind, message: row.message.slice(0, 160) }];
  });
}

export function parseDiscoveryTransitions(raw: unknown): DiscoveryTransitionV1[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.slice(0, 8).flatMap((item) => {
    const row = asRecord(item);
    if (!row || typeof row.selector !== "string" || !row.selector) return [];
    return [
      {
        action_id: typeof row.action_id === "string" && row.action_id ? row.action_id.slice(0, 24) : "a0",
        action: typeof row.action === "string" && row.action ? row.action.slice(0, 24) : "click",
        selector: row.selector.slice(0, 180),
        shadow_path: asPath(row.shadow_path),
        frame_path: asPath(row.frame_path),
        state_before: typeof row.state_before === "string" ? row.state_before.slice(0, 16) : "",
        state_after: typeof row.state_after === "string" ? row.state_after.slice(0, 16) : "",
        started_at: typeof row.started_at === "number" && Number.isFinite(row.started_at) ? Math.max(0, Math.round(row.started_at)) : 0,
        rendered: parseRenderedEvidence(row.rendered),
        network: parseNetworkEvidence(row.network),
        runtime: parseRuntimeEvidence(row.runtime),
      },
    ];
  });
}

/**
 * Keep request/response and runtime errors that started in the action window.
 * A 2xx is network evidence beside a rendered change. It does not decide Working.
 * Paths and errors already seen before the action stay in the baseline.
 */
export function refineActionChains(raw: unknown): DiscoveryTransitionV1[] | null {
  const row = asRecord(raw);
  if (!row || !Array.isArray(row.transitions)) return null;
  const seenPaths = new Set(asStringList(row.baseline_paths, 40));
  const seenMessages = new Set(asStringList(row.baseline_messages, 40));
  const refined = row.transitions.slice(0, 12).flatMap((item) => {
    const transition = asRecord(item);
    if (!transition || typeof transition.selector !== "string" || !transition.selector) return [];
    const rendered = parseRenderedEvidence(transition.rendered);
    const network: DiscoveryNetworkEvidenceV1[] = [];
    for (const event of parseNetworkEvidence(transition.network, 12)) {
      if (event.method === "OPTIONS") continue;
      const key = `${event.method} ${event.path}`;
      const noisy = NETWORK_NOISE.test(event.path);
      const known = seenPaths.has(key);
      seenPaths.add(key);
      if (noisy || known) continue;
      if (!event.failed && rendered.length === 0) continue;
      network.push(event);
      if (network.length >= 4) break;
    }
    const runtime: DiscoveryRuntimeEvidenceV1[] = [];
    for (const event of parseRuntimeEvidence(transition.runtime, 12)) {
      const key = `${event.kind}:${event.message}`;
      const noisy = NETWORK_NOISE.test(event.message);
      const known = seenMessages.has(key);
      seenMessages.add(key);
      if (noisy || known) continue;
      runtime.push(event);
      if (runtime.length >= 4) break;
    }
    if (!network.length && !runtime.length && !rendered.length) return [];
    return [
      {
        action_id: typeof transition.action_id === "string" && transition.action_id ? transition.action_id.slice(0, 24) : "a0",
        action: typeof transition.action === "string" && transition.action ? transition.action.slice(0, 24) : "click",
        selector: transition.selector.slice(0, 180),
        shadow_path: asPath(transition.shadow_path),
        frame_path: asPath(transition.frame_path),
        state_before: typeof transition.state_before === "string" ? transition.state_before.slice(0, 16) : "",
        state_after: typeof transition.state_after === "string" ? transition.state_after.slice(0, 16) : "",
        started_at: typeof transition.started_at === "number" && Number.isFinite(transition.started_at) ? Math.max(0, Math.round(transition.started_at)) : 0,
        rendered,
        network,
        runtime,
      },
    ];
  });
  return refined.slice(0, 8);
}

export function parseStateExploration(raw: unknown): StateExplorationV1 | null {
  const row = asRecord(raw);
  if (!row) return null;
  return {
    ran: row.ran === true,
    steps: typeof row.steps === "number" && Number.isFinite(row.steps) ? row.steps : 0,
    revealed: typeof row.revealed === "number" && Number.isFinite(row.revealed) ? row.revealed : 0,
  };
}

function finite(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

export function parseDiscoveryEnvironment(raw: unknown): DiscoveryEnvironmentV1 | null {
  const row = asRecord(raw);
  const viewport = asRecord(row?.viewport);
  if (!row || !viewport) return null;
  const width = finite(viewport.width);
  const height = finite(viewport.height);
  if (!width || !height) return null;
  return {
    device_class: width < 700 ? "mobile" : "desktop",
    viewport: { width, height },
    pointer: row.pointer === "touch" ? "touch" : "mouse",
    touch: row.touch === true,
    locale: typeof row.locale === "string" ? row.locale.slice(0, 40) : "",
    timezone: typeof row.timezone === "string" ? row.timezone.slice(0, 80) : "",
    prefers_reduced_motion: row.prefers_reduced_motion === true,
  };
}

export function parseTemporalObservation(raw: unknown): TemporalObservationV1 | null {
  const row = asRecord(raw);
  if (!row) return null;
  const reason = temporalReason(row.reason);
  const behaviors = Array.isArray(row.behaviors)
    ? row.behaviors.flatMap((item) => {
        const behavior = asRecord(item);
        if (!behavior || typeof behavior.selector !== "string" || !behavior.selector) return [];
        const kind = behavior.kind;
        const samples = Array.isArray(behavior.samples)
          ? behavior.samples.flatMap((sample) => {
              const point = asRecord(sample);
              if (!point) return [];
              return [
                {
                  t: finite(point.t),
                  ...(typeof point.hash === "string" ? { hash: point.hash.slice(0, 32) } : {}),
                  ...(typeof point.change === "string" ? { change: point.change.slice(0, 80) } : {}),
                },
              ];
            }).slice(0, 8)
          : [];
        return [
          {
            selector: behavior.selector.slice(0, 180),
            kind:
              kind === "delayed" || kind === "periodic" || kind === "visual" || kind === "media" || kind === "animation"
                ? kind
                : "animation",
            first_seen_at: finite(behavior.first_seen_at),
            last_changed_at: finite(behavior.last_changed_at),
            samples,
            observation_window_ms: finite(behavior.observation_window_ms),
            sampling_reason: behaviorReason(behavior.sampling_reason),
          } satisfies TemporalBehaviorV1,
        ];
      }).slice(0, 8)
    : [];
  return {
    ran: row.ran === true,
    window_ms: finite(row.window_ms),
    completed_through_ms: finite(row.completed_through_ms),
    reason,
    behaviors,
  };
}

function behaviorReason(value: unknown): TemporalBehaviorV1["sampling_reason"] {
  const reason = temporalReason(value);
  return reason === "skipped" ? "settled" : reason;
}

function temporalReason(value: unknown): TemporalObservationV1["reason"] {
  if (
    value === "settled" ||
    value === "still_active" ||
    value === "delayed_candidate" ||
    value === "periodic" ||
    value === "time_limit" ||
    value === "skipped"
  ) {
    return value;
  }
  return "skipped";
}

export function parseExplorationExhaustion(raw: unknown): ExplorationExhaustionV1 | null {
  const row = asRecord(raw);
  if (!row) return null;
  const status = row.status === "completed" || row.status === "incomplete" || row.status === "skipped" ? row.status : "skipped";
  const reason = exhaustionReason(row.reason);
  const unexplored_reasons = Array.isArray(row.unexplored_reasons)
    ? row.unexplored_reasons.flatMap((item) => {
        const entry = asRecord(item);
        if (!entry || typeof entry.selector !== "string" || !entry.selector) return [];
        const why = entry.reason;
        if (why !== "action_budget" && why !== "state_limit" && why !== "time_limit" && why !== "depth_limit") return [];
        return [{ selector: entry.selector.slice(0, 180), reason: why as ExplorationExhaustionV1["unexplored_reasons"][number]["reason"] }];
      }).slice(0, 12)
    : [];
  return {
    status,
    reason,
    discovered: finite(row.discovered),
    executed: finite(row.executed),
    unexplored: finite(row.unexplored),
    unexplored_reasons,
  };
}

function exhaustionReason(value: unknown): ExplorationExhaustionV1["reason"] {
  if (
    value === "no_unexplored_safe_candidates" ||
    value === "action_budget" ||
    value === "state_limit" ||
    value === "time_limit" ||
    value === "depth_limit" ||
    value === "skipped"
  ) {
    return value;
  }
  return "skipped";
}

export function buildCoverageManifest(input: {
  region?: string;
  environment: DiscoveryEnvironmentV1 | null;
  temporal: TemporalObservationV1 | null;
  exhaustion: ExplorationExhaustionV1 | null;
  routes: DiscoveryRoutes;
  visualRan: boolean;
  closedShadow: number;
  crossOriginFrames: number;
  blocked: number;
}): CoverageManifestV1 | null {
  if (!input.environment && !input.temporal && !input.exhaustion) return null;
  const sensor = (ran: boolean): "measured" | "skipped" => (ran ? "measured" : "skipped");
  const discovery = {
    dom: sensor(input.routes.dom.ran),
    computed_style: sensor(input.routes.style.ran),
    web_animations: sensor(input.routes.animation.ran),
    media: sensor(input.routes.media.ran),
    visual_regions: sensor(input.visualRan || input.routes.frame.ran),
    scroll: sensor(input.routes.scroll.ran),
    actions: sensor(input.routes.actionable.ran),
    network: "measured" as const,
    console_runtime: "measured" as const,
    open_shadow: "measured" as const,
    same_origin_frames: "measured" as const,
  };
  const exploration =
    !input.exhaustion || input.exhaustion.status === "skipped"
      ? "skipped"
      : input.exhaustion.status === "completed"
        ? "exhausted"
        : "incomplete";
  const unexplored = input.exhaustion?.unexplored ?? 0;
  const full = Object.values(discovery).every((state) => state === "measured");
  const statement =
    full && exploration === "exhausted" && unexplored === 0 && input.temporal?.ran
      ? "measured_within_scope"
      : "scan_recorded";
  return {
    region: input.region?.slice(0, 40) ?? "",
    environment: input.environment,
    temporal_window_ms: input.temporal?.ran ? input.temporal.completed_through_ms : null,
    temporal_reason: input.temporal?.ran ? input.temporal.reason : "skipped",
    state_exploration: input.exhaustion && input.exhaustion.status !== "skipped" ? input.exhaustion.discovered : null,
    safe_actions_discovered: input.exhaustion && input.exhaustion.status !== "skipped" ? input.exhaustion.discovered : null,
    safe_actions_executed: input.exhaustion && input.exhaustion.status !== "skipped" ? input.exhaustion.executed : null,
    exploration,
    discovery,
    boundaries: {
      closed_shadow: input.closedShadow,
      cross_origin_frames: input.crossOriginFrames,
      blocked_for_safety: input.blocked,
      unexplored_candidates: unexplored,
    },
    statement,
  };
}

export function parseDiscoveryRoutes(raw: unknown): DiscoveryRoutes {
  const routes = emptyDiscoveryRoutes();
  const row = asRecord(raw);
  if (!row) return routes;
  for (const source of DISCOVERY_SOURCES) {
    const item = asRecord(row[source]);
    if (!item) continue;
    routes[source] = {
      ran: item.ran === true,
      hits: typeof item.hits === "number" && Number.isFinite(item.hits) ? item.hits : 0,
    };
  }
  return routes;
}

function classifySelector(
  sources: DiscoverySource[],
  changes: string[],
  claims: readonly BehaviorClaim[],
  selector: string,
  paths: { shadow_path?: string[]; frame_path?: string[] },
): BehaviorClassification {
  const insideSurface = Boolean(paths.shadow_path?.length || paths.frame_path?.length);
  const matches = insideSurface ? [] : claims.filter((claim) => claim.selector === selector);
  if (matches.length > 0) {
    const motionType = new Set<BehaviorClassification>([
      "css_animation",
      "js_animation",
      "svg_animation",
      "lottie",
      "auto_carousel",
    ]);
    let best = matches[0];
    let bestScore = -1;
    for (const claim of matches) {
      const score = claim.changes.filter((change) => changes.includes(change)).length;
      const prefersAnimation =
        score === bestScore &&
        sources.includes("animation") &&
        motionType.has(claim.type) &&
        !motionType.has(best.type);
      if (score > bestScore || prefersAnimation) {
        best = claim;
        bestScore = score;
      }
    }
    return best.type;
  }
  if (sources.some((source) => RENDERED_SOURCES.has(source))) return unknownChangeClass(sources, changes);
  return "actionable";
}

/** One element, one map entry. Unclassified changes stay unknown, split by the evidence that was measured. */
export function mergeBehaviorObservations(
  observations: readonly DiscoveryObservation[],
  claims: readonly BehaviorClaim[],
): BehaviorMapEntry[] {
  const groups = new Map<string, BehaviorMapEntry>();
  for (const row of observations) {
    if (!row.selector) continue;
    const key = behaviorLocationKey(row);
    const current = groups.get(key) ?? {
      selector: row.selector,
      sources: [],
      changes: [],
      t0: null,
      t1: null,
      region: null,
      actions: [],
      shadow_path: row.shadow_path ?? [],
      frame_path: row.frame_path ?? [],
      classification: "actionable" as BehaviorClassification,
    };
    if (!current.sources.includes(row.source)) current.sources.push(row.source);
    for (const change of row.changes) {
      if (!current.changes.includes(change)) current.changes.push(change);
    }
    if (!current.t0 && row.t0) current.t0 = row.t0;
    if (row.t1) current.t1 = row.t1;
    if (!current.region && row.region) current.region = row.region;
    if (row.action && !current.actions.includes(row.action)) current.actions.push(row.action);
    groups.set(key, current);
  }
  const map: BehaviorMapEntry[] = [];
  for (const entry of groups.values()) {
    entry.classification = classifySelector(entry.sources, entry.changes, claims, entry.selector, entry);
    entry.changes = entry.changes.slice(0, 8);
    entry.sources = DISCOVERY_SOURCES.filter((source) => entry.sources.includes(source));
    map.push(entry);
    if (map.length >= 12) break;
  }
  return map;
}

export function summarizeBehaviorScan(
  map: readonly BehaviorMapEntry[],
  types: readonly { type: string; status: string }[],
  blocked: number,
): { discovered: number; verified: number; unknown: number; blocked: number } {
  const behaviors = map.filter((entry) => entry.classification !== "actionable");
  const unknown = behaviors.filter((entry) => isUnknownChange(entry.classification)).length;
  const verified = behaviors.filter((entry) => {
    if (isUnknownChange(entry.classification)) return false;
    return types.some((row) => row.type === entry.classification && row.status === "working");
  }).length;
  return { discovered: behaviors.length, verified, unknown, blocked };
}
