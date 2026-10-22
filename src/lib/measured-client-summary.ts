import { presentInteractionHealth } from "@/lib/interaction-health-presentation";
import { summarizeBehaviorScan } from "@/lib/observation-behavior-discovery";
import type { BehaviorDiffV1 } from "@/lib/observation-behavior-diff";
import type { RegionalInteractionCheckV1 } from "@/lib/observation-regional-interaction";
import type { ScrollInteractionStatus } from "@/lib/observation-scroll-interaction";

/** Client-facing totals. Empty numbers mean the check was not stored. */
export type ClientJourneyFact = {
  name: string;
  device: "desktop" | "mobile";
  status: string;
};

export type ClientMeasuredFacts = {
  verified: number | null;
  unknownChanges: number | null;
  notClicked: number | null;
  notClickedDetail: string;
  interactionHealth: "" | "Good" | "Check" | "Problem";
  interactionProblems: string;
  interactionAreas: string;
  interactionWorking: string;
  interactionSkipped: string;
  journeys: ClientJourneyFact[];
};

export function emptyClientMeasuredFacts(): ClientMeasuredFacts {
  return {
    verified: null,
    unknownChanges: null,
    notClicked: null,
    notClickedDetail: "",
    interactionHealth: "",
    interactionProblems: "",
    interactionAreas: "",
    interactionWorking: "",
    interactionSkipped: "",
    journeys: [],
  };
}

const INTERACTION_STATUS_EN: Record<ScrollInteractionStatus, string> = {
  working: "worked",
  no_change_observed: "no response",
  failed: "error",
  not_measured: "not measured",
  not_detected: "not found",
  blocked_for_safety: "not clicked for safety",
  playback_not_verifiable: "playback not verified",
};

/** Sentences for the client CSV. Selectors stay out of these cells. */
export function clientInteractionColumns(
  check: RegionalInteractionCheckV1 | null | undefined,
  diff?: BehaviorDiffV1 | null,
): Pick<
  ClientMeasuredFacts,
  "interactionHealth" | "interactionProblems" | "interactionAreas" | "interactionWorking" | "interactionSkipped"
> {
  const empty = {
    interactionHealth: "" as const,
    interactionProblems: "",
    interactionAreas: "",
    interactionWorking: "",
    interactionSkipped: "",
  };
  const view = presentInteractionHealth({ check, diff });
  if (!view) return empty;
  return {
    interactionHealth: view.signal === "good" ? "Good" : view.signal === "check" ? "Check" : "Problem",
    interactionProblems: view.problems
      .map((row) => `${row.type}: ${INTERACTION_STATUS_EN[row.previous]} → ${INTERACTION_STATUS_EN[row.current]}`)
      .join("; "),
    interactionAreas: view.areas.map((area) => `${area.id} ${area.count}`).join("; "),
    interactionWorking: view.working.join("; "),
    interactionSkipped: view.skipped
      .map((row) => {
        const name = row.path ? `${row.label} ${row.path}` : row.label;
        return row.count > 1 ? `${name} × ${row.count}` : name;
      })
      .join("; "),
  };
}

/** Visible control name. A trailing " / /path" is the selector, not the label. */
export function clientBlockedLabel(text: string): string {
  const index = text.indexOf(" /");
  if (index > 0) {
    const path = text.slice(index + 1).trim();
    if (path.startsWith("/")) {
      const name = text.slice(0, index).trim();
      return name || text.trim();
    }
  }
  return text.trim();
}

/** "Log in × 2; Subscribe × 1" */
export function clientNotClickedDetail(texts: readonly string[]): string {
  const counts = new Map<string, number>();
  for (const text of texts) {
    const label = clientBlockedLabel(text);
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => (count > 1 ? `${label} × ${count}` : label))
    .join("; ");
}

export function clientMeasuredFromCheck(
  check: RegionalInteractionCheckV1 | null | undefined,
  diff?: BehaviorDiffV1 | null,
): ClientMeasuredFacts {
  const empty = emptyClientMeasuredFacts();
  const summary = clientInteractionColumns(check, diff);
  if (!check) return empty;
  const discovery = check.discovery;
  if (!discovery) {
    const verified = check.types.filter((row) => row.status === "working").length;
    return { ...empty, ...summary, verified };
  }
  const blocked = discovery.safety?.blocked ?? [];
  const scan = summarizeBehaviorScan(discovery.map ?? [], check.types, blocked.length);
  return {
    ...empty,
    ...summary,
    verified: scan.verified,
    unknownChanges: scan.unknown,
    notClicked: scan.blocked,
    notClickedDetail: clientNotClickedDetail(blocked.map((row) => row.text)),
  };
}

export function clientPageLabel(
  status: string,
  verdict: "same" | "changed" | "incomparable" | null,
): "" | "Same" | "Changed" | "Not comparable" {
  if (status !== "success") return "";
  if (verdict === "same") return "Same";
  if (verdict === "changed") return "Changed";
  return "Not comparable";
}

const JOURNEY_STATUS_EN: Record<string, string> = {
  passed: "Passed",
  failed: "Failed",
  blocked: "Blocked",
  incomplete: "Incomplete",
};

export function clientJourneyStatusEn(status: string): string {
  return JOURNEY_STATUS_EN[status] ?? status;
}

export function clientJourneyColumns(
  journeys: readonly ClientJourneyFact[],
  statusLabel: (status: string) => string = clientJourneyStatusEn,
): { journey: string; result: string } {
  if (journeys.length === 0) return { journey: "", result: "" };
  const ordered = [...journeys].sort((a, b) => {
    if (a.name !== b.name) return a.name.localeCompare(b.name);
    if (a.device === b.device) return 0;
    return a.device === "desktop" ? -1 : 1;
  });
  const names = [...new Set(ordered.map((row) => row.name).filter(Boolean))];
  const result = ordered
    .map((row) => `${row.device === "mobile" ? "Mobile" : "Desktop"} ${statusLabel(row.status)}`)
    .join("; ");
  return { journey: names.join("; "), result };
}
