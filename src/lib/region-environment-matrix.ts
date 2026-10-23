import type { Locale } from "@/lib/i18n";
import { journeyKindLabel, journeyNetworkEvidence, type JourneyGeoStage } from "@/lib/journey-definition";
import { journeyObservedPlace } from "@/lib/journey-conclusion";

export type RegionMatrixCell = "pass" | "fail" | "not_measured";

export type RegionMatrixEnvironment = {
  viewport: string | null;
  dpr: number | null;
  locale: string | null;
  timezone: string | null;
  language: string | null;
  pointer: "mouse" | "touch" | null;
  touch: boolean | null;
  userAgent: string | null;
  reducedMotion: boolean | null;
};

export type RegionMatrixSource = {
  region: string;
  stage?: JourneyGeoStage | null;
  device: "desktop" | "mobile" | null;
  environment?: Partial<RegionMatrixEnvironment> | null;
  page?: RegionMatrixCell;
  resources?: RegionMatrixCell;
  behavior?: RegionMatrixCell;
  video?: RegionMatrixCell;
  steps?: Array<{ kind: string; status: string }>;
};

export type RegionMatrixFact = { label: string; value: string };

export type RegionEnvironmentMatrix = {
  columns: Array<{ id: string; label: string; facts: RegionMatrixFact[] }>;
  rows: Array<{ id: string; label: string; cells: RegionMatrixCell[] }>;
  findings: string[];
};

const KIND_ORDER = [
  "login",
  "signup",
  "search",
  "navigation",
  "contact",
  "lead",
  "newsletter",
  "booking",
  "add_to_cart",
  "checkout",
  "password_reset",
  "logout",
  "download",
  "language_switch",
  "region_switch",
  "currency_switch",
  "upload",
];

function worse(current: RegionMatrixCell, next: RegionMatrixCell | undefined): RegionMatrixCell {
  const value = next ?? "not_measured";
  if (current === "fail" || value === "fail") return "fail";
  if (current === "pass" || value === "pass") return "pass";
  return "not_measured";
}

function stepCell(statuses: string[]): RegionMatrixCell {
  if (statuses.some((status) => status === "fail")) return "fail";
  if (statuses.some((status) => status === "pass")) return "pass";
  return "not_measured";
}

function text(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

function environmentFrom(raw: Partial<RegionMatrixEnvironment> | null | undefined): RegionMatrixEnvironment {
  const viewport = text(raw?.viewport ?? null);
  const language = text(raw?.language ?? null);
  const locale = text(raw?.locale ?? null);
  const timezone = text(raw?.timezone ?? null);
  const userAgent = text(raw?.userAgent ?? null);
  return {
    viewport,
    dpr: typeof raw?.dpr === "number" && Number.isFinite(raw.dpr) && raw.dpr > 0 ? raw.dpr : null,
    locale,
    timezone,
    language,
    pointer: raw?.pointer === "touch" || raw?.pointer === "mouse" ? raw.pointer : null,
    touch: raw?.touch === true ? true : raw?.touch === false ? false : null,
    userAgent,
    reducedMotion: raw?.reducedMotion === true ? true : raw?.reducedMotion === false ? false : null,
  };
}

function fillEnvironment(current: RegionMatrixEnvironment, next: RegionMatrixEnvironment): RegionMatrixEnvironment {
  return {
    viewport: current.viewport ?? next.viewport,
    dpr: current.dpr ?? next.dpr,
    locale: current.locale ?? next.locale,
    timezone: current.timezone ?? next.timezone,
    language: current.language ?? next.language,
    pointer: current.pointer ?? next.pointer,
    touch: current.touch ?? next.touch,
    userAgent: current.userAgent ?? next.userAgent,
    reducedMotion: current.reducedMotion ?? next.reducedMotion,
  };
}

const STAGE_RANK: Record<string, number> = { city: 5, state: 4, country: 3, no_proxy: 2, direct: 1 };

function betterStage(current: JourneyGeoStage | null, next: JourneyGeoStage | null): JourneyGeoStage | null {
  if (!next) return current;
  if (!current) return next;
  return (STAGE_RANK[next] ?? 0) > (STAGE_RANK[current] ?? 0) ? next : current;
}

function deviceWord(device: "desktop" | "mobile" | null, locale: Locale): string {
  if (device === "mobile") return locale === "ja" ? "モバイル" : "Mobile";
  if (device === "desktop") return locale === "ja" ? "デスクトップ" : "Desktop";
  return "";
}

function columnLabel(place: string | null, region: string, device: "desktop" | "mobile" | null, locale: Locale): string {
  const where = place ?? region;
  const shown = deviceWord(device, locale);
  return shown ? `${where} ${shown}` : where;
}

function factsFor(input: {
  place: string | null;
  device: "desktop" | "mobile" | null;
  environment: RegionMatrixEnvironment;
  locale: Locale;
}): RegionMatrixFact[] {
  const ja = input.locale === "ja";
  const facts: RegionMatrixFact[] = [];
  facts.push({
    label: ja ? "地域" : "Region",
    value: input.place ?? (ja ? "確認できていない" : "not verified"),
  });
  const device = deviceWord(input.device, input.locale);
  if (device) facts.push({ label: ja ? "端末" : "Device", value: device });
  const env = input.environment;
  if (env.viewport) facts.push({ label: ja ? "表示領域" : "Viewport", value: env.viewport });
  if (env.dpr != null) facts.push({ label: "DPR", value: String(env.dpr) });
  if (env.locale) facts.push({ label: ja ? "ロケール" : "Locale", value: env.locale });
  if (env.timezone) facts.push({ label: ja ? "タイムゾーン" : "Timezone", value: env.timezone });
  if (env.language) facts.push({ label: ja ? "言語" : "Language", value: env.language });
  if (env.pointer || env.touch != null) {
    const pointer = env.pointer === "touch" ? "touch" : env.pointer === "mouse" ? "mouse" : "";
    const touch = env.touch == null ? "" : env.touch ? "touch" : "no touch";
    const value = pointer && touch && pointer !== touch ? `${pointer} · ${touch}` : pointer || touch;
    if (value) facts.push({ label: ja ? "ポインタ" : "Pointer", value });
  }
  if (env.userAgent) facts.push({ label: ja ? "ユーザーエージェント" : "User agent", value: env.userAgent });
  if (env.reducedMotion != null) {
    facts.push({
      label: ja ? "減少モーション" : "Reduced motion",
      value: env.reducedMotion ? (ja ? "あり" : "reduce") : (ja ? "なし" : "no"),
    });
  }
  return facts;
}

function listPlaces(labels: string[], locale: Locale): string {
  if (labels.length <= 1) return labels[0] ?? "";
  if (locale === "ja") return labels.join(" と ");
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function finding(rowId: string, rowLabel: string, places: string[], only: boolean, every: boolean, locale: Locale): string {
  const where = listPlaces(places, locale);
  if (locale === "ja") {
    const subject = rowId === "page"
      ? "ページが読み込めなかった"
      : rowId === "resources"
        ? "リソースが失敗した"
        : rowId === "behavior"
          ? "挙動が失敗した"
          : rowId === "video"
            ? "動画が失敗した"
            : `${rowLabel}が壊れている`;
    if (every) return `${subject}のは、測定した環境のすべてです。`;
    if (only) return `${subject}のは、${places[0]} だけです。`;
    return `${subject}のは、${where} です。`;
  }
  if (rowId === "page") {
    if (every) return "The page did not load in every measured environment.";
    if (only) return `The page did not load only on ${places[0]}.`;
    return `The page did not load on ${where}.`;
  }
  if (rowId === "resources") {
    if (every) return "A resource failed in every measured environment.";
    if (only) return `A resource failed only on ${places[0]}.`;
    return `A resource failed on ${where}.`;
  }
  if (rowId === "behavior") {
    if (every) return "Behavior failed in every measured environment.";
    if (only) return `Behavior failed only on ${places[0]}.`;
    return `Behavior failed on ${where}.`;
  }
  if (rowId === "video") {
    if (every) return "Video failed in every measured environment.";
    if (only) return `Video failed only on ${places[0]}.`;
    return `Video failed on ${where}.`;
  }
  if (every) return `${rowLabel} is broken in every measured environment.`;
  if (only) return `${rowLabel} is broken only on ${places[0]}.`;
  return `${rowLabel} is broken on ${where}.`;
}

/** Region × device columns. A dash is not a failure, and a missing region is not named as a city. */
export function buildRegionEnvironmentMatrix(sources: RegionMatrixSource[], locale: Locale): RegionEnvironmentMatrix {
  const grouped = new Map<string, {
    region: string;
    stage: JourneyGeoStage | null;
    device: "desktop" | "mobile" | null;
    environment: RegionMatrixEnvironment;
    page: RegionMatrixCell;
    resources: RegionMatrixCell;
    behavior: RegionMatrixCell;
    video: RegionMatrixCell;
    steps: Map<string, string[]>;
  }>();
  for (const source of sources) {
    const region = source.region.trim();
    if (!region) continue;
    const id = `${region}|${source.device ?? ""}`;
    const current = grouped.get(id) ?? {
      region,
      stage: null,
      device: source.device,
      environment: environmentFrom(null),
      page: "not_measured" as RegionMatrixCell,
      resources: "not_measured" as RegionMatrixCell,
      behavior: "not_measured" as RegionMatrixCell,
      video: "not_measured" as RegionMatrixCell,
      steps: new Map<string, string[]>(),
    };
    current.stage = betterStage(current.stage, source.stage ?? null);
    current.device = current.device ?? source.device;
    current.environment = fillEnvironment(current.environment, environmentFrom(source.environment));
    current.page = worse(current.page, source.page);
    current.resources = worse(current.resources, source.resources);
    current.behavior = worse(current.behavior, source.behavior);
    current.video = worse(current.video, source.video);
    for (const step of source.steps ?? []) {
      if (!step.kind) continue;
      const list = current.steps.get(step.kind) ?? [];
      list.push(step.status);
      current.steps.set(step.kind, list);
    }
    grouped.set(id, current);
  }
  const columns = [...grouped.values()].sort((a, b) => a.region.localeCompare(b.region) || (a.device ?? "").localeCompare(b.device ?? ""));
  const shown = columns.map((column) => {
    const place = journeyObservedPlace(column.region, column.stage, locale);
    return {
      id: `${column.region}|${column.device ?? ""}`,
      label: columnLabel(place, column.region, column.device, locale),
      facts: factsFor({ place, device: column.device, environment: column.environment, locale }),
      page: column.page,
      resources: column.resources,
      behavior: column.behavior,
      video: column.video,
      steps: column.steps,
    };
  });
  const kindSet = new Set<string>();
  for (const column of shown) {
    for (const kind of column.steps.keys()) kindSet.add(kind);
  }
  const kinds = [...kindSet].sort((a, b) => {
    const left = KIND_ORDER.indexOf(a);
    const right = KIND_ORDER.indexOf(b);
    return (left === -1 ? 99 : left) - (right === -1 ? 99 : right) || a.localeCompare(b);
  });
  const candidates: Array<{ id: string; label: string; cells: RegionMatrixCell[] }> = [
    { id: "page", label: locale === "ja" ? "ページ" : "Page", cells: shown.map((column) => column.page) },
    { id: "resources", label: locale === "ja" ? "リソース" : "Resources", cells: shown.map((column) => column.resources) },
    { id: "behavior", label: locale === "ja" ? "挙動" : "Behavior", cells: shown.map((column) => column.behavior) },
    ...kinds.map((kind) => ({
      id: kind,
      label: journeyKindLabel(kind, locale),
      cells: shown.map((column) => stepCell(column.steps.get(kind) ?? [])),
    })),
    { id: "video", label: locale === "ja" ? "動画" : "Video", cells: shown.map((column) => column.video) },
  ];
  const rows = candidates.filter((row) => row.cells.some((cell) => cell !== "not_measured"));
  const findings = rows.flatMap((row) => {
    const failed = shown.filter((_, index) => row.cells[index] === "fail").map((column) => column.label);
    const passed = row.cells.some((cell) => cell === "pass");
    const measured = row.cells.filter((cell) => cell !== "not_measured").length;
    if (!failed.length) return [];
    const every = measured > 1 && failed.length === measured;
    const only = failed.length === 1 && passed;
    return [finding(row.id, row.label, failed, only, every, locale)];
  });
  return {
    columns: shown.map((column) => ({ id: column.id, label: column.label, facts: column.facts })),
    rows,
    findings,
  };
}

export function resourcesCellFromRequests(requests: unknown): RegionMatrixCell {
  if (!Array.isArray(requests)) return "not_measured";
  const rows = journeyNetworkEvidence(requests);
  if (!rows.length) return "not_measured";
  if (rows.some((row) => row.failure || row.status == null || row.status >= 400)) return "fail";
  return "pass";
}

export function pageLoadCell(input: {
  status: string;
  loaded?: boolean | null;
  httpStatus?: number | null;
  timedOut?: boolean;
}): RegionMatrixCell {
  if (input.timedOut || input.loaded === false || (input.httpStatus != null && input.httpStatus >= 400)) return "fail";
  if (input.loaded === true || (input.httpStatus != null && input.httpStatus < 400) || input.status === "success") return "pass";
  if (input.status === "failed" || input.status === "error") return "fail";
  return "not_measured";
}

export function sessionResourcesCell(input: {
  failed?: number;
  status4xx?: number;
  status5xx?: number;
  requestFailed?: number;
} | null): RegionMatrixCell {
  if (!input) return "not_measured";
  const failed = (input.failed ?? 0) + (input.status4xx ?? 0) + (input.status5xx ?? 0) + (input.requestFailed ?? 0);
  return failed > 0 ? "fail" : "pass";
}

export function stageFromProxy(region: string, proxyMode: string | null | undefined): JourneyGeoStage | null {
  if (proxyMode === "retry_without_proxy" || proxyMode === "none") return "no_proxy";
  if (proxyMode !== "browserless_residential" && proxyMode !== "external_residential" && proxyMode !== "external_proxy") return null;
  if (region === "JP-13") return "city";
  if (/^US-[A-Z]{2}$/.test(region)) return "state";
  if (/^[A-Z]{2}$/.test(region)) return "country";
  return null;
}

export function behaviorCells(types: Array<{ type?: string; status?: string }> | null | undefined): { behavior: RegionMatrixCell; video: RegionMatrixCell } {
  if (!types?.length) return { behavior: "not_measured", video: "not_measured" };
  const decisive = types.filter((row) => row.status === "working" || row.status === "failed" || row.status === "no_change_observed");
  const behavior: RegionMatrixCell = decisive.some((row) => row.status === "failed" || row.status === "no_change_observed")
    ? "fail"
    : decisive.some((row) => row.status === "working")
      ? "pass"
      : "not_measured";
  const videoRows = types.filter((row) => row.type === "video" || row.type === "embedded_video");
  const videoDecisive = videoRows.filter((row) => row.status === "working" || row.status === "failed" || row.status === "no_change_observed");
  const video: RegionMatrixCell = videoDecisive.some((row) => row.status === "failed" || row.status === "no_change_observed")
    ? "fail"
    : videoDecisive.some((row) => row.status === "working")
      ? "pass"
      : "not_measured";
  return { behavior, video };
}

export function environmentFromJourneyRecord(raw: unknown): Partial<RegionMatrixEnvironment> {
  if (!raw || typeof raw !== "object") return {};
  const row = raw as Record<string, unknown>;
  const viewport = row.viewport && typeof row.viewport === "object" ? row.viewport as { width?: unknown; height?: unknown } : null;
  const width = typeof viewport?.width === "number" ? viewport.width : 0;
  const height = typeof viewport?.height === "number" ? viewport.height : 0;
  const documentLang = typeof row.document_lang === "string" ? row.document_lang.trim() : "";
  const languages = typeof row.languages === "string" ? row.languages.trim() : "";
  return {
    viewport: width > 0 && height > 0 ? `${width}×${height}` : null,
    dpr: typeof row.dpr === "number" && Number.isFinite(row.dpr) && row.dpr > 0 ? row.dpr : null,
    locale: typeof row.locale === "string" ? row.locale : null,
    timezone: typeof row.timezone === "string" ? row.timezone : null,
    language: documentLang || languages || null,
    pointer: row.pointer === "touch" || row.pointer === "mouse" ? row.pointer : null,
    touch: typeof row.touch === "boolean" ? row.touch : null,
    userAgent: typeof row.user_agent === "string" ? row.user_agent : null,
    reducedMotion: typeof row.prefers_reduced_motion === "boolean" ? row.prefers_reduced_motion : null,
  };
}

/** Newest-first sources. A later run of the same region and device does not overwrite the latest. */
export function keepLatestColumns(sources: RegionMatrixSource[]): RegionMatrixSource[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const id = `${source.region}|${source.device ?? ""}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
