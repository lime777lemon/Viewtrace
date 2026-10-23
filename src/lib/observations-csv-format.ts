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
import { pageSeoForCapture } from "@/lib/measurement-record";
import { diffSearchSocial, presentSearchSocial, type SearchSocialChangeId } from "@/lib/search-social-presentation";

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
  "interactionHealth",
  "interactionProblems",
  "interactionAreas",
  "interactionWorking",
  "interactionSkipped",
  "searchTitle",
  "socialTitle",
  "seoScore",
  "seoEarnedPoints",
  "seoPossiblePoints",
  "seoMeasuredSignals",
  "seoScoringVersion",
  "searchSocialChanges",
  "journey",
  "journeyResult",
] as const;

const SEARCH_CHANGE_EN: Record<SearchSocialChangeId, string> = {
  search_title: "Search title",
  search_description: "Search description",
  social_title: "Social title",
  social_description: "Social description",
  social_image: "Social image",
  twitter_title: "Twitter title",
  twitter_image: "Twitter image",
  canonical: "Canonical",
  noindex: "noindex",
  http: "HTTP status",
  lang: "Language",
};

function sameRegionSiblings(row: Observation, rows: Observation[]): Observation[] {
  return rows.filter(
    (other) =>
      other.id !== row.id &&
      sameObservationUrlIdentity(other.url, row.url) &&
      other.regionValue === row.regionValue,
  );
}

function pageCell(row: Observation, rows: Observation[]): string {
  if (row.status !== "success") return "";
  const previous = previousObservationForCompare(row, sameRegionSiblings(row, rows));
  if (!previous) return clientPageLabel(row.status, null);
  const field = screenshotCompareField(previous, row);
  const verdict =
    field.verdict === "same" || field.verdict === "changed" || field.verdict === "incomparable"
      ? field.verdict
      : null;
  return clientPageLabel(row.status, verdict);
}

function clientSearchCells(row: Observation, rows: Observation[]): {
  searchTitle: string;
  socialTitle: string;
  seoScore: string;
  seoEarnedPoints: string;
  seoPossiblePoints: string;
  seoMeasuredSignals: string;
  seoScoringVersion: string;
  changes: string;
} {
  const empty = {
    searchTitle: "",
    socialTitle: "",
    seoScore: "",
    seoEarnedPoints: "",
    seoPossiblePoints: "",
    seoMeasuredSignals: "",
    seoScoringVersion: "",
    changes: "",
  };
  const signals = row.captureConditions?.html_signals;
  if (!signals) return empty;
  const previous = previousObservationForCompare(row, sameRegionSiblings(row, rows));
  const previousSignals = previous?.captureConditions?.html_signals ?? null;
  const view = presentSearchSocial({ signals, requestedUrl: row.url, previous: previousSignals });
  const seo = pageSeoForCapture(row.captureConditions);
  const changes = !previousSignals
    ? "No previous capture"
    : diffSearchSocial(previousSignals, signals)
        .map((change) => SEARCH_CHANGE_EN[change.id])
        .join("; ") || "Same";
  return {
    searchTitle: view.search.title,
    socialTitle: view.social.title,
    seoScore: seo?.score == null ? "" : String(seo.score),
    seoEarnedPoints: seo ? String(seo.earned_points) : "",
    seoPossiblePoints: seo ? String(seo.possible_points) : "",
    seoMeasuredSignals: seo ? String(seo.measured_signals) : "",
    seoScoringVersion: seo?.scoring_version ?? "",
    changes,
  };
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
      const search = clientSearchCells(r, rows);
      const base = [
        r.id,
        r.capturedAt,
        csvCell(r.regionLabel),
        csvCell(r.url),
        r.status,
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
        facts.interactionHealth,
        facts.interactionProblems ? csvCell(facts.interactionProblems) : "",
        facts.interactionAreas ? csvCell(facts.interactionAreas) : "",
        facts.interactionWorking ? csvCell(facts.interactionWorking) : "",
        facts.interactionSkipped ? csvCell(facts.interactionSkipped) : "",
        search.searchTitle ? csvCell(search.searchTitle) : "",
        search.socialTitle ? csvCell(search.socialTitle) : "",
        search.seoScore,
        search.seoEarnedPoints,
        search.seoPossiblePoints,
        search.seoMeasuredSignals,
        search.seoScoringVersion,
        search.changes ? csvCell(search.changes) : "",
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
