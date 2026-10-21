import { summarizeBehaviorScan } from "@/lib/observation-behavior-discovery";
import type { RegionalInteractionCheckV1 } from "@/lib/observation-regional-interaction";

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
  journeys: ClientJourneyFact[];
};

export function emptyClientMeasuredFacts(): ClientMeasuredFacts {
  return {
    verified: null,
    unknownChanges: null,
    notClicked: null,
    notClickedDetail: "",
    journeys: [],
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
): ClientMeasuredFacts {
  const empty = emptyClientMeasuredFacts();
  if (!check) return empty;
  const discovery = check.discovery;
  if (!discovery) {
    const verified = check.types.filter((row) => row.status === "working").length;
    return { ...empty, verified };
  }
  const blocked = discovery.safety?.blocked ?? [];
  const scan = summarizeBehaviorScan(discovery.map ?? [], check.types, blocked.length);
  return {
    verified: scan.verified,
    unknownChanges: scan.unknown,
    notClicked: scan.blocked,
    notClickedDetail: clientNotClickedDetail(blocked.map((row) => row.text)),
    journeys: [],
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
