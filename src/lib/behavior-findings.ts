import type { BehaviorMapEntry } from "@/lib/observation-behavior-discovery";
import { clientBlockedLabel } from "@/lib/measured-client-summary";

const LAYOUT_CHANGES = new Set(["bounding_rect", "display", "visibility", "opacity", "hidden"]);

const SECTION_RULES: Array<{ test: RegExp; label: string }> = [
  { test: /(^|[>\s.#\[])header\b|\[role=['"]?banner/i, label: "Header" },
  { test: /(^|[>\s.#\[])nav\b|\[role=['"]?navigation/i, label: "Navigation" },
  { test: /(^|[>\s.#\[])footer\b|\[role=['"]?contentinfo/i, label: "Footer" },
  { test: /(^|[>\s.#\[])main\b|\[role=['"]?main['"]?\]/i, label: "Main" },
  { test: /(^|[>\s.#\[])aside\b|\[role=['"]?complementary/i, label: "Sidebar" },
];

export type BehaviorEvidenceRow = {
  selector: string;
  changes: string[];
};

export type BehaviorLayoutFinding = {
  kind: "layout";
  id: string;
  section: string;
  title: string;
  count: number;
  summary: "layout_visibility";
  evidence: BehaviorEvidenceRow[];
};

export type BehaviorProtectedEvidence = {
  selector: string;
  text: string;
};

export type BehaviorProtectedFinding = {
  kind: "protected";
  id: string;
  label: string;
  count: number;
  evidence: BehaviorProtectedEvidence[];
};

export type BehaviorFindings = {
  layout: BehaviorLayoutFinding[];
  protected: BehaviorProtectedFinding[];
  ungrouped: BehaviorEvidenceRow[];
};

export function emptyBehaviorFindings(): BehaviorFindings {
  return { layout: [], protected: [], ungrouped: [] };
}

/** Outermost landmark in the selector. Header nav stays Header. */
export function behaviorSectionLabel(selector: string): string | null {
  const value = selector.trim();
  if (!value) return null;
  for (const rule of SECTION_RULES) {
    if (rule.test.test(value)) return rule.label;
  }
  const aria = value.match(/\[aria-label=['"]([^'"]+)['"]\]/i);
  const name = aria?.[1]?.trim() ?? "";
  if (name && name.length <= 40) return name;
  return null;
}

function isLayoutEntry(entry: BehaviorMapEntry): boolean {
  if (entry.classification === "actionable") return false;
  if (entry.changes.length === 0) return false;
  return entry.changes.every((change) => LAYOUT_CHANGES.has(change));
}

function evidenceRow(entry: BehaviorMapEntry): BehaviorEvidenceRow {
  return { selector: entry.selector, changes: [...entry.changes] };
}

/**
 * Presentation groups only. The map and blocked list are read and left unchanged.
 * Layout rows that share a section become one finding. Protected actions group by visible label.
 */
export function groupBehaviorFindings(input: {
  map: readonly BehaviorMapEntry[];
  blocked: readonly BehaviorProtectedEvidence[];
}): BehaviorFindings {
  const layoutGroups = new Map<string, BehaviorEvidenceRow[]>();
  const ungrouped: BehaviorEvidenceRow[] = [];
  for (const entry of input.map) {
    if (!isLayoutEntry(entry)) continue;
    const section = behaviorSectionLabel(entry.selector);
    const row = evidenceRow(entry);
    if (!section) {
      ungrouped.push(row);
      continue;
    }
    const rows = layoutGroups.get(section) ?? [];
    rows.push(row);
    layoutGroups.set(section, rows);
  }
  const layout: BehaviorLayoutFinding[] = [...layoutGroups.entries()]
    .map(([section, evidence]) => ({
      kind: "layout" as const,
      id: `layout:${section}`,
      section,
      title: `${section} changed`,
      count: evidence.length,
      summary: "layout_visibility" as const,
      evidence,
    }))
    .sort((a, b) => b.count - a.count || a.section.localeCompare(b.section));

  const protectedGroups = new Map<string, BehaviorProtectedEvidence[]>();
  for (const row of input.blocked) {
    const label = clientBlockedLabel(row.text);
    if (!label) continue;
    const rows = protectedGroups.get(label) ?? [];
    rows.push({ selector: row.selector, text: row.text });
    protectedGroups.set(label, rows);
  }
  const protectedFindings: BehaviorProtectedFinding[] = [...protectedGroups.entries()]
    .map(([label, evidence]) => ({
      kind: "protected" as const,
      id: `protected:${label}`,
      label,
      count: evidence.length,
      evidence,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return { layout, protected: protectedFindings, ungrouped };
}
