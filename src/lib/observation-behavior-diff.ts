import { behaviorEnvironmentsCompatible } from "@/lib/measurement-record";
import { isUnknownChange, type UnknownChangeClass } from "@/lib/observation-behavior-discovery";
import type {
  InteractionCheckType,
  RegionalInteractionCheckV1,
} from "@/lib/observation-regional-interaction";
import type { ScrollInteractionStatus } from "@/lib/observation-scroll-interaction";

export const BEHAVIOR_DIFF_SCHEMA_VERSION = 1 as const;

export type BehaviorDiffKind =
  | "unchanged"
  | "regression"
  | "alert_candidate"
  | "new_interaction"
  | "not_comparable";

export type BehaviorTransitionV1 = {
  type: InteractionCheckType;
  previous: ScrollInteractionStatus;
  current: ScrollInteractionStatus;
  kind: BehaviorDiffKind;
};

export type BehaviorMapSection = "new" | "changed" | "missing" | "unchanged";

export type BehaviorMapDiffV1 = {
  section: BehaviorMapSection;
  label: string;
  detail: string;
  selector: string | null;
  type: InteractionCheckType | null;
};

export type BehaviorDiffV1 = {
  schema_version: typeof BEHAVIOR_DIFF_SCHEMA_VERSION;
  previous_observation_id: string | null;
  transitions: BehaviorTransitionV1[];
  map_diffs: BehaviorMapDiffV1[];
  /** Set when the previous check was a different device, viewport, pointer, locale, or motion setting. */
  comparison?: "environment_mismatch";
};

const STATUS_LABEL: Record<ScrollInteractionStatus, string> = {
  working: "Working",
  no_change_observed: "No rendered state change observed",
  failed: "Execution error",
  not_measured: "Not measured",
  not_detected: "Not detected",
  blocked_for_safety: "Blocked for safety",
  playback_not_verifiable: "Detected — playback not verifiable",
};

const TYPE_LABEL: Record<InteractionCheckType, string> = {
  scroll: "Scroll",
  hover: "Hover",
  menu: "Menu",
  modal: "Modal",
  accordion: "Accordion",
  tabs: "Tabs",
  tooltip: "Tooltip / Popover",
  form: "Form",
  drag: "Drag",
  swipe: "Swipe",
  cursor_follow: "Cursor-follow",
  load_animation: "Load animation",
  css_animation: "CSS animation",
  js_animation: "JS animation",
  scroll_reveal: "Scroll reveal",
  delayed: "Delayed content",
  lazy_load: "Lazy-load",
  carousel: "Carousel",
  auto_carousel: "Auto carousel",
  video: "Video",
  embedded_video: "Embedded video",
  lottie: "Lottie",
  svg_animation: "SVG animation",
  canvas: "Canvas",
  webgl: "WebGL",
};

export function behaviorStatusLabel(status: ScrollInteractionStatus): string {
  return STATUS_LABEL[status];
}

export function behaviorTypeLabel(type: InteractionCheckType): string {
  return TYPE_LABEL[type];
}

export function classifyBehaviorTransition(
  previous: ScrollInteractionStatus,
  current: ScrollInteractionStatus,
): BehaviorDiffKind {
  if (previous === "not_measured" || current === "not_measured") return "not_comparable";
  if (previous === "playback_not_verifiable" || current === "playback_not_verifiable") return "not_comparable";
  if (previous === "blocked_for_safety" || current === "blocked_for_safety") {
    return previous === current ? "unchanged" : "not_comparable";
  }
  if (previous === current) return "unchanged";
  if (
    previous === "working" &&
    (current === "no_change_observed" || current === "failed" || current === "not_detected")
  ) {
    return "regression";
  }
  if (previous === "not_detected" && current === "working") return "new_interaction";
  return "not_comparable";
}

function statusFor(
  check: RegionalInteractionCheckV1 | null,
  type: InteractionCheckType,
): ScrollInteractionStatus {
  return check?.types.find((row) => row.type === type)?.status ?? "not_measured";
}

export function buildBehaviorDiff(
  previous: RegionalInteractionCheckV1 | null,
  current: RegionalInteractionCheckV1,
  previousObservationId: string | null,
): BehaviorDiffV1 {
  if (!previous) {
    return {
      schema_version: BEHAVIOR_DIFF_SCHEMA_VERSION,
      previous_observation_id: null,
      transitions: [],
      map_diffs: [],
    };
  }
  const regionMismatch =
    Boolean(previous.requested_region) &&
    Boolean(current.requested_region) &&
    previous.requested_region !== current.requested_region;
  const environmentMismatch =
    regionMismatch ||
    !behaviorEnvironmentsCompatible(previous.discovery?.environment, current.discovery?.environment);
  if (environmentMismatch) {
    return {
      schema_version: BEHAVIOR_DIFF_SCHEMA_VERSION,
      previous_observation_id: previousObservationId,
      comparison: "environment_mismatch",
      transitions: current.types.map((row) => ({
        type: row.type,
        previous: statusFor(previous, row.type),
        current: row.status,
        kind: "not_comparable" as const,
      })),
      map_diffs: [],
    };
  }
  const types = current.types.map((row) => row.type);
  const transitions = types.map((type) => {
    const prior = statusFor(previous, type);
    const next = statusFor(current, type);
    return {
      type,
      previous: prior,
      current: next,
      kind: classifyBehaviorTransition(prior, next),
    };
  });
  return {
    schema_version: BEHAVIOR_DIFF_SCHEMA_VERSION,
    previous_observation_id: previousObservationId,
    transitions,
    map_diffs: diffBehaviorMap({
      transitions,
      previousUnknown: unknownEntries(previous),
      currentUnknown: unknownEntries(current),
      previousMapMeasured: Boolean(previous.discovery),
    }),
  };
}

const SECTION_ORDER: BehaviorMapSection[] = ["new", "changed", "missing", "unchanged"];

function unknownEntries(check: RegionalInteractionCheckV1 | null): Array<{
  selector: string;
  classification: UnknownChangeClass;
  changes: string[];
  shadow_path?: string[];
  frame_path?: string[];
}> {
  return (check?.discovery?.map ?? []).flatMap((entry) => {
    if (!isUnknownChange(entry.classification)) return [];
    return [{
      selector: entry.selector,
      classification: entry.classification,
      changes: entry.changes,
      shadow_path: entry.shadow_path,
      frame_path: entry.frame_path,
    }];
  });
}

function unknownKey(row: { selector: string; shadow_path?: string[]; frame_path?: string[] }): string {
  const shadow = (row.shadow_path ?? []).join(">");
  const frame = (row.frame_path ?? []).join(">");
  if (!shadow && !frame) return row.selector;
  return `${row.selector}|f:${frame}|s:${shadow}`;
}

function unknownDetail(classification: UnknownChangeClass): string {
  if (classification === "unknown_rendered_motion") return "Unknown visual motion detected";
  if (classification === "unknown_dom_change") return "Unknown DOM change detected";
  if (classification === "unknown_style_change") return "Unknown style change detected";
  return "Unknown media change detected";
}

export function diffBehaviorMap(input: {
  transitions: readonly BehaviorTransitionV1[];
  previousUnknown: readonly { selector: string; classification: UnknownChangeClass; changes: string[]; shadow_path?: string[]; frame_path?: string[] }[];
  currentUnknown: readonly { selector: string; classification: UnknownChangeClass; changes: string[]; shadow_path?: string[]; frame_path?: string[] }[];
  previousMapMeasured: boolean;
}): BehaviorMapDiffV1[] {
  const rows: BehaviorMapDiffV1[] = [];
  for (const row of input.transitions) {
    if (row.kind === "unchanged" && row.previous === "working" && row.current === "working") {
      rows.push({
        section: "unchanged",
        label: behaviorTypeLabel(row.type),
        detail: `${behaviorStatusLabel(row.previous)} → ${behaviorStatusLabel(row.current)}`,
        selector: null,
        type: row.type,
      });
      continue;
    }
    if (row.kind === "regression") {
      rows.push({
        section: "changed",
        label: behaviorTypeLabel(row.type),
        detail: `${behaviorStatusLabel(row.previous)} → ${behaviorStatusLabel(row.current)}`,
        selector: null,
        type: row.type,
      });
      continue;
    }
    if (row.kind === "alert_candidate") {
      rows.push({
        section: "missing",
        label: behaviorTypeLabel(row.type),
        detail: "Previously verified → Not detected",
        selector: null,
        type: row.type,
      });
      continue;
    }
    if (row.kind === "new_interaction") {
      rows.push({
        section: "new",
        label: behaviorTypeLabel(row.type),
        detail: `${behaviorStatusLabel(row.previous)} → ${behaviorStatusLabel(row.current)}`,
        selector: null,
        type: row.type,
      });
    }
  }
  if (input.previousMapMeasured) {
    const previousBySelector = new Map(input.previousUnknown.map((row) => [unknownKey(row), row]));
    const currentBySelector = new Map(input.currentUnknown.map((row) => [unknownKey(row), row]));
    for (const row of input.currentUnknown) {
      const prior = previousBySelector.get(unknownKey(row));
      if (!prior) {
        rows.push({
          section: "new",
          label: unknownDetail(row.classification),
          detail: [row.selector, ...row.changes].filter(Boolean).join(" · "),
          selector: row.selector,
          type: null,
        });
        continue;
      }
      if (prior.classification !== row.classification) {
        rows.push({
          section: "changed",
          label: unknownDetail(row.classification),
          detail: `${row.selector} · ${prior.classification} → ${row.classification}`,
          selector: row.selector,
          type: null,
        });
      }
    }
    for (const row of input.previousUnknown) {
      if (currentBySelector.has(unknownKey(row))) continue;
      rows.push({
        section: "missing",
        label: unknownDetail(row.classification),
        detail: row.selector,
        selector: row.selector,
        type: null,
      });
    }
  }
  return rows.sort((a, b) => SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section));
}

export function behaviorMapAlertDiffs(diff: BehaviorDiffV1 | null | undefined): BehaviorMapDiffV1[] {
  return (diff?.map_diffs ?? []).filter((row) => row.section !== "unchanged");
}

export function behaviorAlertTransitions(diff: BehaviorDiffV1 | null | undefined): BehaviorTransitionV1[] {
  return (diff?.transitions ?? []).filter(
    (row) => row.kind === "regression" || row.kind === "alert_candidate",
  );
}

const KIND_SET = new Set<BehaviorDiffKind>([
  "unchanged",
  "regression",
  "alert_candidate",
  "new_interaction",
  "not_comparable",
]);

export function parseBehaviorDiff(raw: unknown): BehaviorDiffV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.schema_version !== BEHAVIOR_DIFF_SCHEMA_VERSION) return null;
  const transitions = Array.isArray(o.transitions) ? o.transitions : [];
  const parsed: BehaviorTransitionV1[] = [];
  for (const row of transitions) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    if (typeof item.type !== "string" || !(item.type in TYPE_LABEL)) continue;
    if (typeof item.previous !== "string" || !(item.previous in STATUS_LABEL)) continue;
    if (typeof item.current !== "string" || !(item.current in STATUS_LABEL)) continue;
    if (typeof item.kind !== "string" || !KIND_SET.has(item.kind as BehaviorDiffKind)) continue;
    parsed.push({
      type: item.type as InteractionCheckType,
      previous: item.previous as ScrollInteractionStatus,
      current: item.current as ScrollInteractionStatus,
      kind: item.kind as BehaviorDiffKind,
    });
  }
  const mapDiffs: BehaviorMapDiffV1[] = [];
  if (Array.isArray(o.map_diffs)) {
    for (const row of o.map_diffs) {
      if (!row || typeof row !== "object") continue;
      const item = row as Record<string, unknown>;
      if (item.section !== "new" && item.section !== "changed" && item.section !== "missing" && item.section !== "unchanged") {
        continue;
      }
      if (typeof item.label !== "string" || typeof item.detail !== "string") continue;
      const type = typeof item.type === "string" && item.type in TYPE_LABEL ? (item.type as InteractionCheckType) : null;
      mapDiffs.push({
        section: item.section,
        label: item.label,
        detail: item.detail,
        selector: typeof item.selector === "string" ? item.selector : null,
        type,
      });
    }
  }
  return {
    schema_version: BEHAVIOR_DIFF_SCHEMA_VERSION,
    previous_observation_id:
      typeof o.previous_observation_id === "string" ? o.previous_observation_id : null,
    transitions: parsed,
    map_diffs: mapDiffs,
    ...(o.comparison === "environment_mismatch" ? { comparison: "environment_mismatch" as const } : {}),
  };
}

export function behaviorAlertEmailCopy(input: {
  region: string;
  alerts: BehaviorTransitionV1[];
  mapDiffs?: BehaviorMapDiffV1[];
}): { subject: string; lines: string[] } {
  const mapDiffs = input.mapDiffs ?? [];
  const regression = input.alerts.some((row) => row.kind === "regression") || mapDiffs.some((row) => row.section === "changed");
  const visual = mapDiffs.some((row) => row.section === "new" && row.label === "Unknown visual motion detected");
  const subject = regression
    ? "Viewtrace: Behavior regression detected"
    : visual
      ? "Viewtrace: Unknown visual motion detected"
      : "Viewtrace: Observed interaction behavior changed";
  const lines = [
    "Observed interaction behavior changed",
    "前回の同じ URL × 地域の Behavior Map と比べて、検証結果が違います。",
    "",
    `Region / 地域: ${input.region}`,
  ];
  for (const row of mapDiffs) {
    lines.push("", row.section === "new" ? "NEW BEHAVIOR" : row.section === "changed" ? "CHANGED BEHAVIOR" : "MISSING BEHAVIOR", row.label, row.detail);
  }
  for (const row of input.alerts) {
    const label = behaviorTypeLabel(row.type);
    const heading =
      row.kind === "regression"
        ? `${label} regression detected in ${input.region}`
        : `${label} no longer detected in ${input.region}`;
    lines.push(
      "",
      heading,
      `Previous: ${behaviorStatusLabel(row.previous)}`,
      `Current: ${behaviorStatusLabel(row.current)}`,
    );
  }
  return { subject, lines };
}
