import type { Observation } from "@/lib/demo/observations";
import { formatViewportLabel } from "@/lib/capture-conditions";

export type ObservationsCsvMode = "standard" | "audit";

function csvCell(value: string): string {
  if (!value) return "";
  return `"${value.replace(/"/g, '""')}"`;
}

function captureFlatFields(obs: Observation) {
  const c = obs.captureConditions;
  if (!c) {
    return {
      engine: "",
      fullPage: "",
      country: "",
      state: "",
      viewport: "",
      userAgent: "",
      proxyMode: "",
      proxyProvider: "",
      json: "",
    };
  }
  return {
    engine: c.engine.name,
    fullPage: c.full_page_requested ? "full_page" : "viewport",
    country: c.geo.country ?? "",
    state: c.geo.state ?? "",
    viewport: formatViewportLabel(c),
    userAgent: c.browser.user_agent,
    proxyMode: c.geo.proxy_mode,
    proxyProvider: c.geo.proxy_provider ?? "",
    json: JSON.stringify(c),
  };
}

const EVIDENCE_COLUMNS = ["snapshotSha256", "snapshotPhash", "contentHash"] as const;

const STANDARD_EXTRA = [
  "captureEngine",
  "captureFullPage",
  "captureCountry",
  "captureState",
  "captureViewport",
  "captureProxyMode",
  "captureProxyProvider",
] as const;

const AUDIT_EXTRA = ["captureConditionsJson"] as const;

export function observationsToCsv(rows: Observation[], mode: ObservationsCsvMode = "standard"): string {
  const header = [
    "id",
    "capturedAt",
    "region",
    "url",
    "captureStatus",
    "note",
    "tags",
    "folder",
    "reviewStatus",
    ...EVIDENCE_COLUMNS,
    ...STANDARD_EXTRA,
    ...(mode === "audit" ? AUDIT_EXTRA : []),
  ];

  const lines = [
    header.join(","),
    ...rows.map((r) => {
      const cap = captureFlatFields(r);
      const base = [
        r.id,
        r.capturedAt,
        csvCell(r.regionLabel),
        csvCell(r.url),
        r.status,
        r.note ? csvCell(r.note) : "",
        r.tags?.length ? csvCell(r.tags.join("; ")) : "",
        r.folder ? csvCell(r.folder) : "",
        r.reviewStatus ?? "",
        r.snapshotSha256 ?? "",
        r.snapshotPhash ?? "",
        r.contentHash ?? "",
        cap.engine,
        cap.fullPage,
        cap.country,
        cap.state,
        csvCell(cap.viewport),
        cap.proxyMode,
        cap.proxyProvider,
      ];
      if (mode === "audit") {
        base.push(cap.json ? csvCell(cap.json) : "");
      }
      return base.join(",");
    }),
  ];
  return lines.join("\n");
}
