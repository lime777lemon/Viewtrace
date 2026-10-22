import type { CoverageManifestV1, DiscoveryEnvironmentV1 } from "@/lib/observation-behavior-discovery";
import type { RegionalInteractionCheckV1 } from "@/lib/observation-regional-interaction";
import type { ObservationWebFactsV1 } from "@/lib/observation-web-facts";
import type { HtmlHeadSignalsV1 } from "@/lib/url-preview";

/** Looked and a value was there. */
export type MeasurementStatus = "observed" | "observed_absent" | "not_measured" | "not_verifiable";

export type MeasurementChannel = "measured" | "not_measured" | "not_verifiable";

export const PAGE_SEO_SCORING_VERSION = "page-seo-v1" as const;

const SEO_WEIGHTS = {
  title: 15,
  description: 15,
  canonical: 15,
  noindex: 15,
  lang: 10,
  viewport: 10,
  http: 10,
  structured_data: 5,
  social: 5,
} as const;

export type PageSeoSignalId = keyof typeof SEO_WEIGHTS;

export type MeasuredField = {
  status: MeasurementStatus;
  value: string | null;
};

export type PageSeoSignalResult = {
  id: PageSeoSignalId;
  status: MeasurementStatus;
  weight: number;
  earned: number | null;
};

export type PageSeoDerivedV1 = {
  scoring_version: typeof PAGE_SEO_SCORING_VERSION;
  score: number | null;
  earned_points: number;
  possible_points: number;
  measured_signals: number;
  signals: PageSeoSignalResult[];
};

/** Raw URLs stay on the fields. This is only the comparison. */
export type CanonicalComparisonV1 = {
  comparable: boolean;
  normalized_match: boolean | null;
  host_match: boolean | null;
};

export type MeasurementManifestV1 = {
  metadata: {
    title: MeasurementChannel;
    description: MeasurementChannel;
    canonical: MeasurementChannel;
    meta_robots: MeasurementChannel;
    http_robots: MeasurementChannel;
    og: MeasurementChannel;
    twitter: MeasurementChannel;
    json_ld: MeasurementChannel;
    lang: MeasurementChannel;
    viewport: MeasurementChannel;
    http: MeasurementChannel;
    h1: MeasurementChannel;
    robots_txt: MeasurementChannel;
  };
  behavior: CoverageManifestV1["discovery"] | null;
  temporal_window_ms: number | null;
  exploration: {
    completed: boolean | null;
    unexplored_candidates: number | null;
  };
  environment: {
    region: string | null;
    viewport: string | null;
    pointer: string | null;
    locale: string | null;
    timezone: string | null;
    prefers_reduced_motion: boolean | null;
    device_class: string | null;
  };
};

export type MeasurementRecordV1 = {
  schema_version: 1;
  /** http_document is the fetched markup. rendered_dom is the Chromium DOM after load. */
  source?: "http_document" | "rendered_dom";
  fields: {
    title: MeasuredField;
    description: MeasuredField;
    canonical: MeasuredField;
    meta_robots: MeasuredField;
    http_robots: MeasuredField;
    lang: MeasuredField;
    viewport: MeasuredField;
    og_title: MeasuredField;
    og_description: MeasuredField;
    og_image: MeasuredField;
    twitter_title: MeasuredField;
    twitter_description: MeasuredField;
    twitter_image: MeasuredField;
    json_ld: MeasuredField;
    http: MeasuredField;
    final_url: MeasuredField;
    noindex: MeasuredField;
    h1: MeasuredField;
    robots_txt: MeasuredField;
  };
  manifest: MeasurementManifestV1;
  canonical_comparison: CanonicalComparisonV1;
  seo: PageSeoDerivedV1;
};

function text(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function field(status: MeasurementStatus, value: string | null = null): MeasuredField {
  return { status, value: status === "observed" ? value : null };
}

function textField(value: string | null | undefined, inspected: boolean): MeasuredField {
  if (!inspected) return field("not_measured");
  const trimmed = text(value);
  return trimmed ? field("observed", trimmed) : field("observed_absent");
}

function channelOf(...statuses: MeasurementStatus[]): MeasurementChannel {
  if (statuses.length === 0 || statuses.every((status) => status === "not_measured")) return "not_measured";
  if (statuses.every((status) => status === "not_measured" || status === "not_verifiable")) return "not_verifiable";
  return "measured";
}

function httpStatusValue(signals: HtmlHeadSignalsV1 | null | undefined): number | null {
  const status = signals?.http_status;
  return typeof status === "number" && status > 0 ? status : null;
}

/**
 * Head extract always inspects these tags. An empty result is observed_absent.
 * A missing signals object means the extract did not run.
 */
export function measureHtmlFields(
  signals: HtmlHeadSignalsV1 | null | undefined,
  webFacts: ObservationWebFactsV1 | null | undefined,
  robotsTxtStatus?: MeasurementStatus | null,
): MeasurementRecordV1["fields"] {
  const inspected = Boolean(signals);
  const http = httpStatusValue(signals);
  const robotsTxt = webFacts?.robots;
  let robotsField: MeasuredField = field("not_measured");
  if (robotsTxtStatus === "observed" || robotsTxtStatus === "observed_absent" || robotsTxtStatus === "not_verifiable" || robotsTxtStatus === "not_measured") {
    robotsField = field(robotsTxtStatus, robotsTxtStatus === "observed" ? robotsTxt?.url ?? "robots.txt" : null);
  } else if (robotsTxt) {
    if (robotsTxt.error || robotsTxt.present == null) robotsField = field("not_verifiable");
    else if (robotsTxt.present) robotsField = field("observed", robotsTxt.url);
    else robotsField = field("observed_absent");
  }

  let h1: MeasuredField = field("not_measured");
  if (signals?.body_scan === "complete") {
    const count = signals.h1_count ?? 0;
    h1 = count > 0 ? field("observed", String(count)) : field("observed_absent");
  } else if (signals?.body_scan === "partial") {
    const count = signals.h1_count ?? 0;
    h1 = count > 0 ? field("observed", String(count)) : field("not_verifiable");
  }

  let noindex: MeasuredField = field("not_measured");
  if (inspected && signals) {
    if (signals.noindex === true) noindex = field("observed", "noindex");
    else noindex = field("observed_absent");
  }

  const jsonLd = signals?.json_ld_types?.map((type) => type.trim()).filter(Boolean) ?? [];

  return {
    title: textField(signals?.document_title, inspected),
    description: textField(signals?.meta_description, inspected),
    canonical: textField(signals?.canonical_url, inspected),
    meta_robots: textField(signals?.robots_meta, inspected),
    http_robots: textField(signals?.x_robots_tag, inspected),
    lang: textField(signals?.html_lang, inspected),
    viewport: textField(signals?.viewport, inspected),
    og_title: textField(signals?.og_title, inspected),
    og_description: textField(signals?.og_description, inspected),
    og_image: textField(signals?.og_image, inspected),
    twitter_title: textField(signals?.twitter_title, inspected),
    twitter_description: textField(signals?.twitter_description, inspected),
    twitter_image: textField(signals?.twitter_image, inspected),
    json_ld: !inspected
      ? field("not_measured")
      : jsonLd.length > 0
        ? field("observed", jsonLd.join(", "))
        : field("observed_absent"),
    http: http == null ? field("not_measured") : field("observed", String(http)),
    final_url: textField(signals?.final_url, inspected),
    noindex,
    h1,
    robots_txt: robotsField,
  };
}

function manifestFrom(
  fields: MeasurementRecordV1["fields"],
  check: RegionalInteractionCheckV1 | null | undefined,
): MeasurementManifestV1 {
  const environment = check?.discovery?.environment ?? null;
  const exhaustion = check?.discovery?.exhaustion ?? null;
  const temporal = check?.discovery?.temporal ?? null;
  return {
    metadata: {
      title: channelOf(fields.title.status),
      description: channelOf(fields.description.status),
      canonical: channelOf(fields.canonical.status),
      meta_robots: channelOf(fields.meta_robots.status),
      http_robots: channelOf(fields.http_robots.status),
      og: channelOf(fields.og_title.status, fields.og_description.status, fields.og_image.status),
      twitter: channelOf(fields.twitter_title.status, fields.twitter_description.status, fields.twitter_image.status),
      json_ld: channelOf(fields.json_ld.status),
      lang: channelOf(fields.lang.status),
      viewport: channelOf(fields.viewport.status),
      http: channelOf(fields.http.status),
      h1: channelOf(fields.h1.status),
      robots_txt: channelOf(fields.robots_txt.status),
    },
    behavior: check?.discovery?.coverage?.discovery ?? null,
    temporal_window_ms: temporal?.ran ? temporal.completed_through_ms : null,
    exploration: {
      completed: exhaustion ? exhaustion.status === "completed" : null,
      unexplored_candidates: exhaustion ? exhaustion.unexplored : null,
    },
    environment: {
      region: check?.requested_region ?? null,
      viewport: environment ? `${environment.viewport.width}x${environment.viewport.height}` : null,
      pointer: environment?.pointer ?? null,
      locale: environment?.locale ?? null,
      timezone: environment?.timezone ?? null,
      prefers_reduced_motion: environment?.prefers_reduced_motion ?? null,
      device_class: environment?.device_class ?? null,
    },
  };
}

function canonicalHost(url: URL): string {
  return url.hostname.replace(/\.$/, "").toLowerCase();
}

function canonicalKey(url: URL): string {
  const copy = new URL(url.href);
  copy.hash = "";
  if ((copy.protocol === "https:" && copy.port === "443") || (copy.protocol === "http:" && copy.port === "80")) {
    copy.port = "";
  }
  let path = copy.pathname;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  const host = canonicalHost(copy);
  return `${copy.protocol}//${host}${copy.port ? `:${copy.port}` : ""}${path}${copy.search}`;
}

export function compareCanonical(canonical: string | null, finalUrl: string | null): CanonicalComparisonV1 {
  if (!canonical || !finalUrl) return { comparable: false, normalized_match: null, host_match: null };
  try {
    const left = new URL(canonical);
    const right = new URL(finalUrl);
    return {
      comparable: true,
      normalized_match: canonicalKey(left) === canonicalKey(right),
      host_match: canonicalHost(left) === canonicalHost(right),
    };
  } catch {
    return { comparable: false, normalized_match: null, host_match: null };
  }
}

function scored(
  id: PageSeoSignalId,
  status: MeasurementStatus,
  earnedWhenMeasured: number,
): PageSeoSignalResult {
  const weight = SEO_WEIGHTS[id];
  if (status === "not_measured" || status === "not_verifiable") {
    return { id, status, weight, earned: null };
  }
  return { id, status, weight, earned: earnedWhenMeasured };
}

/** not_measured and not_verifiable stay out of the denominator. */
export function scorePageSeo(fields: MeasurementRecordV1["fields"], _signals: HtmlHeadSignalsV1 | null): PageSeoDerivedV1 {
  const socialStatuses = [fields.og_title.status, fields.og_description.status, fields.og_image.status];
  const socialStatus = socialSignalStatus(socialStatuses);
  const socialComplete = socialStatus === "observed";
  const http = Number(fields.http.value);
  const httpOk = Number.isFinite(http) && http >= 200 && http < 300;
  const comparison = compareCanonical(
    fields.canonical.status === "observed" ? fields.canonical.value : null,
    fields.final_url.status === "observed" ? fields.final_url.value : null,
  );
  const canonicalStatus: MeasurementStatus =
    fields.canonical.status === "observed" && !comparison.comparable ? "not_verifiable" : fields.canonical.status;
  const canonicalEarned =
    canonicalStatus === "observed" && comparison.normalized_match === true ? SEO_WEIGHTS.canonical : 0;

  const signalsOut: PageSeoSignalResult[] = [
    scored("title", fields.title.status, fields.title.status === "observed" ? SEO_WEIGHTS.title : 0),
    scored("description", fields.description.status, fields.description.status === "observed" ? SEO_WEIGHTS.description : 0),
    scored("canonical", canonicalStatus, canonicalEarned),
    scored("noindex", fields.noindex.status, fields.noindex.status === "observed_absent" ? SEO_WEIGHTS.noindex : 0),
    scored("lang", fields.lang.status, fields.lang.status === "observed" ? SEO_WEIGHTS.lang : 0),
    scored("viewport", fields.viewport.status, fields.viewport.status === "observed" ? SEO_WEIGHTS.viewport : 0),
    scored("http", fields.http.status, httpOk ? SEO_WEIGHTS.http : 0),
    scored(
      "structured_data",
      fields.json_ld.status,
      fields.json_ld.status === "observed" ? SEO_WEIGHTS.structured_data : 0,
    ),
    scored("social", socialStatus, socialComplete ? SEO_WEIGHTS.social : 0),
  ];

  const measured = signalsOut.filter((row) => row.earned != null);
  const earned = measured.reduce((sum, row) => sum + (row.earned ?? 0), 0);
  const possible = measured.reduce((sum, row) => sum + row.weight, 0);
  return {
    scoring_version: PAGE_SEO_SCORING_VERSION,
    score: possible > 0 ? Math.round((earned / possible) * 100) : null,
    earned_points: earned,
    possible_points: possible,
    measured_signals: measured.length,
    signals: signalsOut,
  };
}

function socialSignalStatus(statuses: MeasurementStatus[]): MeasurementStatus {
  if (statuses.some((status) => status === "not_measured")) return "not_measured";
  if (statuses.some((status) => status === "not_verifiable")) return "not_verifiable";
  if (statuses.every((status) => status === "observed")) return "observed";
  return "observed_absent";
}

export function buildMeasurementRecord(input: {
  signals: HtmlHeadSignalsV1 | null | undefined;
  webFacts?: ObservationWebFactsV1 | null;
  check?: RegionalInteractionCheckV1 | null;
  robotsTxt?: MeasurementStatus | null;
}): MeasurementRecordV1 | null {
  if (!input.signals) return null;
  const fields = measureHtmlFields(input.signals, input.webFacts, input.robotsTxt);
  return {
    schema_version: 1,
    source: "http_document",
    fields,
    manifest: manifestFrom(fields, input.check),
    canonical_comparison: compareCanonical(
      fields.canonical.status === "observed" ? fields.canonical.value : null,
      fields.final_url.status === "observed" ? fields.final_url.value : null,
    ),
    seo: scorePageSeo(fields, input.signals),
  };
}

export function pageSeoFromSignals(
  signals: HtmlHeadSignalsV1 | null | undefined,
  webFacts?: ObservationWebFactsV1 | null,
): PageSeoDerivedV1 | null {
  return buildMeasurementRecord({ signals, webFacts })?.seo ?? null;
}

type MeasurementCarrier = {
  html_signals?: HtmlHeadSignalsV1;
  web_facts?: ObservationWebFactsV1;
  measurement?: MeasurementRecordV1;
};

/** Freeze the current scorer onto a capture. Later formula changes do not rewrite this row. */
export function stampMeasurement<T extends MeasurementCarrier>(conditions: T): T {
  if (!conditions.html_signals) return conditions;
  if (conditions.measurement?.seo.scoring_version === PAGE_SEO_SCORING_VERSION) return conditions;
  const measurement = buildMeasurementRecord({
    signals: conditions.html_signals,
    webFacts: conditions.web_facts,
  });
  if (!measurement) return conditions;
  return { ...conditions, measurement };
}

export function pageSeoForCapture(conditions: MeasurementCarrier | null | undefined): PageSeoDerivedV1 | null {
  const stored = conditions?.measurement?.seo;
  if (stored?.scoring_version === PAGE_SEO_SCORING_VERSION) return stored;
  return pageSeoFromSignals(conditions?.html_signals, conditions?.web_facts);
}

export function behaviorEnvironmentsCompatible(
  left: DiscoveryEnvironmentV1 | null | undefined,
  right: DiscoveryEnvironmentV1 | null | undefined,
): boolean {
  if (!left || !right) return true;
  return (
    left.device_class === right.device_class &&
    left.viewport.width === right.viewport.width &&
    left.viewport.height === right.viewport.height &&
    left.pointer === right.pointer &&
    left.locale === right.locale &&
    left.timezone === right.timezone &&
    left.prefers_reduced_motion === right.prefers_reduced_motion &&
    (left.dpr == null || right.dpr == null || Math.abs(left.dpr - right.dpr) < 0.25) &&
    (!left.document_lang || !right.document_lang || left.document_lang === right.document_lang)
  );
}
