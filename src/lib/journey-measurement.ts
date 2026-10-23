import type { Locale } from "@/lib/i18n";
import { journeyEvidenceLabel, type JourneyEvidenceItem } from "@/lib/journey-step-evidence";
import type { StepVisualEvidence } from "@/lib/visual-evidence";

export type JourneyMeasurementLine = { label: string; value: string };

export const JOURNEY_MEASURE_CHANNELS = [
  "url",
  "dom",
  "visibility",
  "network",
  "runtime",
  "visual",
  "download",
  "new_tab",
  "video",
] as const;

export type JourneyMeasureChannel = (typeof JOURNEY_MEASURE_CHANNELS)[number];
export type JourneyMeasureState = "observed" | "not_measured" | "not_applicable";

const CHANNEL_LABEL: Record<Locale, Record<JourneyMeasureChannel, string>> = {
  ja: {
    url: "URL",
    dom: "DOM",
    visibility: "表示",
    network: "ネットワーク",
    runtime: "実行時",
    visual: "見た目",
    download: "ダウンロード",
    new_tab: "新しいタブ",
    video: "動画",
  },
  en: {
    url: "URL",
    dom: "DOM",
    visibility: "Visibility",
    network: "Network",
    runtime: "Runtime",
    visual: "Visual",
    download: "Download",
    new_tab: "New tab",
    video: "Video",
  },
};

const STATE_LABEL: Record<Locale, Record<JourneyMeasureState, string>> = {
  ja: {
    observed: "測った",
    not_measured: "測っていない",
    not_applicable: "対象外",
  },
  en: {
    observed: "measured",
    not_measured: "not measured",
    not_applicable: "not applicable",
  },
};

const RENDERED_STATE: Record<Locale, Record<string, string>> = {
  ja: {
    visible: "表示された",
    not_visible: "表示されていない",
    absent: "見つからなかった",
    loaded: "読めた",
    failed: "読めなかった",
  },
  en: {
    visible: "visible",
    not_visible: "not visible",
    absent: "not found",
    loaded: "loaded",
    failed: "failed to load",
  },
};

function evidence(items: JourneyEvidenceItem[], kind: JourneyEvidenceItem["kind"]): JourneyEvidenceItem | undefined {
  return items.find((item) => item.kind === kind);
}

/** What this step measured, separate from what it found and from the step result. */
export function journeyMeasurementLines(input: {
  status: string;
  evidence?: JourneyEvidenceItem[];
  network?: Array<{ status: number | null }>;
  runtime?: Array<{ kind: string }>;
  evidenceScreenshot?: boolean;
  visual?: StepVisualEvidence | null;
  evidenceVideo?: boolean;
  locale: Locale;
}): JourneyMeasurementLine[] {
  const locale = input.locale;
  const ja = locale === "ja";
  const ran = input.status !== "not_run" && input.status !== "blocked_for_safety";
  const items = input.evidence ?? [];
  const screenshot = input.evidenceScreenshot === true;
  const video = input.evidenceVideo === true;
  const measured: Record<JourneyMeasureChannel, JourneyMeasureState> = {
    url: ran ? "observed" : "not_measured",
    dom: ran ? "observed" : "not_measured",
    visibility: ran ? "observed" : "not_measured",
    network: ran ? "observed" : "not_measured",
    runtime: ran ? "observed" : "not_measured",
    visual: !ran ? "not_measured" : input.visual || screenshot ? "observed" : "not_applicable",
    download: ran ? "observed" : "not_measured",
    new_tab: ran ? "observed" : "not_measured",
    video: !ran ? "not_measured" : video ? "observed" : "not_applicable",
  };
  const lines: JourneyMeasurementLine[] = JOURNEY_MEASURE_CHANNELS.map((channel) => ({
    label: `${ja ? "測った" : "Measured"} · ${CHANNEL_LABEL[locale][channel]}`,
    value: STATE_LABEL[locale][measured[channel]],
  }));
  if (!ran) return lines;

  const url = evidence(items, "url_changed");
  lines.push({
    label: `${ja ? "観測" : "Observed"} · URL`,
    value: url ? (ja ? `変わった ${url.summary}` : `changed ${url.summary}`) : (ja ? "変わっていない" : "unchanged"),
  });
  const dom = evidence(items, "dom_changed");
  lines.push({
    label: `${ja ? "観測" : "Observed"} · DOM`,
    value: dom ? (ja ? `変わった ${dom.summary}` : `changed ${dom.summary}`) : (ja ? "変化は観測されていない" : "no change observed"),
  });
  for (const kind of ["rendered_heading", "rendered_navigation", "rendered_control", "rendered_image"] as const) {
    const item = evidence(items, kind);
    if (!item) continue;
    lines.push({
      label: `${ja ? "観測" : "Observed"} · ${journeyEvidenceLabel(kind, locale)}`,
      value: RENDERED_STATE[locale][item.summary] ?? item.summary,
    });
  }
  const requests = input.network ?? [];
  const failedInNetwork = requests.filter((row) => row.status == null || row.status >= 400).length;
  const failedRequests = Math.max(failedInNetwork, evidence(items, "request_failed") ? 1 : 0);
  lines.push({
    label: `${ja ? "観測" : "Observed"} · ${CHANNEL_LABEL[locale].network}`,
    value: ja ? `${requests.length} 件` : `${requests.length} requests`,
  });
  lines.push({
    label: `${ja ? "観測" : "Observed"} · ${ja ? "失敗したリクエスト" : "Failed requests"}`,
    value: String(failedRequests),
  });
  const runtimeConsole = (input.runtime ?? []).filter((row) => row.kind === "console_error").length;
  const consoleCount = Math.max(runtimeConsole, evidence(items, "console_error") ? 1 : 0);
  lines.push({
    label: `${ja ? "観測" : "Observed"} · ${ja ? "console error" : "Console errors"}`,
    value: String(consoleCount),
  });
  const playing = evidence(items, "video_playing");
  if (video) {
    lines.push({
      label: `${ja ? "観測" : "Observed"} · ${CHANNEL_LABEL[locale].video}`,
      value: playing
        ? (ja ? `再生が進んだ（${playing.summary}）。画面への表示の正常さは測っていない` : `Playback progressed (${playing.summary}). The picture was not judged.`)
        : (ja ? "再生の進行は観測されていない" : "Playback progression was not observed"),
    });
  }
  return lines;
}

export function journeyRegionStatusDiff(
  rows: Array<{ region: string; steps: Array<{ id: string; kind: string; status: string }> }>,
): Array<{ key: string; kind: string; cells: Array<{ region: string; status: string }>; differs: boolean }> {
  if (rows.length < 2) return [];
  const keys: string[] = [];
  for (const row of rows) {
    row.steps.forEach((step, index) => {
      const key = step.id || `${step.kind}:${index}`;
      if (!keys.includes(key)) keys.push(key);
    });
  }
  return keys.flatMap((key) => {
    const found = rows.map((row) => row.steps.find((step) => step.id === key) ?? null);
    const kind = found.find((step) => step)?.kind ?? "";
    const cells = rows.map((row, index) => ({
      region: row.region,
      status: found[index]?.status ?? "not_run",
    }));
    const measured = cells.map((cell) => cell.status).filter((status) => status !== "not_run");
    const differs = measured.length >= 2 && new Set(measured).size > 1;
    return differs ? [{ key, kind, cells, differs }] : [];
  });
}
