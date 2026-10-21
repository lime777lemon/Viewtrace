import {
  INTERACTION_CHECK_TYPES,
  type InteractionCheckType,
} from "@/lib/observation-regional-interaction";
import type { ScrollInteractionStatus } from "@/lib/observation-scroll-interaction";

/** Visual or long-wait checks. Known behavior runs before these. */
export const EXPENSIVE_INTERACTION_TYPES = [
  "css_animation",
  "js_animation",
  "cursor_follow",
  "auto_carousel",
  "video",
  "embedded_video",
  "lottie",
  "svg_animation",
  "canvas",
  "webgl",
  "scroll",
] as const;

const EXPENSIVE = new Set<string>(EXPENSIVE_INTERACTION_TYPES);

export type InteractionPriorRow = {
  type: InteractionCheckType;
  status: ScrollInteractionStatus;
  detected: boolean;
};

/**
 * Order for one Check session.
 * Regression of known Working, then previously detected, then new candidates.
 * Inside each band, cheap checks run before expensive visual checks.
 * Types that are not detected are omitted so the session can record them as Not detected
 * without spending the budget on them.
 */
export function scheduleInteractionTypes(input: {
  detected: readonly InteractionCheckType[];
  prior?: readonly InteractionPriorRow[];
}): InteractionCheckType[] {
  const detected = new Set(input.detected);
  const prior = new Map((input.prior ?? []).map((row) => [row.type, row]));
  const ranked = INTERACTION_CHECK_TYPES.filter((type) => detected.has(type)).map((type, index) => {
    const previous = prior.get(type);
    const knownWorking = previous?.status === "working";
    const previouslyDetected = Boolean(
      previous &&
        previous.detected &&
        previous.status !== "not_detected" &&
        previous.status !== "not_measured",
    );
    const band = knownWorking ? 0 : previouslyDetected ? 1 : 2;
    const cost = EXPENSIVE.has(type) ? 1 : 0;
    return { type, band, cost, index };
  });
  ranked.sort((a, b) => a.band - b.band || a.cost - b.cost || a.index - b.index);
  return ranked.map((row) => row.type);
}

export function summarizeInteractionMeasurement(
  rows: readonly { status: string; evidence?: { note?: string } | null }[],
): {
  total: number;
  measured: number;
  notDetected: number;
  notMeasured: number;
  timeLimited: number;
} {
  let measured = 0;
  let notDetected = 0;
  let notMeasured = 0;
  let timeLimited = 0;
  for (const row of rows) {
    if (row.status === "not_detected") notDetected += 1;
    else if (row.status === "not_measured") {
      notMeasured += 1;
      if ((row.evidence?.note ?? "").includes("execution time limit")) timeLimited += 1;
    } else measured += 1;
  }
  return {
    total: rows.length,
    measured,
    notDetected,
    notMeasured,
    timeLimited,
  };
}
