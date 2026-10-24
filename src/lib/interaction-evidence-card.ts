import { behaviorFactLines } from "@/lib/behavior-observation";
import { motionDriverFactLines } from "@/lib/motion-driver";
import type { InteractionCheckType } from "@/lib/observation-regional-interaction";
import type { InteractionEvidence, InteractionElementState } from "@/lib/observation-interaction-evidence";
import { formatResourceRequest } from "@/lib/resource-request";

/** Presentation of stored Evidence. This does not decide Working. */
export type EvidenceFacet = {
  label: string;
  before: string;
  after: string;
};

export type InteractionEvidenceCardModel = {
  target: string | null;
  action: string | null;
  beforeLabel: string;
  afterLabel: string;
  facets: EvidenceFacet[];
  frames: [string, string] | null;
  restore: "ok" | "failed" | null;
  note: string | null;
  requests: string[];
  facts: string[];
};

function text(value: unknown): string | null {
  if (value == null || value === "") return null;
  const raw = String(value).trim();
  return raw.length ? raw : null;
}

function shorten(value: string): string {
  return value.length > 72 ? `${value.slice(0, 69)}…` : value;
}

function side(state: Partial<InteractionElementState> | null | undefined, key: keyof InteractionElementState): string | null {
  if (!state) return null;
  const value = state[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    if (key === "currentTime") return value.toFixed(2);
    if (key === "opacity") return String(Math.round(value * 100) / 100);
    return String(Math.round(value));
  }
  return text(value);
}

function facet(
  label: string,
  before: string | null,
  after: string | null,
): EvidenceFacet | null {
  if (before == null && after == null) return null;
  return { label, before: before ?? "—", after: after ?? "—" };
}

const PAIR_LABELS: Partial<Record<InteractionCheckType, [string, string]>> = {
  hover: ["Normal", "Hover"],
  menu: ["Closed", "Open"],
  modal: ["Closed", "Open"],
  accordion: ["Collapsed", "Expanded"],
  tabs: ["Tab A", "Tab B"],
  tooltip: ["Hidden", "Visible"],
  carousel: ["Slide 1", "Slide 2"],
  auto_carousel: ["Slide 1", "Slide 2"],
  form: ["Empty", "Cleared"],
  cursor_follow: ["Cursor A", "Cursor B"],
  css_animation: ["T0", "T3"],
  js_animation: ["T0", "T3"],
  canvas: ["T0", "T1"],
  webgl: ["T0", "T1"],
  lottie: ["T0", "T1"],
  svg_animation: ["T0", "T1"],
  lazy_load: ["Unloaded", "Loaded"],
  video: ["Before", "After"],
  embedded_video: ["Before", "After"],
};

function fieldsFor(type: InteractionCheckType): (keyof InteractionElementState)[] {
  if (type === "accordion") return ["expanded", "h"];
  if (type === "tabs") return ["selected", "hidden", "h"];
  if (type === "menu" || type === "modal") return ["expanded", "visibility", "opacity", "h"];
  if (type === "tooltip") return ["expanded", "hidden", "display"];
  if (type === "carousel" || type === "auto_carousel") return ["index", "transform"];
  if (type === "video" || type === "embedded_video") return ["currentTime"];
  if (type === "cursor_follow") return ["transform", "x", "y"];
  if (type === "lazy_load") return [];
  return ["opacity", "transform", "visibility", "display", "x", "y", "w", "h"];
}

const FIELD_LABEL: Partial<Record<keyof InteractionElementState, string>> = {
  opacity: "opacity",
  transform: "transform",
  visibility: "visibility",
  display: "display",
  x: "x",
  y: "y",
  w: "width",
  h: "height",
  expanded: "aria-expanded",
  selected: "aria-selected",
  hidden: "hidden",
  index: "active slide",
  currentTime: "currentTime",
};

export function interactionEvidenceCard(
  type: InteractionCheckType,
  evidence: InteractionEvidence | null | undefined,
): InteractionEvidenceCardModel | null {
  if (!evidence) return null;
  const [beforeLabel, afterLabel] = PAIR_LABELS[type] ?? ["Before", "After"];
  const facets: EvidenceFacet[] = [];
  for (const key of fieldsFor(type)) {
    const row = facet(FIELD_LABEL[key] ?? key, side(evidence.t0, key), side(evidence.t1, key));
    if (row) facets.push(row);
  }
  const frames =
    evidence.frame_hashes && evidence.frame_hashes.length >= 2
      ? ([evidence.frame_hashes[0]!.slice(0, 12), evidence.frame_hashes[1]!.slice(0, 12)] as [string, string])
      : null;
  const action = evidence.actions?.length ? evidence.actions.join(" → ") : null;
  const target = evidence.selector ? shorten(evidence.selector) : null;
  const requests = (evidence.window?.requests ?? []).map((row) => formatResourceRequest(row));
  const facts = [
    ...behaviorFactLines({ animation: evidence.animation, video: evidence.video }),
    ...(evidence.driver ? motionDriverFactLines(evidence.driver, "en") : []),
  ];
  if (evidence.toggle?.open === "working") {
    facts.push("Open working");
    facts.push(evidence.toggle.close === "working" ? "Close working" : "Close failed");
    if (evidence.toggle.close === "working" && evidence.toggle.close_by === "escape") facts.push("Closed by Escape");
    if (evidence.toggle.close === "working" && evidence.toggle.close_by === "close") facts.push("Closed by close button");
    if (evidence.toggle.close === "working" && evidence.toggle.close_by === "button") facts.push("Closed by the same button");
  }
  if (typeof evidence.timing?.response_ms === "number") facts.push(`Response ${evidence.timing.response_ms}ms`);
  if (typeof evidence.timing?.open_ms === "number") facts.push(`Fully open ${evidence.timing.open_ms}ms`);
  if (evidence.timing?.in_viewport === true) facts.push("In viewport");
  if (evidence.timing?.in_viewport === false) facts.push("Outside viewport");
  if ((type === "menu" || type === "modal") && evidence.window?.executed) {
    facts.push(`Console errors ${evidence.window.runtime_errors}`);
    facts.push(`Failed requests ${evidence.window.request_failed}`);
  }
  if (!facets.length && !frames && !action && !target && !evidence.note && !evidence.restore && !requests.length && !facts.length) return null;
  return {
    target,
    action,
    beforeLabel,
    afterLabel,
    facets: facets.map((row) => ({ ...row, before: shorten(row.before), after: shorten(row.after) })),
    frames,
    restore: evidence.restore ?? null,
    note: evidence.note && !facts.some((line) => line.startsWith(evidence.note ?? "")) ? shorten(evidence.note) : null,
    requests,
    facts,
  };
}
