import type { CaptureConditionsV1 } from "@/lib/capture-conditions";
import type { Observation } from "@/lib/demo/observations";
import { observationGeoCopyFrom, observationGeoReadout } from "@/lib/observation-geo-readout";
import { observationUrlIdentity, screenshotCompareField, sameObservationUrlIdentity } from "@/lib/observation-compare";
import { behaviorTypeLabel } from "@/lib/observation-behavior-diff";
import { INTERACTION_CHECK_TYPES, type InteractionCheckType } from "@/lib/observation-regional-interaction";
import type { ScrollInteractionStatus } from "@/lib/observation-scroll-interaction";
import { isBlockedPreviewHost } from "@/lib/url-preview";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const SHOWN_OBSERVATION_LIMIT = 8;

const GEO_COPY = observationGeoCopyFrom({
  geoRequestedObserved: "指定: {requested} / 実際の取得: {observed}",
});

export type EvidenceReportPeriod = {
  start: Date;
  end: Date;
  /** JST calendar date the week opens (Monday). */
  startDate: string;
  /** JST calendar date the week closes (Sunday). */
  endDateInclusive: string;
};

export type EvidenceReportBehaviorFact = {
  type: InteractionCheckType;
  status: ScrollInteractionStatus;
};

export type EvidenceReportJourneyFact = {
  id?: string;
  name: string;
  region: string;
  deviceClass: string;
  status: string;
  alert: string | null;
  stateVerified?: boolean;
};

export type EvidenceReportObservationFact = {
  id: string;
  url: string;
  regionValue: string;
  regionLabel: string;
  capturedAt: string;
  status: "success" | "failure" | "pending";
  snapshotSha256?: string;
  snapshotPhash?: string;
  snapshotImageUrl?: string;
  snapshotPurgedAt?: string;
  fullPageRequested?: boolean | null;
  deviceClass?: string | null;
  viewport?: {
    width?: number | null;
    height?: number | null;
    source?: string | null;
  } | null;
  geo?: {
    country?: string | null;
    state?: string | null;
    proxy_mode?: string | null;
    state_verified?: boolean | null;
    geo_attempts?: number | null;
    state_targeting_rejected?: boolean | null;
    verified_measurements?: Array<"screenshot" | "interaction" | "journey" | "lab_cwv"> | null;
  } | null;
  regionInput?: string | null;
  /** Null when no interaction check was stored. */
  behavior: EvidenceReportBehaviorFact[] | null;
};

export type WeeklyEvidenceReportInput = {
  period: EvidenceReportPeriod;
  observations: EvidenceReportObservationFact[];
  /** Same URL × region rows captured before the week, newest last. */
  priorObservations: EvidenceReportObservationFact[];
  journeys: EvidenceReportJourneyFact[];
  stateCoverage?: Array<{
    regionValue: string;
    status: "pending" | "verified" | "exhausted";
    verifiedAt: string | null;
    attemptCount: number;
  }>;
  origin: string;
  /** Login-free page for this report. Dashboard URLs are not included. */
  publicUrl?: string | null;
};

export function previousJstWeek(now: Date): EvidenceReportPeriod {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  const daysFromMonday = (jst.getUTCDay() + 6) % 7;
  const mondayJstAsUtc = Date.UTC(
    jst.getUTCFullYear(),
    jst.getUTCMonth(),
    jst.getUTCDate() - daysFromMonday,
  );
  const end = new Date(mondayJstAsUtc - JST_OFFSET_MS);
  const start = new Date(end.getTime() - 7 * DAY_MS);
  return {
    start,
    end,
    startDate: jstDate(start),
    endDateInclusive: jstDate(new Date(end.getTime() - 1)),
  };
}

export function jstDate(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function formatJstDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")} JST`;
}

export function slackEvidencePayload(text: string): { text: string } {
  return { text };
}

const PAGERDUTY_EVENTS_URL = "https://events.pagerduty.com/v2/enqueue";

const METADATA_WEBHOOK_HOSTS = new Set([
  "metadata.google.internal",
  "metadata.google.com",
  "metadata.goog",
  "metadata",
  "instance-data",
  "instance-data.ec2.internal",
]);

/** Hostnames and addresses an Evidence Report webhook must not contact. */
export function isBlockedEvidenceWebhookHost(hostname: string): boolean {
  const host = hostname.trim().replace(/\.$/, "").toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return true;
  if (METADATA_WEBHOOK_HOSTS.has(host)) return true;
  if (host.endsWith(".metadata.google.internal") || host.endsWith(".metadata.google.com")) return true;
  if (isBlockedPreviewHost(host)) return true;
  if (/^\d+$/.test(host)) {
    const value = Number(host);
    if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) return true;
    const ipv4 = `${(value >>> 24) & 255}.${(value >>> 16) & 255}.${(value >>> 8) & 255}.${value & 255}`;
    return isBlockedPreviewHost(ipv4);
  }
  const parts = host.split(".");
  if (parts.length === 4 && parts.every((part) => /^\d+$/.test(part))) {
    if (parts.some((part) => part.length > 1 && part.startsWith("0"))) return true;
  }
  return false;
}

export function maskEvidenceWebhookUrl(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  try {
    const host = new URL(trimmed).hostname;
    return host ? `${host}/••••••••` : "••••••••";
  } catch {
    return "••••••••";
  }
}

export function maskPagerDutyRoutingKey(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  return `${"•".repeat(16)}${trimmed.slice(-4)}`;
}

function httpsUrl(raw: string | null | undefined, maxLength: number): URL | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed || trimmed.length > maxLength) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

export const EVIDENCE_REPORT_EMAIL_LIMIT = 10;

const EVIDENCE_REPORT_EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

/** Extra recipients. The account address is omitted here and added when the report is sent. */
export function parseEvidenceReportRecipientEmails(
  raw: string,
  accountEmail?: string | null,
): string[] | null {
  const account = accountEmail?.trim().toLowerCase() ?? "";
  const unique: string[] = [];
  for (const part of raw.split(/[\s,;]+/)) {
    const email = part.trim().toLowerCase();
    if (!email || email === account || unique.includes(email)) continue;
    if (email.length > 254 || !EVIDENCE_REPORT_EMAIL_RE.test(email)) return null;
    unique.push(email);
  }
  if (unique.length > EVIDENCE_REPORT_EMAIL_LIMIT) return null;
  return unique;
}

export function evidenceReportRecipientEmails(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const parsed = parseEvidenceReportRecipientEmails(value.filter((item) => typeof item === "string").join("\n"));
  return parsed ?? [];
}

export function normalizeSlackIncomingWebhookUrl(raw: string | null | undefined): string | null {
  const url = httpsUrl(raw, 500);
  if (!url || url.username || url.password || url.hostname !== "hooks.slack.com") return null;
  return url.href;
}

function teamsHost(hostname: string): "connector" | "workflow" | null {
  const host = hostname.toLowerCase();
  if (host === "outlook.office.com" || host === "webhook.office.com" || host.endsWith(".webhook.office.com")) {
    return "connector";
  }
  if (
    host.endsWith(".logic.azure.com") ||
    host.endsWith(".powerplatform.com") ||
    host.endsWith(".powerautomate.com")
  ) {
    return "workflow";
  }
  return null;
}

export function normalizeTeamsWebhookUrl(raw: string | null | undefined): string | null {
  const url = httpsUrl(raw, 2000);
  if (!url || url.username || url.password || !teamsHost(url.hostname)) return null;
  return url.href;
}

export function normalizePagerDutyRoutingKey(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  if (/^[A-Za-z0-9]{32}$/.test(trimmed)) return trimmed;
  const fromUrl = trimmed.match(/[A-Za-z0-9]{32}/);
  if (trimmed.startsWith("https://") && fromUrl) return fromUrl[0];
  return null;
}

export function normalizeOtherWebhookUrl(raw: string | null | undefined): string | null {
  const url = httpsUrl(raw, 2000);
  if (!url) return null;
  if (url.username || url.password) return null;
  if (url.hostname === "hooks.slack.com") return null;
  if (teamsHost(url.hostname)) return null;
  if (url.hostname === "events.pagerduty.com") return null;
  if (isBlockedEvidenceWebhookHost(url.hostname)) return null;
  return url.href;
}

export function teamsEvidencePayload(webhookUrl: string, subject: string, text: string): Record<string, unknown> {
  const host = teamsHost(new URL(webhookUrl).hostname);
  const body = text.slice(0, 15000);
  if (host === "workflow") {
    return {
      type: "message",
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          content: {
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            type: "AdaptiveCard",
            version: "1.4",
            body: [
              { type: "TextBlock", text: subject, weight: "bolder", wrap: true },
              { type: "TextBlock", text: body, wrap: true },
            ],
          },
        },
      ],
    };
  }
  return {
    "@type": "MessageCard",
    "@context": "https://schema.org/extensions",
    summary: subject.slice(0, 500),
    title: subject.slice(0, 500),
    text: body,
  };
}

export function pagerDutyEvidencePayload(input: {
  routingKey: string;
  subject: string;
  text: string;
  dedupKey: string;
}): { url: string; body: Record<string, unknown> } {
  return {
    url: PAGERDUTY_EVENTS_URL,
    body: {
      routing_key: input.routingKey,
      event_action: "trigger",
      dedup_key: input.dedupKey,
      payload: {
        summary: input.subject.slice(0, 1024),
        source: "viewtrace",
        severity: "info",
        custom_details: { report: input.text.slice(0, 20000) },
      },
    },
  };
}

export function otherWebhookEvidencePayload(subject: string, text: string): { text: string; subject: string; source: string } {
  return { text, subject, source: "viewtrace.evidence_report" };
}

function asObservation(fact: EvidenceReportObservationFact): Observation {
  const conditions = {
    region_input: fact.regionInput ?? fact.regionValue,
    full_page_requested: fact.fullPageRequested ?? undefined,
    device_class: fact.deviceClass ?? undefined,
    viewport: fact.viewport
      ? {
          width: fact.viewport.width ?? null,
          height: fact.viewport.height ?? null,
          source: fact.viewport.source ?? undefined,
        }
      : undefined,
    geo: fact.geo
      ? {
          country: fact.geo.country ?? null,
          state: fact.geo.state ?? null,
          proxy_mode: fact.geo.proxy_mode ?? "none",
        }
      : undefined,
  } as CaptureConditionsV1;
  return {
    id: fact.id,
    url: fact.url,
    regionValue: fact.regionValue,
    regionLabel: fact.regionLabel,
    capturedAt: fact.capturedAt,
    status: fact.status,
    snapshotSha256: fact.snapshotSha256,
    snapshotPhash: fact.snapshotPhash,
    snapshotImageUrl: fact.snapshotImageUrl,
    snapshotPurgedAt: fact.snapshotPurgedAt,
    captureConditions: conditions,
  };
}

type ScreenshotMailFact = {
  verdict: "same" | "changed" | "not_comparable";
  reason: string | null;
};

function screenshotMailFact(
  current: EvidenceReportObservationFact,
  prior: EvidenceReportObservationFact | null,
): ScreenshotMailFact {
  if (!prior) return { verdict: "not_comparable", reason: "前回の同じ URL × 地域がない" };
  const field = screenshotCompareField(asObservation(prior), asObservation(current));
  if (field.verdict === "same") return { verdict: "same", reason: null };
  if (field.verdict === "changed") return { verdict: "changed", reason: null };
  if (field.incomparableReason === "scope") return { verdict: "not_comparable", reason: "撮影範囲が違う" };
  if (field.incomparableReason === "viewport") return { verdict: "not_comparable", reason: "viewport が違う" };
  if (field.incomparableReason === "unknown_conditions") return { verdict: "not_comparable", reason: "撮影条件が揃っていない" };
  return { verdict: "not_comparable", reason: "比べる画像の指紋がない" };
}

function screenshotMailLine(fact: ScreenshotMailFact): string {
  if (fact.verdict === "same") return "Screenshot: Same";
  if (fact.verdict === "changed") return "Screenshot: Changed（screenshot content differs）";
  return `Screenshot: Not comparable — ${fact.reason}`;
}

function previousFor(
  current: EvidenceReportObservationFact,
  history: EvidenceReportObservationFact[],
): EvidenceReportObservationFact | null {
  let found: EvidenceReportObservationFact | null = null;
  for (const row of history) {
    if (row.id === current.id) continue;
    if (row.regionValue !== current.regionValue) continue;
    if (!sameObservationUrlIdentity(row.url, current.url)) continue;
    if (Date.parse(row.capturedAt) >= Date.parse(current.capturedAt)) continue;
    if (!found || Date.parse(row.capturedAt) > Date.parse(found.capturedAt)) found = row;
  }
  return found;
}

const TYPE_ORDER = new Map<string, number>(INTERACTION_CHECK_TYPES.map((type, index) => [type, index]));

function orderedTypes(rows: EvidenceReportBehaviorFact[]): string[] {
  return rows
    .slice()
    .sort((a, b) => (TYPE_ORDER.get(a.type) ?? 99) - (TYPE_ORDER.get(b.type) ?? 99))
    .map((row) => behaviorTypeLabel(row.type));
}

function interactionMailLines(behavior: EvidenceReportBehaviorFact[] | null): string[] {
  if (!behavior || behavior.length === 0) return [];
  const lines: string[] = [];
  const groups: Array<{ status: ScrollInteractionStatus; label: string }> = [
    { status: "working", label: "Working" },
    { status: "no_change_observed", label: "No rendered state change observed" },
    { status: "failed", label: "Execution error" },
    { status: "blocked_for_safety", label: "Blocked for safety" },
    { status: "playback_not_verifiable", label: "検出のみ（再生は確認できない）" },
    { status: "not_detected", label: "Not detected" },
  ];
  for (const group of groups) {
    const names = orderedTypes(behavior.filter((row) => row.status === group.status));
    if (names.length > 0) lines.push(`${group.label}: ${names.join(", ")}`);
  }
  return lines;
}

function pageLabel(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname === "/" ? parsed.hostname : `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return url;
  }
}

type RegionalMailFact = {
  regionValue: string;
  requested: string;
  observed: string;
  stateUnconfirmed: boolean;
  stateVerified: boolean;
  verifiedAt: string | null;
  attemptCount: number;
  countryObservations: number;
  stateTargetingRejected: boolean;
  verifiedMeasurements: Array<"screenshot" | "interaction" | "journey" | "lab_cwv">;
};

function regionalMailFact(fact: EvidenceReportObservationFact): RegionalMailFact | null {
  const conditions = asObservation(fact).captureConditions ?? null;
  const readout = observationGeoReadout({
    requestedLabel: fact.regionLabel || fact.regionValue,
    regionValue: fact.regionValue,
    captureConditions: conditions,
    copy: GEO_COPY,
    locale: "ja",
  });
  const requestedState = /^US-/i.test(conditions?.region_input ?? fact.regionValue);
  const verified = fact.geo?.state_verified === true && Boolean(fact.geo?.state);
  if (!requestedState && !readout.distinguish) return null;
  return {
    regionValue: fact.regionValue || readout.requestedLabel,
    requested: readout.requestedLabel,
    observed: readout.observedLabel,
    stateUnconfirmed: requestedState ? !verified : true,
    stateVerified: verified,
    verifiedAt: verified ? fact.capturedAt : null,
    attemptCount: 0,
    countryObservations: 0,
    stateTargetingRejected: fact.geo?.state_targeting_rejected === true,
    verifiedMeasurements: fact.geo?.verified_measurements ?? [],
  };
}

function isPriorityObservation(fact: EvidenceReportObservationFact, shot: ScreenshotMailFact): boolean {
  if (fact.status === "failure") return true;
  if (shot.verdict === "changed") return true;
  return (fact.behavior ?? []).some(
    (row) =>
      row.status === "no_change_observed" ||
      row.status === "failed" ||
      row.status === "blocked_for_safety" ||
      row.status === "playback_not_verifiable",
  );
}

function hasWorking(fact: EvidenceReportObservationFact): boolean {
  return (fact.behavior ?? []).some((row) => row.status === "working");
}

function countLine(label: string, count: number): string | null {
  return count > 0 ? `${label}: ${count}` : null;
}

function journeyStatusParts(rows: EvidenceReportJourneyFact[]): string[] {
  const order = ["passed", "failed", "blocked", "incomplete"] as const;
  const labels: Record<(typeof order)[number], string> = {
    passed: "Passed",
    failed: "Failed",
    blocked: "Blocked",
    incomplete: "Incomplete",
  };
  return order.flatMap((status) => {
    const count = rows.filter((row) => row.status === status).length;
    return count > 0 ? [`${labels[status]} ${count}`] : [];
  });
}

function deviceLabel(value: string): string {
  if (value === "desktop") return "Desktop";
  if (value === "mobile") return "Mobile";
  return value || "—";
}

const MEASUREMENT_LABELS = {
  screenshot: "Screenshot",
  interaction: "Interaction Check",
  journey: "Journey",
  lab_cwv: "Lab CWV",
} as const;

function measurementLabels(
  values: Array<keyof typeof MEASUREMENT_LABELS>,
): string[] {
  const source = values.length > 0 ? values : (["screenshot"] as Array<keyof typeof MEASUREMENT_LABELS>);
  return source.map((item) => MEASUREMENT_LABELS[item]);
}

function measurementsOutsideSession(values: Array<keyof typeof MEASUREMENT_LABELS>): string[] {
  const confirmed = new Set(measurementLabels(values));
  return Object.values(MEASUREMENT_LABELS).filter((label) => !confirmed.has(label));
}

export function buildWeeklyEvidenceReport(input: WeeklyEvidenceReportInput): { subject: string; text: string } {
  const history = [...input.priorObservations, ...input.observations];
  const shots = new Map<string, ScreenshotMailFact>();
  for (const row of input.observations) shots.set(row.id, screenshotMailFact(row, previousFor(row, history)));

  const regionalByKey = new Map<string, RegionalMailFact>();
  for (const row of input.observations) {
    const regional = regionalMailFact(row);
    if (!regional) continue;
    const current = regionalByKey.get(regional.regionValue);
    if (!current || (regional.stateVerified && !current.stateVerified)) regionalByKey.set(regional.regionValue, regional);
  }
  for (const regional of regionalByKey.values()) {
    regional.countryObservations = input.observations.filter(
      (row) => row.regionValue === regional.regionValue && row.geo?.state_verified !== true,
    ).length;
    const coverage = input.stateCoverage?.find((row) => row.regionValue === regional.regionValue);
    if (coverage?.status === "verified") {
      regional.stateVerified = true;
      regional.stateUnconfirmed = false;
      regional.verifiedAt = coverage.verifiedAt;
    }
    if (input.observations.some((row) => row.regionValue === regional.regionValue && row.geo?.state_targeting_rejected === true)) {
      regional.stateTargetingRejected = true;
    }
    regional.attemptCount = coverage?.attemptCount ?? input.observations
      .filter((row) => row.regionValue === regional.regionValue)
      .reduce((sum, row) => sum + (row.geo?.geo_attempts ?? 0), 0);
  }
  const regionalFacts = [...regionalByKey.values()].sort((a, b) => a.requested.localeCompare(b.requested));

  const priority: EvidenceReportObservationFact[] = [];
  const workingOnly = new Map<string, EvidenceReportObservationFact>();
  for (const row of input.observations) {
    const shot = shots.get(row.id);
    if (!shot) continue;
    if (isPriorityObservation(row, shot)) {
      priority.push(row);
      continue;
    }
    if (!hasWorking(row)) continue;
    const identity = observationUrlIdentity(row.url) ?? row.url;
    const bucket = `${row.regionValue}\n${identity}`;
    const current = workingOnly.get(bucket);
    if (!current || Date.parse(row.capturedAt) > Date.parse(current.capturedAt)) workingOnly.set(bucket, row);
  }

  const ranked = [
    ...priority.sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt)),
    ...[...workingOnly.values()].sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt)),
  ];
  const shownRows = ranked.slice(0, SHOWN_OBSERVATION_LIMIT);
  const hidden = input.observations.length - shownRows.length;
  const shownIds = new Set(shownRows.map((row) => row.id));

  const changed = [...shots.values()].filter((shot) => shot.verdict === "changed").length;
  const same = [...shots.values()].filter((shot) => shot.verdict === "same").length;
  const notComparable = [...shots.values()].filter((shot) => shot.verdict === "not_comparable").length;
  const workingObservations = input.observations.filter((row) => hasWorking(row)).length;
  const noChangeObservations = input.observations.filter((row) =>
    (row.behavior ?? []).some((item) => item.status === "no_change_observed"),
  ).length;
  const captureFailures = input.observations.filter((row) => row.status === "failure").length;
  const errorObservations = input.observations.filter((row) =>
    (row.behavior ?? []).some((item) => item.status === "failed"),
  ).length;

  const lines = [
    "Viewtrace Evidence Report",
    `${input.period.startDate} — ${input.period.endDateInclusive} JST`,
    "これは Alert ではありません。先週保存された Observation の事実です。",
    "測っていない項目は載せていません。未測定は失敗でも 0 でもありません。",
    "",
    `Observations: ${input.observations.length}`,
  ];
  const journeyParts = journeyStatusParts(input.journeys);
  if (journeyParts.length > 0) lines.push(`Journey: ${journeyParts.join(" / ")}`);
  const summaryFacts = [
    countLine("Screenshot Changed", changed),
    countLine("Screenshot Same", same),
    countLine("Screenshot Not comparable", notComparable),
    countLine("州単位の確認ができていない地域", regionalFacts.filter((row) => row.stateUnconfirmed).length),
    countLine("Working を記録した Observation", workingObservations),
    countLine("表示の変化を確認できなかった Observation", noChangeObservations),
    countLine("取得に失敗した Observation", captureFailures),
    countLine("Execution error を記録した Observation", errorObservations),
  ].filter((line): line is string => Boolean(line));
  lines.push(...summaryFacts);

  if (shownRows.length > 0) {
    lines.push("", "## 主な記録");
    const byRegion = new Map<string, EvidenceReportObservationFact[]>();
    for (const row of shownRows) {
      const key = row.regionValue || row.regionLabel || "—";
      const list = byRegion.get(key) ?? [];
      list.push(row);
      byRegion.set(key, list);
    }
    for (const key of [...byRegion.keys()].sort()) {
      const rows = (byRegion.get(key) ?? []).slice().sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
      const sample = rows[0];
      if (!sample) continue;
      lines.push("", sample.regionLabel || sample.regionValue || key);
      const regional = regionalByKey.get(sample.regionValue);
      if (regional?.stateVerified) {
        lines.push(`確認した測定: ${measurementLabels(regional.verifiedMeasurements).join("、")}`);
        const outside = measurementsOutsideSession(regional.verifiedMeasurements);
        if (outside.length > 0 && rows.some((row) => (row.behavior?.length ?? 0) > 0)) {
          lines.push(`${outside.join("、")} はこの session では測っていません。`);
        }
      } else if (regional?.stateTargetingRejected) {
        lines.push(`実際の取得: ${regional.observed}。州単位の確認: 未確認。`);
        lines.push("理由: State-level proxying unavailable on current provider plan");
      } else if (regional?.stateUnconfirmed) {
        lines.push(`実際の取得: ${regional.observed}。州単位の確認はできていません。`);
      }
      for (const row of rows) {
        if (!shownIds.has(row.id)) continue;
        const shot = shots.get(row.id);
        lines.push(pageLabel(row.url));
        lines.push(formatJstDateTime(row.capturedAt));
        if (row.status === "failure") lines.push("取得: 失敗");
        if (row.status === "pending") lines.push("取得: 保留");
        if (shot) lines.push(screenshotMailLine(shot));
        lines.push(...interactionMailLines(row.behavior));
      }
    }
  }

  if (input.journeys.length > 0) {
    lines.push("", "## Journey");
    if (input.journeys.some((row) => /^US-/i.test(row.region) && row.stateVerified !== true)) {
      lines.push("州の出口を確認していない Journey は、その州の測定ではありません。");
    }
    const byName = new Map<string, EvidenceReportJourneyFact[]>();
    for (const row of input.journeys) {
      const list = byName.get(row.name) ?? [];
      list.push(row);
      byName.set(row.name, list);
    }
    for (const name of [...byName.keys()].sort()) {
      const rows = byName.get(name) ?? [];
      lines.push("", name);
      const devices = [...new Set(rows.map((row) => row.deviceClass || "—"))].sort();
      for (const device of devices) {
        const parts = journeyStatusParts(rows.filter((row) => (row.deviceClass || "—") === device));
        if (parts.length > 0) lines.push(`${deviceLabel(device)}: ${parts.join(" / ")}`);
      }
      const failures = new Map<string, number>();
      for (const row of rows) {
        if (row.status !== "failed" || !row.alert) continue;
        failures.set(row.alert, (failures.get(row.alert) ?? 0) + 1);
      }
      if (failures.size > 0) {
        lines.push("Failed");
        for (const [alert, count] of [...failures.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
          lines.push(count > 1 ? `- ${alert} × ${count}` : `- ${alert}`);
        }
      }
    }
  }

  if (regionalFacts.length > 0) {
    lines.push("", "## 地域の確認");
    for (const regional of regionalFacts) {
      lines.push("", regional.requested);
      if (regional.stateVerified) {
        const confirmed = measurementLabels(regional.verifiedMeasurements);
        lines.push(`${confirmed.join("、")} を州単位で確認済み`);
        lines.push(`確認した測定: ${confirmed.join("、")}`);
        const outside = measurementsOutsideSession(regional.verifiedMeasurements);
        if (outside.length > 0) lines.push(`${outside.join("、")} はこの session では測っていません。`);
        if (regional.verifiedAt) lines.push(formatJstDateTime(regional.verifiedAt));
      } else {
        lines.push(`指定: ${regional.requested}`);
        lines.push(`実際の取得: ${regional.observed}`);
        if (/^US-/i.test(regional.regionValue)) {
          lines.push(regional.stateTargetingRejected ? "州単位の確認: 未確認" : "州単位の確認: 確認できていない");
        }
        if (regional.stateTargetingRejected) {
          lines.push("理由: State-level proxying unavailable on current provider plan");
        }
        if (regional.countryObservations > 0) lines.push(`米国単位の Observation: ${regional.countryObservations} 件`);
        if (regional.attemptCount > 0) lines.push(`州単位の試行: ${regional.attemptCount} 回`);
      }
    }
  }

  if (hidden > 0) lines.push("", `ほか ${hidden} 件はこの週の件数に含まれています。`);
  const publicUrl = input.publicUrl?.trim();
  if (publicUrl) {
    lines.push("", "## このレポート");
    lines.push("ログインなしで開けます。");
    lines.push(publicUrl);
  }
  if (input.observations.length === 0 && input.journeys.length === 0) {
    lines.push("この期間に保存された Observation はありません。");
  }

  return {
    subject: `Viewtrace: Evidence Report ${input.period.startDate} — ${input.period.endDateInclusive}`,
    text: lines.join("\n").trim() + "\n",
  };
}
