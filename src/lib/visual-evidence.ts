/** Visual facts for one action. A missing JPEG is a valid result when URL, DOM, visibility, or network already show what happened. */

export type VisualBox = { x: number; y: number; w: number; h: number };

export type VisualStyle = {
  display: string;
  visibility: string;
  opacity: string;
  transform: string;
};

export type VisualSide = {
  box: VisualBox | null;
  visible: boolean | null;
  style: VisualStyle | null;
};

export type StepVisualEvidence = {
  /** hashed: a region JPEG was taken and reduced to a hash. not_taken: no region JPEG. */
  screenshot: "hashed" | "not_taken";
  before: VisualSide | null;
  after: VisualSide | null;
  region_hash: { before: string; after: string; changed: boolean } | null;
  /** Sum of layout-shift entries during the step. Null when the observer was not running. */
  layout_shift: number | null;
};

const VISUAL_TARGET = /modal|dialog|menu|carousel|accordion|tabs|tablist|canvas|webgl|animat/i;

/** Login and other URL outcomes do not need a region JPEG. A modal, menu, or canvas does. */
export function regionScreenshotNeeded(input: {
  kind?: string;
  selector?: string;
  expectSelector?: string;
  evidenceScreenshot?: boolean;
}): boolean {
  if (input.evidenceScreenshot === true) return true;
  const kind = input.kind || "";
  if (kind === "login" || kind === "signup" || kind === "navigation" || kind === "open_url") return false;
  return VISUAL_TARGET.test(`${kind} ${input.selector || ""} ${input.expectSelector || ""}`);
}

function box(raw: unknown): VisualBox | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const nums = ["x", "y", "w", "h"].map((key) => row[key]);
  if (nums.some((value) => typeof value !== "number" || !Number.isFinite(value))) return null;
  return {
    x: Math.round(nums[0] as number),
    y: Math.round(nums[1] as number),
    w: Math.round(nums[2] as number),
    h: Math.round(nums[3] as number),
  };
}

function style(raw: unknown): VisualStyle | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const text = (key: string) => (typeof row[key] === "string" ? row[key].slice(0, 80) : "");
  const next = { display: text("display"), visibility: text("visibility"), opacity: text("opacity"), transform: text("transform") };
  return next.display || next.visibility || next.opacity || next.transform ? next : null;
}

function side(raw: unknown): VisualSide | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const visible = row.visible === true ? true : row.visible === false ? false : null;
  const parsed = { box: box(row.box), visible, style: style(row.style) };
  return parsed.box || parsed.visible != null || parsed.style ? parsed : null;
}

export function parseStepVisual(raw: unknown): StepVisualEvidence | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const hash = row.region_hash && typeof row.region_hash === "object" ? row.region_hash as Record<string, unknown> : null;
  const beforeHash = hash && typeof hash.before === "string" ? hash.before.slice(0, 40) : "";
  const afterHash = hash && typeof hash.after === "string" ? hash.after.slice(0, 40) : "";
  const shift = typeof row.layout_shift === "number" && Number.isFinite(row.layout_shift) ? Math.round(row.layout_shift * 10000) / 10000 : null;
  const before = side(row.before);
  const after = side(row.after);
  if (!before && !after && !beforeHash && shift == null && row.screenshot !== "hashed") return null;
  return {
    screenshot: row.screenshot === "hashed" ? "hashed" : "not_taken",
    before,
    after,
    region_hash: beforeHash && afterHash ? { before: beforeHash, after: afterHash, changed: hash?.changed === true || beforeHash !== afterHash } : null,
    layout_shift: shift,
  };
}

function boxText(value: VisualBox | null): string {
  return value ? `${value.x},${value.y} ${value.w}×${value.h}` : "—";
}

export function visualEvidenceLines(visual: StepVisualEvidence | null, locale: "ja" | "en"): Array<{ label: string; value: string }> {
  if (!visual) return [];
  const ja = locale === "ja";
  const lines: Array<{ label: string; value: string }> = [];
  const before = visual.before;
  const after = visual.after;
  if (before?.box || after?.box) {
    lines.push({ label: ja ? "枠" : "Bounding box", value: `${boxText(before?.box ?? null)} → ${boxText(after?.box ?? null)}` });
  }
  if (before?.visible != null || after?.visible != null) {
    const word = (value: boolean | null) => value == null ? "—" : value ? (ja ? "見えている" : "visible") : (ja ? "見えていない" : "hidden");
    lines.push({ label: ja ? "表示" : "Visibility", value: `${word(before?.visible ?? null)} → ${word(after?.visible ?? null)}` });
  }
  const styleNames = ["display", "visibility", "opacity", "transform"] as const;
  const styleChanges = styleNames.flatMap((name) => {
    const from = before?.style?.[name] || "";
    const to = after?.style?.[name] || "";
    return from && to && from !== to ? [`${name} ${from} → ${to}`] : [];
  });
  if (styleChanges.length) lines.push({ label: ja ? "スタイル" : "Computed style", value: styleChanges.join(" · ") });
  else if (before?.style && after?.style) lines.push({ label: ja ? "スタイル" : "Computed style", value: ja ? "変わっていない" : "unchanged" });
  if (visual.region_hash) {
    lines.push({
      label: ja ? "領域ハッシュ" : "Region hash",
      value: visual.region_hash.changed ? (ja ? "変わった" : "changed") : (ja ? "同じ" : "unchanged"),
    });
  } else {
    lines.push({ label: ja ? "領域のスクリーンショット" : "Region screenshot", value: ja ? "撮っていない" : "not taken" });
  }
  lines.push({
    label: ja ? "レイアウトシフト" : "Layout shift",
    value: visual.layout_shift == null ? (ja ? "測っていない" : "not measured") : String(visual.layout_shift),
  });
  return lines;
}
