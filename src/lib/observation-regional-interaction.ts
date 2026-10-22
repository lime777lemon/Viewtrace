/** 1 地域 × 1 Check セッション = 合成 1。タイプごとには課金しない。Journey とは別。 */

import {
  buildScrollInteractionFromPayload,
  parseScrollInteractionFromUnknown,
  parseScrollPayload,
  scrollCheckEvidence,
  type ScrollInteractionStatus,
  type ScrollInteractionV1,
} from "@/lib/observation-scroll-interaction";
import {
  parseRenderedPage,
  type RenderedPageMeasurementV1,
} from "@/lib/browser-rendered-page";
import {
  confirmMeasuredStatus,
  parseInteractionEvidence,
  type InteractionEvidence,
} from "@/lib/observation-interaction-evidence";
import {
  buildCoverageManifest,
  emptyDiscoveryRoutes,
  isUnknownChange,
  mergeBehaviorObservations,
  parseDiscoveryEnvironment,
  parseDiscoveryObservation,
  parseDiscoveryRoutes,
  parseDiscoveryTransitions,
  parseDiscoveryTraversal,
  parseExplorationExhaustion,
  parseStateExploration,
  parseTemporalObservation,
  parseUnreadableSurfaces,
  refineActionChains,
  type CoverageManifestV1,
  type DiscoveryEnvironmentV1,
  type DiscoveryTransitionV1,
  type DiscoveryTraversalV1,
  type ExplorationExhaustionV1,
  type StateExplorationV1,
  type TemporalObservationV1,
  type UnreadableSurfaceV1,
  type BehaviorMapEntry,
  type DiscoveryObservation,
  type DiscoveryRoutes,
  type DiscoverySource,
} from "@/lib/observation-behavior-discovery";
import { SYNTHETIC_UNSAFE_PATTERN_SOURCE } from "@/lib/observation-synthetic-interaction";

export const INTERACTION_UNSAFE_PATTERN_SOURCE =
  SYNTHETIC_UNSAFE_PATTERN_SOURCE +
  "|subscribe|sign[-_ ]?in|log[-_ ]?in|confirm|ログイン|購読|申し込む|登録";

export const REGIONAL_INTERACTION_SCHEMA_VERSION = 1 as const;
export const REGIONAL_INTERACTION_SOURCE = "browserless_interaction_check" as const;

export const INTERACTION_CHECK_GROUPS = [
  {
    id: "user",
    types: [
      "scroll",
      "hover",
      "menu",
      "modal",
      "accordion",
      "tabs",
      "tooltip",
      "form",
      "drag",
      "swipe",
      "cursor_follow",
    ],
  },
  {
    id: "motion",
    types: [
      "load_animation",
      "css_animation",
      "js_animation",
      "scroll_reveal",
      "delayed",
      "lazy_load",
    ],
  },
  {
    id: "media",
    types: [
      "carousel",
      "auto_carousel",
      "video",
      "embedded_video",
      "lottie",
      "svg_animation",
      "canvas",
      "webgl",
    ],
  },
] as const;

export type InteractionCheckGroupId = (typeof INTERACTION_CHECK_GROUPS)[number]["id"];

export const INTERACTION_CHECK_TYPES = INTERACTION_CHECK_GROUPS.flatMap(
  (group) => group.types,
) as unknown as readonly [
  "scroll",
  "hover",
  "menu",
  "modal",
  "accordion",
  "tabs",
  "tooltip",
  "form",
  "drag",
  "swipe",
  "cursor_follow",
  "load_animation",
  "css_animation",
  "js_animation",
  "scroll_reveal",
  "delayed",
  "lazy_load",
  "carousel",
  "auto_carousel",
  "video",
  "embedded_video",
  "lottie",
  "svg_animation",
  "canvas",
  "webgl",
];

export type InteractionCheckType = (typeof INTERACTION_CHECK_TYPES)[number];

const TYPE_SET = new Set<string>(INTERACTION_CHECK_TYPES);

export function isInteractionCheckType(raw: unknown): raw is InteractionCheckType {
  return typeof raw === "string" && TYPE_SET.has(raw);
}

export type BehaviorDiscoveryV1 = {
  scan: "full" | "light";
  samples: number;
  detected: number;
  verified: number;
  blocked: number;
  not_measured: number;
  routes: DiscoveryRoutes;
  map: BehaviorMapEntry[];
  unknown: Array<{
    selector: string;
    sources: DiscoverySource[];
    changes: string[];
    actions: string[];
    t0: Record<string, unknown> | null;
    t1: Record<string, unknown> | null;
    region: { x: number; y: number; w: number; h: number } | null;
    shadow_path: string[];
    frame_path: string[];
  }>;
  exploration: StateExplorationV1 | null;
  traversal: DiscoveryTraversalV1 | null;
  unreadable: UnreadableSurfaceV1[];
  /** Action-window chains. Null when this check was stored before chain evidence existed. */
  transitions: DiscoveryTransitionV1[] | null;
  region_track: { ran: boolean; samples: number; active_cells: number; error: string } | null;
  environment: DiscoveryEnvironmentV1 | null;
  /** DOM after render in this Chromium session. Null on checks stored before this measurement. */
  rendered_page: RenderedPageMeasurementV1 | null;
  measurement_cost: { visual_captures: number; action_duration_ms: number } | null;
  temporal: TemporalObservationV1 | null;
  exhaustion: ExplorationExhaustionV1 | null;
  coverage: CoverageManifestV1 | null;
  /** Actionable elements classified unsafe before any type execute. */
  safety: {
    blocked: Array<{ selector: string; text: string }>;
  };
  /** When this URL × region last ran a full discovery. Carried forward on light scans. */
  full_at: string | null;
};

export type InteractionTypeRow = {
  type: InteractionCheckType;
  detected: boolean;
  status: ScrollInteractionStatus;
  evidence?: InteractionEvidence | null;
};

export type RegionalInteractionCheckV1 = {
  schema_version: typeof REGIONAL_INTERACTION_SCHEMA_VERSION;
  source: typeof REGIONAL_INTERACTION_SOURCE;
  measured_at: string;
  requested_url: string;
  requested_region: string;
  types: InteractionTypeRow[];
  scroll: ScrollInteractionV1 | null;
  duration_ms: number | null;
  proxy_bytes: number | null;
  discovery?: BehaviorDiscoveryV1 | null;
};

function emptyRows(): InteractionTypeRow[] {
  return INTERACTION_CHECK_TYPES.map((type) => ({
    type,
    detected: false,
    status: "not_measured",
  }));
}

function parseStatus(raw: unknown): ScrollInteractionStatus {
  if (
    raw === "working" ||
    raw === "no_change_observed" ||
    raw === "failed" ||
    raw === "not_measured" ||
    raw === "not_detected" ||
    raw === "blocked_for_safety" ||
    raw === "playback_not_verifiable"
  ) {
    return raw;
  }
  return "not_measured";
}

function scrollRow(
  scroll: ScrollInteractionV1,
  evidence?: InteractionTypeRow["evidence"],
): InteractionTypeRow {
  if (scroll.reason === "no_scroll_section") {
    return { type: "scroll", detected: false, status: "not_detected" };
  }
  return {
    type: "scroll",
    detected: true,
    status: scroll.status === "failed" && scroll.reason === "session_error" ? "failed" : scroll.status,
    evidence: evidence ?? undefined,
  };
}

export function sessionTypeRows(
  raw: unknown,
  scroll: ScrollInteractionV1 | null,
  scrollEvidence?: InteractionTypeRow["evidence"],
): InteractionTypeRow[] {
  const listed = Array.isArray(raw) ? raw : [];
  const byType = new Map<InteractionCheckType, InteractionTypeRow>();
  for (const row of listed) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (!isInteractionCheckType(r.type)) continue;
    const evidence = parseInteractionEvidence(r.evidence);
    byType.set(r.type, {
      type: r.type,
      detected: r.detected === true,
      status: confirmMeasuredStatus(parseStatus(r.status), evidence),
      evidence,
    });
  }
  return INTERACTION_CHECK_TYPES.map((type) => {
    if (type === "scroll" && scroll) {
      const stored = byType.get("scroll")?.evidence;
      const evidence = scrollEvidence ?? stored;
      const restore = stored?.restore;
      const merged =
        evidence && restore && evidence.restore !== restore ? { ...evidence, restore } : evidence;
      return scrollRow(scroll, merged);
    }
    return byType.get(type) ?? { type, detected: false, status: "not_measured" };
  });
}

export function buildRegionalCheckFromSession(input: {
  raw: unknown;
  requestedUrl: string;
  requestedRegion: string;
  measuredAt: string;
  durationMs: number;
  proxyBytes: number | null;
}): RegionalInteractionCheckV1 {
  const root =
    input.raw && typeof input.raw === "object" && "data" in input.raw
      ? (input.raw as { data: unknown }).data
      : input.raw;
  const obj = root && typeof root === "object" ? (root as Record<string, unknown>) : {};
  const scrollPayload = parseScrollPayload(obj.scroll ?? obj);
  const scroll = buildScrollInteractionFromPayload({
    payload: scrollPayload,
    requestedUrl: input.requestedUrl,
    requestedRegion: input.requestedRegion,
    measuredAt: input.measuredAt,
    durationMs: input.durationMs,
    proxyBytes: input.proxyBytes,
  });
  const scrollEvidence = scrollCheckEvidence(scrollPayload.checkpoints);
  const types = sessionTypeRows(obj.types, scroll, scrollEvidence);
  const discovery = finalizeDiscovery(parseDiscovery(obj.discovery), types);
  if (discovery?.coverage) discovery.coverage.region = input.requestedRegion;
  return {
    schema_version: REGIONAL_INTERACTION_SCHEMA_VERSION,
    source: REGIONAL_INTERACTION_SOURCE,
    measured_at: input.measuredAt,
    requested_url: input.requestedUrl,
    requested_region: input.requestedRegion,
    types,
    scroll,
    duration_ms: input.durationMs,
    proxy_bytes: input.proxyBytes,
    discovery,
  };
}

export function wrapScrollAsRegionalCheck(scroll: ScrollInteractionV1): RegionalInteractionCheckV1 {
  const types = emptyRows().map((row) => (row.type === "scroll" ? scrollRow(scroll) : row));
  return {
    schema_version: REGIONAL_INTERACTION_SCHEMA_VERSION,
    source: REGIONAL_INTERACTION_SOURCE,
    measured_at: scroll.measured_at,
    requested_url: scroll.requested_url,
    requested_region: scroll.requested_region,
    types,
    scroll,
    duration_ms: scroll.duration_ms,
    proxy_bytes: scroll.proxy_bytes,
  };
}

export function typeRow(
  check: RegionalInteractionCheckV1 | null | undefined,
  type: InteractionCheckType,
): InteractionTypeRow {
  return (
    check?.types.find((row) => row.type === type) ?? {
      type,
      detected: false,
      status: "not_measured",
    }
  );
}

function parseUnknownRow(raw: unknown): BehaviorDiscoveryV1["unknown"][number] | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  if (typeof item.selector !== "string" || !item.selector) return null;
  const sources = Array.isArray(item.sources)
    ? item.sources.filter((source): source is DiscoverySource =>
        source === "dom" ||
        source === "style" ||
        source === "animation" ||
        source === "media" ||
        source === "frame" ||
        source === "scroll" ||
        source === "actionable",
      )
    : [];
  const region =
    item.region && typeof item.region === "object"
      ? (item.region as BehaviorDiscoveryV1["unknown"][number]["region"])
      : null;
  return {
    selector: item.selector,
    sources,
    changes: Array.isArray(item.changes)
      ? item.changes.filter((change): change is string => typeof change === "string").slice(0, 8)
      : [],
    t0: item.t0 && typeof item.t0 === "object" ? (item.t0 as Record<string, unknown>) : null,
    t1: item.t1 && typeof item.t1 === "object" ? (item.t1 as Record<string, unknown>) : null,
    region: region && typeof region.x === "number" ? region : null,
    actions: Array.isArray(item.actions)
      ? item.actions.filter((action): action is string => typeof action === "string").slice(0, 4)
      : [],
    shadow_path: Array.isArray(item.shadow_path)
      ? item.shadow_path.filter((part): part is string => typeof part === "string").slice(0, 4)
      : [],
    frame_path: Array.isArray(item.frame_path)
      ? item.frame_path.filter((part): part is string => typeof part === "string").slice(0, 4)
      : [],
  };
}

function parseMeasurementCost(raw: unknown): BehaviorDiscoveryV1["measurement_cost"] {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const visual = row.visual_captures;
  const action = row.action_duration_ms;
  if (typeof visual !== "number" && typeof action !== "number") return null;
  return {
    visual_captures: typeof visual === "number" && Number.isFinite(visual) ? Math.max(0, Math.round(visual)) : 0,
    action_duration_ms: typeof action === "number" && Number.isFinite(action) ? Math.max(0, Math.round(action)) : 0,
  };
}

function parseRegionTrack(raw: unknown): BehaviorDiscoveryV1["region_track"] {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  return {
    ran: row.ran === true,
    samples: typeof row.samples === "number" && Number.isFinite(row.samples) ? row.samples : 0,
    active_cells: typeof row.active_cells === "number" && Number.isFinite(row.active_cells) ? row.active_cells : 0,
    error: typeof row.error === "string" ? row.error.slice(0, 180) : "",
  };
}

function parseDiscovery(raw: unknown): { discovery: BehaviorDiscoveryV1; observations: DiscoveryObservation[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const scan = o.scan === "light" ? "light" : o.scan === "full" ? "full" : null;
  if (!scan) return null;
  const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
  const unknown = Array.isArray(o.unknown)
    ? o.unknown.slice(0, 6).flatMap((row) => {
        const parsed = parseUnknownRow(row);
        return parsed ? [parsed] : [];
      })
    : [];
  const map = Array.isArray(o.map)
    ? o.map.slice(0, 12).flatMap((row) => {
        if (!row || typeof row !== "object") return [];
        const item = row as Record<string, unknown>;
        if (typeof item.selector !== "string" || !item.selector) return [];
        const classification = item.classification;
        if (
          classification !== "actionable" &&
          !(typeof classification === "string" && isUnknownChange(classification)) &&
          !isInteractionCheckType(classification)
        ) {
          return [];
        }
        const base = parseUnknownRow(row);
        if (!base) return [];
        const typed = classification as BehaviorMapEntry["classification"];
        return [{ ...base, classification: typed }];
      })
    : [];
  const observations = Array.isArray(o.observations)
    ? o.observations.flatMap((row) => {
        const parsed = parseDiscoveryObservation(row);
        return parsed ? [parsed] : [];
      })
    : [];
  const safetyRaw = o.safety && typeof o.safety === "object" ? (o.safety as Record<string, unknown>) : null;
  const blocked = Array.isArray(safetyRaw?.blocked)
    ? safetyRaw.blocked.slice(0, 8).flatMap((row) => {
        if (!row || typeof row !== "object") return [];
        const item = row as Record<string, unknown>;
        if (typeof item.text !== "string" || !item.text) return [];
        return [
          {
            selector: typeof item.selector === "string" ? item.selector : "",
            text: item.text.slice(0, 120),
          },
        ];
      })
    : [];
  const parsed: { discovery: BehaviorDiscoveryV1; observations: DiscoveryObservation[] } = {
    observations,
    discovery: {
      scan,
      samples: num(o.samples),
      detected: num(o.detected),
      verified: num(o.verified),
      blocked: num(o.blocked),
      not_measured: num(o.not_measured),
      routes: parseDiscoveryRoutes(o.routes),
      map,
      unknown,
      safety: { blocked },
      exploration: parseStateExploration(o.exploration),
      traversal: parseDiscoveryTraversal(o.traversal),
      unreadable: parseUnreadableSurfaces(o.unreadable),
      transitions: Array.isArray(o.transitions)
        ? parseDiscoveryTransitions(o.transitions)
        : refineActionChains(o.chain_raw),
      region_track: parseRegionTrack(o.region_track),
      environment: parseDiscoveryEnvironment(o.environment),
      rendered_page: parseRenderedPage(o.rendered, o.navigation),
      measurement_cost: parseMeasurementCost(o.cost),
      temporal: parseTemporalObservation(o.temporal),
      exhaustion: parseExplorationExhaustion(o.exhaustion),
      coverage: null,
      full_at: typeof o.full_at === "string" ? o.full_at : null,
    },
  };
  parsed.discovery.coverage = buildCoverageManifest({
    region: typeof o.coverage === "object" && o.coverage && "region" in o.coverage && typeof (o.coverage as { region?: unknown }).region === "string"
      ? (o.coverage as { region: string }).region
      : "",
    environment: parsed.discovery.environment,
    temporal: parsed.discovery.temporal,
    exhaustion: parsed.discovery.exhaustion,
    routes: parsed.discovery.routes,
    visualRan: parsed.discovery.region_track?.ran === true,
    closedShadow: parsed.discovery.traversal?.shadow_closed ?? 0,
    crossOriginFrames: parsed.discovery.traversal?.cross_origin_frames ?? 0,
    blocked: parsed.discovery.safety.blocked.length,
  });
  return parsed;
}

function finalizeDiscovery(
  parsed: { discovery: BehaviorDiscoveryV1; observations: DiscoveryObservation[] } | null,
  types: readonly InteractionTypeRow[],
): BehaviorDiscoveryV1 | null {
  if (!parsed) return null;
  if (!parsed.observations.length) {
    return {
      ...parsed.discovery,
      routes: parsed.discovery.routes ?? emptyDiscoveryRoutes(),
    };
  }
  const claims = types.flatMap((row) => {
    const selector = row.evidence?.selector;
    if (!row.detected || !selector) return [];
    return [{ type: row.type, selector, changes: row.evidence?.changes ?? [] }];
  });
  const map = mergeBehaviorObservations(parsed.observations, claims);
  const unknown = map
    .filter((entry) => isUnknownChange(entry.classification))
    .slice(0, 6)
    .map((entry) => ({
      selector: entry.selector,
      sources: entry.sources,
      changes: entry.changes,
      actions: entry.actions,
      shadow_path: entry.shadow_path ?? [],
      frame_path: entry.frame_path ?? [],
      t0: entry.t0,
      t1: entry.t1,
      region: entry.region,
    }));
  return { ...parsed.discovery, map, unknown };
}

export function parseRegionalInteractionCheckFromUnknown(
  raw: unknown,
): RegionalInteractionCheckV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.source === REGIONAL_INTERACTION_SOURCE && o.schema_version === REGIONAL_INTERACTION_SCHEMA_VERSION) {
    const scroll = parseScrollInteractionFromUnknown(o.scroll) ?? null;
    const types = sessionTypeRows(o.types, scroll);
    return {
      schema_version: REGIONAL_INTERACTION_SCHEMA_VERSION,
      source: REGIONAL_INTERACTION_SOURCE,
      measured_at: typeof o.measured_at === "string" ? o.measured_at : scroll?.measured_at ?? "",
      requested_url: typeof o.requested_url === "string" ? o.requested_url : scroll?.requested_url ?? "",
      requested_region:
        typeof o.requested_region === "string" ? o.requested_region : scroll?.requested_region ?? "",
      types,
      scroll,
      duration_ms: typeof o.duration_ms === "number" && Number.isFinite(o.duration_ms) ? o.duration_ms : null,
      proxy_bytes: typeof o.proxy_bytes === "number" && Number.isFinite(o.proxy_bytes) ? o.proxy_bytes : null,
      discovery: finalizeDiscovery(parseDiscovery(o.discovery), types),
    };
  }
  const legacy = parseScrollInteractionFromUnknown(raw);
  return legacy ? wrapScrollAsRegionalCheck(legacy) : null;
}
