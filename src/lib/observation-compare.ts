import type { Observation } from "@/lib/demo/observations";
import type { HtmlHeadSignalsV1 } from "@/lib/url-preview";

export const OBSERVATION_COMPARE_FIELD_KEYS = [
  "screenshot",
  "finalUrl",
  "title",
  "description",
  "canonical",
  "robots",
  "ogImage",
] as const;

export type ObservationCompareFieldKey = (typeof OBSERVATION_COMPARE_FIELD_KEYS)[number];

/** 事実の差だけ。Improved / Worse / Page changed は持たない。撮影条件が違う画像は incomparable。 */
export type ObservationCompareVerdict = "changed" | "same" | "unknown" | "incomparable";

export type ScreenshotIncomparableReason = "scope" | "viewport" | "unknown_conditions";

export type ScreenshotCaptureComparability =
  | { comparable: true }
  | { comparable: false; reason: ScreenshotIncomparableReason };

export type ObservationCompareMode = "time" | "region";

export type ObservationCompareField = {
  key: ObservationCompareFieldKey;
  left: string;
  right: string;
  verdict: ObservationCompareVerdict;
  incomparableReason?: ScreenshotIncomparableReason;
};

function signalsOf(obs: Observation): HtmlHeadSignalsV1 | undefined {
  return obs.captureConditions?.html_signals;
}

function text(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function textVerdict(left: string, right: string): ObservationCompareVerdict {
  return text(left) === text(right) ? "same" : "changed";
}

/**
 * Time / Region Compare の「同じ URL」。
 * 末尾 `/` とホスト大小文字は揃える。query は残す（別キャンペーン）。
 * redirect 後の final_url は組の条件に使わない（比較フィールド）。
 */
export function observationUrlIdentity(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    u.hostname = u.hostname.replace(/\.$/, "").toLowerCase();
    if ((u.protocol === "https:" && u.port === "443") || (u.protocol === "http:" && u.port === "80")) {
      u.port = "";
    }
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.replace(/\/+$/, "") || "/";
    }
    return `${u.protocol}//${u.host}${u.pathname}${u.search}`;
  } catch {
    return null;
  }
}

export function sameObservationUrlIdentity(a: string, b: string): boolean {
  const left = observationUrlIdentity(a);
  const right = observationUrlIdentity(b);
  return Boolean(left && right && left === right);
}

/** DB の url が末尾スラッシュ違いでも拾うための候補。 */
export function observationUrlLookupVariants(raw: string): string[] {
  const trimmed = raw.trim();
  const out = new Set<string>();
  if (trimmed) out.add(trimmed);
  const identity = observationUrlIdentity(trimmed);
  if (!identity) return [...out];
  try {
    const u = new URL(identity);
    out.add(u.href);
    const path = u.pathname === "/" ? "/" : `${u.pathname}/`;
    out.add(`${u.protocol}//${u.host}${u.pathname}${u.search}`);
    out.add(`${u.protocol}//${u.host}${path}${u.search}`);
  } catch {
    /* ignore */
  }
  return [...out];
}

function titleOf(obs: Observation): string {
  return text(signalsOf(obs)?.document_title) || text(obs.pageTitle);
}

function finalUrlOf(obs: Observation): string {
  return text(signalsOf(obs)?.final_url) || text(obs.url);
}

function robotsOf(obs: Observation): string {
  const s = signalsOf(obs);
  return [text(s?.robots_meta), text(s?.x_robots_tag)].filter(Boolean).join(" · ");
}

function screenshotLabel(obs: Observation): string {
  const sha = text(obs.snapshotSha256);
  if (sha) return sha;
  const phash = text(obs.snapshotPhash);
  if (phash) return `phash:${phash}`;
  if (text(obs.snapshotImageUrl)) return "image";
  return "";
}

function captureScope(obs: Observation): "full_page" | "viewport" | null {
  const value = obs.captureConditions?.full_page_requested;
  if (value === true) return "full_page";
  if (value === false) return "viewport";
  return null;
}

/**
 * 画像の Changed / Same / Slider の前提。
 * 撮影範囲または viewport が違うと、SHA 差はページ差ではない。
 */
export function screenshotCaptureComparability(
  left: Observation,
  right: Observation,
): ScreenshotCaptureComparability {
  const leftScope = captureScope(left);
  const rightScope = captureScope(right);
  if (leftScope == null || rightScope == null) {
    return { comparable: false, reason: "unknown_conditions" };
  }
  if (leftScope !== rightScope) {
    return { comparable: false, reason: "scope" };
  }

  const leftView = left.captureConditions?.viewport;
  const rightView = right.captureConditions?.viewport;
  const leftW = leftView?.width ?? null;
  const rightW = rightView?.width ?? null;
  const leftH = leftView?.height ?? null;
  const rightH = rightView?.height ?? null;
  if (leftW != null && rightW != null && leftW !== rightW) {
    return { comparable: false, reason: "viewport" };
  }
  if (leftH != null && rightH != null && leftH !== rightH) {
    return { comparable: false, reason: "viewport" };
  }
  return { comparable: true };
}

/** Slider は条件一致に加え、保存画像の高さも揃っているときだけ。未実装の表示モード用。 */
export function screenshotSliderEligible(left: Observation, right: Observation): boolean {
  if (!screenshotCaptureComparability(left, right).comparable) return false;
  const leftH = left.captureConditions?.result?.image_height_px ?? null;
  const rightH = right.captureConditions?.result?.image_height_px ?? null;
  return leftH != null && rightH != null && leftH === rightH;
}

/** 画像指紋の一致だけ。ページが変わったとは言わない。 */
function screenshotFingerprintVerdict(left: Observation, right: Observation): ObservationCompareVerdict {
  const lSha = text(left.snapshotSha256);
  const rSha = text(right.snapshotSha256);
  if (lSha && rSha) return lSha === rSha ? "same" : "changed";
  const lPh = text(left.snapshotPhash);
  const rPh = text(right.snapshotPhash);
  if (lPh && rPh) return lPh === rPh ? "same" : "changed";
  const lImg = Boolean(text(left.snapshotImageUrl) && !left.snapshotPurgedAt);
  const rImg = Boolean(text(right.snapshotImageUrl) && !right.snapshotPurgedAt);
  if (!lImg && !rImg) return "same";
  if (lImg !== rImg) return "changed";
  return "unknown";
}

function screenshotVerdict(left: Observation, right: Observation): {
  verdict: ObservationCompareVerdict;
  incomparableReason?: ScreenshotIncomparableReason;
} {
  const capture = screenshotCaptureComparability(left, right);
  if (!capture.comparable) {
    return { verdict: "incomparable", incomparableReason: capture.reason };
  }
  return { verdict: screenshotFingerprintVerdict(left, right) };
}

export function compareModeForPair(left: Observation, right: Observation): ObservationCompareMode | null {
  if (!sameObservationUrlIdentity(left.url, right.url)) return null;
  const lRegion = text(left.regionValue);
  const rRegion = text(right.regionValue);
  if (!lRegion || !rRegion) return null;
  if (lRegion === rRegion) return "time";
  return "region";
}

export function isSameUrlRegionPair(left: Observation, right: Observation): boolean {
  return compareModeForPair(left, right) === "time";
}

export function orderObservationsByCapturedAt(a: Observation, b: Observation): [Observation, Observation] {
  const ta = Date.parse(a.capturedAt);
  const tb = Date.parse(b.capturedAt);
  if (Number.isFinite(ta) && Number.isFinite(tb) && ta > tb) return [b, a];
  return [a, b];
}

export function previousObservationForCompare(
  current: Observation,
  siblings: Observation[],
): Observation | null {
  const t = Date.parse(current.capturedAt);
  const older = siblings
    .filter((row) => row.id !== current.id && Date.parse(row.capturedAt) < t)
    .sort((x, y) => Date.parse(y.capturedAt) - Date.parse(x.capturedAt));
  return older[0] ?? null;
}

/** 2回目があるなら、過去が無くても次の記録と組む（古い側を開いたとき）。 */
export function pairObservationForCompare(
  current: Observation,
  siblings: Observation[],
): Observation | null {
  const previous = previousObservationForCompare(current, siblings);
  if (previous) return previous;
  const t = Date.parse(current.capturedAt);
  const newer = siblings
    .filter((row) => row.id !== current.id && Date.parse(row.capturedAt) > t)
    .sort((x, y) => Date.parse(x.capturedAt) - Date.parse(y.capturedAt));
  return newer[0] ?? null;
}

/** 同じ URL・違う地域のうち、取得時刻が最も近い記録。 */
export function pairRegionObservationForCompare(
  current: Observation,
  candidates: Observation[],
): Observation | null {
  const t = Date.parse(current.capturedAt);
  if (!Number.isFinite(t) || !text(current.regionValue)) return null;
  let best: Observation | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const row of candidates) {
    if (row.id === current.id) continue;
    if (!sameObservationUrlIdentity(current.url, row.url)) continue;
    if (text(row.regionValue) === text(current.regionValue)) continue;
    const other = Date.parse(row.capturedAt);
    if (!Number.isFinite(other)) continue;
    const delta = Math.abs(other - t);
    if (delta < bestDelta) {
      best = row;
      bestDelta = delta;
    }
  }
  return best;
}

export function compareObservations(left: Observation, right: Observation): ObservationCompareField[] {
  const lSig = signalsOf(left);
  const rSig = signalsOf(right);
  const screenshot = screenshotVerdict(left, right);
  return [
    {
      key: "screenshot",
      left: screenshotLabel(left),
      right: screenshotLabel(right),
      verdict: screenshot.verdict,
      incomparableReason: screenshot.incomparableReason,
    },
    {
      key: "finalUrl",
      left: finalUrlOf(left),
      right: finalUrlOf(right),
      verdict: textVerdict(finalUrlOf(left), finalUrlOf(right)),
    },
    {
      key: "title",
      left: titleOf(left),
      right: titleOf(right),
      verdict: textVerdict(titleOf(left), titleOf(right)),
    },
    {
      key: "description",
      left: text(lSig?.meta_description),
      right: text(rSig?.meta_description),
      verdict: textVerdict(text(lSig?.meta_description), text(rSig?.meta_description)),
    },
    {
      key: "canonical",
      left: text(lSig?.canonical_url),
      right: text(rSig?.canonical_url),
      verdict: textVerdict(text(lSig?.canonical_url), text(rSig?.canonical_url)),
    },
    {
      key: "robots",
      left: robotsOf(left),
      right: robotsOf(right),
      verdict: textVerdict(robotsOf(left), robotsOf(right)),
    },
    {
      key: "ogImage",
      left: text(lSig?.og_image),
      right: text(rSig?.og_image),
      verdict: textVerdict(text(lSig?.og_image), text(rSig?.og_image)),
    },
  ];
}

export function screenshotCompareField(left: Observation, right: Observation): ObservationCompareField {
  const field = compareObservations(left, right).find((row) => row.key === "screenshot");
  return (
    field ?? {
      key: "screenshot",
      left: "",
      right: "",
      verdict: "unknown",
    }
  );
}

/** Watch v1: Same / Not comparable / 前回なしでは送らない。Changed のみ。 */
export function shouldNotifyWatchOnScreenshot(verdict: ObservationCompareVerdict): boolean {
  return verdict === "changed";
}

export function observationCompareHref(leftId: string, rightId: string): string {
  const params = new URLSearchParams();
  params.set("a", leftId);
  params.set("b", rightId);
  return `/dashboard/observations/compare?${params.toString()}`;
}

export function newObservationHrefForRepeat(obs: Observation): string {
  const params = new URLSearchParams();
  if (obs.url) params.set("url", obs.url);
  if (obs.regionValue) params.set("region", obs.regionValue);
  return `/dashboard/observations/new?${params.toString()}`;
}
