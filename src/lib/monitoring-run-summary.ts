import { groupBehaviorFindings, type BehaviorLayoutFinding } from "@/lib/behavior-findings";
import type { BehaviorMapEntry } from "@/lib/observation-behavior-discovery";
import {
  monitoringBehaviorAlertId,
  type MonitoringAlert,
  type MonitoringBehaviorDiffRow,
} from "@/lib/monitoring-run-diff";

const LAYOUT_CHANGES = new Set(["bounding_rect", "display", "visibility", "opacity", "hidden"]);

export type MonitoringReviewPresentation = {
  /** Page, Journey, and behavior alerts that do not share a layout area. */
  changeCount: number;
  areas: BehaviorLayoutFinding[];
  behaviorSingles: Array<Extract<MonitoringAlert, { layer: "behavior" }>>;
};

function layoutChanges(detail: string): string[] {
  return detail.split(" · ").map((part) => part.trim()).filter((part) => LAYOUT_CHANGES.has(part));
}

function layoutEntry(row: MonitoringBehaviorDiffRow): BehaviorMapEntry | null {
  if (!row.selector) return null;
  const changes = layoutChanges(row.current);
  if (changes.length === 0) return null;
  return {
    selector: row.selector,
    sources: ["style"],
    changes,
    actions: [],
    t0: null,
    t1: null,
    region: null,
    classification: "unknown_style_change",
  };
}

/**
 * Display grouping only. Alert records stay one per evidence row.
 * Layout changes that share a section become one area through the existing finding grouper.
 */
export function presentMonitoringReview(
  alerts: readonly MonitoringAlert[],
  rows: readonly MonitoringBehaviorDiffRow[],
): MonitoringReviewPresentation {
  const alertById = new Map(alerts.map((alert) => [alert.id, alert]));
  const groupedRows: MonitoringBehaviorDiffRow[] = [];
  const entries: BehaviorMapEntry[] = [];
  for (const row of rows) {
    if (row.section !== "new" || row.known) continue;
    const alert = alertById.get(monitoringBehaviorAlertId(row));
    if (!alert || alert.layer !== "behavior" || alert.code !== "behavior_new_unknown") continue;
    const entry = layoutEntry(row);
    if (!entry) continue;
    groupedRows.push(row);
    entries.push(entry);
  }
  const findings = groupBehaviorFindings({ map: entries, blocked: [] });
  const consumed = new Set<string>();
  const areas = findings.layout.map((area) => {
    const selectors = new Set(area.evidence.map((item) => item.selector));
    for (const row of groupedRows) {
      if (row.selector && selectors.has(row.selector)) consumed.add(monitoringBehaviorAlertId(row));
    }
    return area;
  });
  const behaviorSingles = alerts.flatMap((alert) => {
    if (alert.layer !== "behavior" || consumed.has(alert.id)) return [];
    return [alert];
  });
  const changeCount = alerts.filter((alert) => alert.layer === "page" || alert.layer === "journey").length + behaviorSingles.length;
  return { changeCount, areas, behaviorSingles };
}
