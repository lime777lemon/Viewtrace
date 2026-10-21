import type { Observation } from "@/lib/demo/observations";
import { formatViewportLabel } from "@/lib/capture-conditions";
import {
  clientJourneyColumns,
  clientPageLabel,
  emptyClientMeasuredFacts,
  type ClientMeasuredFacts,
} from "@/lib/measured-client-summary";
import {
  previousObservationForCompare,
  sameObservationUrlIdentity,
  screenshotCompareField,
} from "@/lib/observation-compare";

export type ObservationsCsvMode = "standard" | "audit";

function csvCell(value: string): string {
  if (!value) return "";
  return `"${value.replace(/"/g, '""')}"`;
}

function captureFlatFields(obs: Observation) {
  const c = obs.captureConditions;
  const cost = c?.cost_signals;
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
      observedRegion: "",
      costDurationMs: "",
      costEstimatedTimeUnits: "",
      costProxyBytes: "",
      costProxyBytesMeasuredAttempts: "",
      costFallback: "",
      costScreenshotBytes: "",
      costAttempts: "",
      json: "",
    };
  }
  const observed =
    c.geo.proxy_mode === "retry_without_proxy" || c.geo.proxy_mode === "none"
      ? "no_geo_proxy"
      : [c.geo.country, c.geo.state].filter(Boolean).join("-");
  return {
    engine: c.engine.name,
    fullPage: c.full_page_requested ? "full_page" : "viewport",
    country: c.geo.country ?? "",
    state: c.geo.state ?? "",
    viewport: formatViewportLabel(c),
    userAgent: c.browser.user_agent,
    proxyMode: c.geo.proxy_mode,
    proxyProvider: c.geo.proxy_provider ?? "",
    observedRegion: observed,
    costDurationMs: cost?.duration_ms != null ? String(cost.duration_ms) : "",
    costEstimatedTimeUnits:
      cost?.estimated_time_units != null ? String(cost.estimated_time_units) : "",
    costProxyBytes: cost?.proxy_bytes != null ? String(cost.proxy_bytes) : "",
    costProxyBytesMeasuredAttempts:
      cost?.proxy_bytes_measured_attempts != null ? String(cost.proxy_bytes_measured_attempts) : "",
    costFallback: cost ? (cost.fallback ? "1" : "0") : "",
    costScreenshotBytes:
      cost?.screenshot_bytes != null
        ? String(cost.screenshot_bytes)
        : c.result.snapshot_bytes != null
          ? String(c.result.snapshot_bytes)
          : "",
    costAttempts: cost?.attempts != null ? String(cost.attempts) : "",
    json: JSON.stringify(c),
  };
}

const EVIDENCE_COLUMNS = ["snapshotSha256", "snapshotPhash", "contentHash"] as const;

const STANDARD_EXTRA = [
  "captureEngine",
  "captureFullPage",
  "captureCountry",
  "captureState",
  "observedRegion",
  "captureViewport",
  "captureProxyMode",
  "captureProxyProvider",
  "costDurationMs",
  "costEstimatedTimeUnits",
  "costProxyBytes",
  "costProxyBytesMeasuredAttempts",
  "costFallback",
  "costScreenshotBytes",
  "costAttempts",
] as const;

const AUDIT_EXTRA = ["captureConditionsJson"] as const;

const CLIENT_COLUMNS = [
  "page",
  "verified",
  "unknownChanges",
  "notClicked",
  "notClickedDetail",
  "journey",
  "journeyResult",
] as const;

function countCell(value: number | null): string {
  return value == null ? "" : String(value);
}

function pageCell(row: Observation, rows: Observation[]): string {
  if (row.status !== "success") return "";
  const siblings = rows.filter(
    (other) =>
      other.id !== row.id &&
      sameObservationUrlIdentity(other.url, row.url) &&
      other.regionValue === row.regionValue,
  );
  const previous = previousObservationForCompare(row, siblings);
  if (!previous) return clientPageLabel(row.status, null);
  const field = screenshotCompareField(previous, row);
  const verdict =
    field.verdict === "same" || field.verdict === "changed" || field.verdict === "incomparable"
      ? field.verdict
      : null;
  return clientPageLabel(row.status, verdict);
}

export function observationsToCsv(
  rows: Observation[],
  mode: ObservationsCsvMode = "standard",
  measured?: Map<string, ClientMeasuredFacts>,
): string {
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
    ...CLIENT_COLUMNS,
    ...(mode === "audit" ? AUDIT_EXTRA : []),
  ];

  const lines = [
    header.join(","),
    ...rows.map((r) => {
      const cap = captureFlatFields(r);
      const facts = measured?.get(r.id) ?? emptyClientMeasuredFacts();
      const journey = clientJourneyColumns(facts.journeys);
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
        cap.observedRegion,
        csvCell(cap.viewport),
        cap.proxyMode,
        cap.proxyProvider,
        cap.costDurationMs,
        cap.costEstimatedTimeUnits,
        cap.costProxyBytes,
        cap.costProxyBytesMeasuredAttempts,
        cap.costFallback,
        cap.costScreenshotBytes,
        cap.costAttempts,
        pageCell(r, rows),
        countCell(facts.verified),
        countCell(facts.unknownChanges),
        countCell(facts.notClicked),
        facts.notClickedDetail ? csvCell(facts.notClickedDetail) : "",
        journey.journey ? csvCell(journey.journey) : "",
        journey.result ? csvCell(journey.result) : "",
      ];
      if (mode === "audit") {
        base.push(cap.json ? csvCell(cap.json) : "");
      }
      return base.join(",");
    }),
  ];
  return lines.join("\n");
}
