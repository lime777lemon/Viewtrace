import { behaviorSectionLabel } from "@/lib/behavior-findings";
import { clientBlockedLabel } from "@/lib/measured-client-summary";
import type { BehaviorMapDiffV1, BehaviorDiffV1 } from "@/lib/observation-behavior-diff";
import type { BehaviorMapEntry } from "@/lib/observation-behavior-discovery";
import type { InteractionCheckType, RegionalInteractionCheckV1 } from "@/lib/observation-regional-interaction";
import type { ScrollInteractionStatus } from "@/lib/observation-scroll-interaction";

export type HealthSignal = "good" | "check" | "problem";

export type HealthAreaId = "Header" | "Navigation" | "Main" | "Form" | "Sidebar" | "Footer" | "Motion" | "Page";

export type HealthProblem = {
  type: InteractionCheckType;
  previous: ScrollInteractionStatus;
  current: ScrollInteractionStatus;
  kind: "regression" | "alert_candidate";
};

export type HealthAreaEvidence = {
  selector: string;
  detail: string;
  label: string;
  section: BehaviorMapDiffV1["section"];
};

export type HealthArea = {
  id: HealthAreaId;
  count: number;
  tone: "new" | "missing" | "mixed";
  evidence: HealthAreaEvidence[];
};

export type HealthSkipped = {
  label: string;
  path: string | null;
  count: number;
};

export type HealthMarker = {
  n: number;
  anchor: string;
  kind: "problem" | "area";
  x: number;
  y: number;
  w: number;
  h: number;
};

export type HealthPresentation = {
  signal: HealthSignal;
  problems: HealthProblem[];
  areas: HealthArea[];
  working: InteractionCheckType[];
  skipped: HealthSkipped[];
  markers: HealthMarker[];
};

const AREA_ORDER: HealthAreaId[] = ["Header", "Navigation", "Main", "Form", "Sidebar", "Footer", "Motion", "Page"];

/** Landmark in a stored selector. Generic elements stay on Page. */
export function interactionAreaId(selector: string): HealthAreaId {
  const landmark = behaviorSectionLabel(selector);
  if (
    landmark === "Header" ||
    landmark === "Navigation" ||
    landmark === "Main" ||
    landmark === "Sidebar" ||
    landmark === "Footer"
  ) {
    return landmark;
  }
  const value = selector.trim();
  if (/^region:\d+/i.test(value)) return "Motion";
  if (/(^|[>\s.#\[])(main|section)\b/i.test(value)) return "Main";
  if (/(^|[>\s.#\[])form\b/i.test(value)) return "Form";
  return "Page";
}

function skippedPath(text: string): string | null {
  const match = text.match(/(\/[A-Za-z0-9_./~-]*)\s*$/);
  return match?.[1] && match[1] !== "/" ? match[1] : null;
}

function areaTone(sections: Array<HealthAreaEvidence["section"]>): HealthArea["tone"] {
  const kinds = new Set(sections);
  if (kinds.size === 1 && kinds.has("new")) return "new";
  if (kinds.size === 1 && kinds.has("missing")) return "missing";
  return "mixed";
}

function regionFor(selector: string, maps: readonly (readonly BehaviorMapEntry[])[]): { x: number; y: number; w: number; h: number } | null {
  for (const map of maps) {
    const row = map.find((entry) => entry.selector === selector && entry.region);
    if (row?.region) return row.region;
  }
  return null;
}

/**
 * Groups a saved check into the sentences a person can act on.
 * Stored transitions, map diffs, and discovery rows are not rewritten.
 */
export function presentInteractionHealth(input: {
  diff?: BehaviorDiffV1 | null;
  check?: RegionalInteractionCheckV1 | null;
  previous?: RegionalInteractionCheckV1 | null;
}): HealthPresentation | null {
  const diff = input.diff ?? null;
  const check = input.check ?? null;
  if (diff?.comparison === "environment_mismatch") return null;
  const transitions = diff?.transitions ?? [];
  const mapDiffs = diff?.map_diffs ?? [];
  const problems: HealthProblem[] = transitions
    .filter((row): row is HealthProblem => row.kind === "regression" || row.kind === "alert_candidate")
    .map((row) => ({
      type: row.type,
      previous: row.previous,
      current: row.current,
      kind: row.kind,
    }));
  const problemTypes = new Set(problems.map((row) => row.type));

  const unknownDiffs = mapDiffs.filter((row) => row.type == null && row.selector);
  const grouped = new Map<HealthAreaId, HealthAreaEvidence[]>();
  for (const row of unknownDiffs) {
    const id = interactionAreaId(row.selector ?? "");
    const rows = grouped.get(id) ?? [];
    rows.push({
      selector: row.selector ?? "",
      detail: row.detail,
      label: row.label,
      section: row.section,
    });
    grouped.set(id, rows);
  }
  if (unknownDiffs.length === 0) {
    for (const row of check?.discovery?.unknown ?? []) {
      const id = interactionAreaId(row.selector);
      const rows = grouped.get(id) ?? [];
      rows.push({
        selector: row.selector,
        detail: row.changes.join(" · "),
        label: row.changes.length ? "Unknown style change detected" : "Unknown DOM change detected",
        section: "new",
      });
      grouped.set(id, rows);
    }
  }
  const areas: HealthArea[] = [...grouped.entries()]
    .map(([id, evidence]) => ({
      id,
      count: evidence.length,
      tone: areaTone(evidence.map((row) => row.section)),
      evidence,
    }))
    .sort((a, b) => AREA_ORDER.indexOf(a.id) - AREA_ORDER.indexOf(b.id) || b.count - a.count);

  const unchanged = mapDiffs.filter((row) => row.section === "unchanged" && row.type && !problemTypes.has(row.type));
  const working: InteractionCheckType[] = unchanged.length
    ? [...new Set(unchanged.map((row) => row.type as InteractionCheckType))]
    : (check?.types ?? []).filter((row) => row.status === "working" && !problemTypes.has(row.type)).map((row) => row.type);

  const skippedGroups = new Map<string, HealthSkipped>();
  for (const row of check?.discovery?.safety?.blocked ?? []) {
    const label = clientBlockedLabel(row.text);
    if (!label) continue;
    const current = skippedGroups.get(label) ?? { label, path: skippedPath(row.text), count: 0 };
    current.count += 1;
    if (!current.path) current.path = skippedPath(row.text);
    skippedGroups.set(label, current);
  }
  const skipped = [...skippedGroups.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  if (!problems.length && !areas.length && !working.length && !skipped.length) return null;

  const signal: HealthSignal = problems.length ? "problem" : areas.length ? "check" : "good";
  const maps = [check?.discovery?.map ?? [], input.previous?.discovery?.map ?? []];
  const markers: HealthMarker[] = [];
  let n = 1;
  for (const area of areas) {
    const region = area.evidence.map((row) => regionFor(row.selector, maps)).find((region) => region != null);
    if (!region) continue;
    markers.push({ n, anchor: `area-${area.id}`, kind: "area", ...region });
    n += 1;
  }

  return { signal, problems, areas, working, skipped, markers };
}
