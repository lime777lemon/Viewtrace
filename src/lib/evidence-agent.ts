import type { Observation } from "@/lib/demo/observations";
import {
  behaviorAlertTransitions,
  behaviorMapAlertDiffs,
  behaviorStatusLabel,
  behaviorTypeLabel,
  buildBehaviorDiff,
  type BehaviorDiffKind,
} from "@/lib/observation-behavior-diff";
import {
  compareObservations,
  previousObservationForCompare,
  sameObservationUrlIdentity,
  type ObservationCompareFieldKey,
} from "@/lib/observation-compare";
import type { InteractionCheckType, RegionalInteractionCheckV1 } from "@/lib/observation-regional-interaction";
import type { ScrollInteractionStatus } from "@/lib/observation-scroll-interaction";

/** 提出キューに出す期間。今日開くクライアントは、直近の Watch を逃さない。 */
export const EVIDENCE_HANDOFF_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Pro の読み。売り物のトークン枠ではない。数えられなければ実行しない。 */
export const EVIDENCE_AGENT_QUESTION_MONTHLY = 60;

export const EVIDENCE_AGENT_QUESTION_ACTION = "observation.evidence_agent_question";

export type EvidenceHandoffScreenshot = "same" | "changed" | "not_comparable";

export type EvidenceHandoffBehavior = {
  label: string;
  previous: string;
  current: string;
  kind: BehaviorDiffKind;
};

export type EvidenceHandoffItem = {
  observationId: string;
  previousObservationId: string;
  url: string;
  host: string;
  regionLabel: string;
  capturedAt: string;
  screenshot: EvidenceHandoffScreenshot;
  behaviors: EvidenceHandoffBehavior[];
  signalChanges: Exclude<ObservationCompareFieldKey, "screenshot">[];
};

export function evidenceHandoffHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.trim() || url;
  }
}

function screenshotOf(verdict: string | undefined): EvidenceHandoffScreenshot {
  if (verdict === "changed") return "changed";
  if (verdict === "same") return "same";
  return "not_comparable";
}

export function evidenceScreenshotStatus(verdict: string | undefined): EvidenceHandoffScreenshot | null {
  if (verdict === "changed" || verdict === "same") return verdict;
  if (verdict === "incomparable" || verdict === "unknown") return "not_comparable";
  return null;
}

function groupObservations(observations: Observation[]): Observation[][] {
  const groups: Observation[][] = [];
  for (const obs of observations) {
    if (!obs.regionValue?.trim() || !obs.url.trim()) continue;
    const found = groups.find(
      (group) =>
        group[0].regionValue === obs.regionValue && sameObservationUrlIdentity(group[0].url, obs.url),
    );
    if (found) found.push(obs);
    else groups.push([obs]);
  }
  return groups;
}

/** 直前の同じ URL × 地域と比べて、提出する理由があるときだけ返す。 */
export function evidenceHandoffForPair(
  current: Observation,
  previous: Observation,
  checks: Map<string, RegionalInteractionCheckV1>,
): EvidenceHandoffItem | null {
  const fields = compareObservations(previous, current);
  const screenshot = screenshotOf(fields.find((field) => field.key === "screenshot")?.verdict);
  const signalChanges = fields.flatMap((field) =>
    field.key !== "screenshot" && field.verdict === "changed" ? [field.key] : [],
  );

  const currentCheck = checks.get(current.id) ?? null;
  const previousCheck = checks.get(previous.id) ?? null;
  const diff = currentCheck ? buildBehaviorDiff(previousCheck, currentCheck, previous.id) : null;
  const alerts = behaviorAlertTransitions(diff);
  const mapAlerts = behaviorMapAlertDiffs(diff).filter(
    (row) => row.section === "changed" || row.section === "missing",
  );
  if (screenshot !== "changed" && alerts.length === 0 && mapAlerts.length === 0) return null;

  const behaviors: EvidenceHandoffBehavior[] = [
    ...alerts.map((row) => ({
      label: behaviorTypeLabel(row.type),
      previous: behaviorStatusLabel(row.previous),
      current: behaviorStatusLabel(row.current),
      kind: row.kind,
    })),
    ...mapAlerts.map((row) => ({
      label: row.label,
      previous: "",
      current: row.detail,
      kind: "regression" as const,
    })),
  ];

  return {
    observationId: current.id,
    previousObservationId: previous.id,
    url: current.url,
    host: evidenceHandoffHost(current.url),
    regionLabel: current.regionLabel,
    capturedAt: current.capturedAt,
    screenshot,
    behaviors,
    signalChanges,
  };
}

export function evidenceHandoffCandidates(input: {
  now: Date;
  observations: Observation[];
}): { current: Observation; previous: Observation }[] {
  const start = input.now.getTime() - EVIDENCE_HANDOFF_WINDOW_MS;
  const pairs: { current: Observation; previous: Observation }[] = [];
  for (const group of groupObservations(input.observations)) {
    const latest = [...group].sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt))[0];
    if (!latest || Date.parse(latest.capturedAt) < start) continue;
    const previous = previousObservationForCompare(latest, group);
    if (!previous) continue;
    pairs.push({ current: latest, previous });
  }
  return pairs.sort((a, b) => Date.parse(b.current.capturedAt) - Date.parse(a.current.capturedAt)).slice(0, 40);
}

/**
 * 直近の URL × 地域で、クライアントに渡す理由がある記録だけを返す。
 * 理由はスクリーンショット Changed、または以前動いていた操作の回帰。
 * 再計測はしない。
 */
export function buildEvidenceHandoffQueue(input: {
  now: Date;
  observations: Observation[];
  checks: Map<string, RegionalInteractionCheckV1>;
}): EvidenceHandoffItem[] {
  const pairs = evidenceHandoffCandidates({ now: input.now, observations: input.observations });
  const items: EvidenceHandoffItem[] = [];
  for (const pair of pairs) {
    const item = evidenceHandoffForPair(pair.current, pair.previous, input.checks);
    if (item) items.push(item);
  }

  return items
    .sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt))
    .slice(0, 20);
}

const BEHAVIOR_STILL_OPEN = new Set<ScrollInteractionStatus>(["no_change_observed", "failed", "not_detected"]);

export type EvidenceReviewCheck = {
  kind: "behavior" | "screenshot";
  label: string;
  fromStatus: string;
  toStatus: string;
  state: "open" | "matched";
  resultStatus: string | null;
};

export type EvidenceReviewItem = EvidenceHandoffItem & {
  state: "open" | "matched";
  checks: EvidenceReviewCheck[];
};

type TrackedCheck = {
  kind: "behavior" | "screenshot";
  type: InteractionCheckType | null;
  label: string;
  fromStatus: string;
  toStatus: string;
  previousObservationId: string;
  observationId: string;
  capturedAt: string;
  url: string;
  host: string;
  regionLabel: string;
  screenshot: EvidenceHandoffScreenshot;
  signalChanges: Exclude<ObservationCompareFieldKey, "screenshot">[];
};

function recentInGroup(group: Observation[]): Observation[] {
  return [...group].sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt)).slice(-8);
}

export function evidenceReviewObservationIds(observations: Observation[]): string[] {
  const ids: string[] = [];
  for (const group of groupObservations(observations)) {
    for (const row of recentInGroup(group)) ids.push(row.id);
  }
  return [...new Set(ids)].slice(0, 80);
}

function pairRead(previous: Observation, current: Observation, checks: Map<string, RegionalInteractionCheckV1>) {
  const fields = compareObservations(previous, current);
  const screenshot = screenshotOf(fields.find((field) => field.key === "screenshot")?.verdict);
  const signalChanges = fields.flatMap((field) =>
    field.key !== "screenshot" && field.verdict === "changed" ? [field.key] : [],
  );
  const currentCheck = checks.get(current.id) ?? null;
  const previousCheck = checks.get(previous.id) ?? null;
  const diff = currentCheck ? buildBehaviorDiff(previousCheck, currentCheck, previous.id) : null;
  return { screenshot, signalChanges, alerts: behaviorAlertTransitions(diff), currentCheck };
}

function statusOf(check: RegionalInteractionCheckV1 | null, type: InteractionCheckType): ScrollInteractionStatus | null {
  return check?.types.find((row) => row.type === type)?.status ?? null;
}

function reviewItem(tracked: TrackedCheck, state: "open" | "matched", resultStatus: string | null): EvidenceReviewItem {
  const check: EvidenceReviewCheck = {
    kind: tracked.kind,
    label: tracked.label,
    fromStatus: tracked.fromStatus,
    toStatus: tracked.toStatus,
    state,
    resultStatus,
  };
  return {
    observationId: tracked.observationId,
    previousObservationId: tracked.previousObservationId,
    url: tracked.url,
    host: tracked.host,
    regionLabel: tracked.regionLabel,
    capturedAt: tracked.capturedAt,
    screenshot: tracked.screenshot,
    behaviors:
      tracked.kind === "behavior"
        ? [{ label: tracked.label, previous: tracked.fromStatus, current: tracked.toStatus, kind: "regression" }]
        : [],
    signalChanges: tracked.signalChanges,
    state,
    checks: [check],
  };
}

/**
 * 同じ URL × 地域の並びで、確認することを開き、次の記録で照合する。
 * Working に戻った、またはスクリーンショットが Same のときだけ照合できたにする。
 * 再計測はしない。
 */
export function buildEvidenceReview(input: {
  now: Date;
  observations: Observation[];
  checks: Map<string, RegionalInteractionCheckV1>;
}): { open: EvidenceReviewItem[]; matched: EvidenceReviewItem[] } {
  const open: EvidenceReviewItem[] = [];
  const matched: EvidenceReviewItem[] = [];
  const matchedAfter = input.now.getTime() - EVIDENCE_HANDOFF_WINDOW_MS;

  for (const group of groupObservations(input.observations)) {
    const series = recentInGroup(group);
    const behavior = new Map<string, TrackedCheck>();
    let screenshot: TrackedCheck | null = null;

    for (let index = 1; index < series.length; index += 1) {
      const previous = series[index - 1];
      const current = series[index];
      if (!previous || !current) continue;
      const read = pairRead(previous, current, input.checks);
      const stamp = (tracked: TrackedCheck): TrackedCheck => ({
        ...tracked,
        previousObservationId: previous.id,
        observationId: current.id,
        capturedAt: current.capturedAt,
        screenshot: read.screenshot,
        signalChanges: read.signalChanges,
      });

      if (screenshot && read.screenshot === "same") {
        if (Date.parse(current.capturedAt) >= matchedAfter) {
          matched.push(reviewItem(stamp(screenshot), "matched", "Same"));
        }
        screenshot = null;
      } else if (screenshot && read.screenshot === "changed") {
        screenshot = stamp(screenshot);
      }

      for (const [type, tracked] of behavior) {
        const status = statusOf(read.currentCheck, type as InteractionCheckType);
        if (status === "working") {
          if (Date.parse(current.capturedAt) >= matchedAfter) {
            matched.push(reviewItem(stamp(tracked), "matched", behaviorStatusLabel("working")));
          }
          behavior.delete(type);
        } else if (status && BEHAVIOR_STILL_OPEN.has(status)) {
          behavior.set(type, { ...stamp(tracked), toStatus: behaviorStatusLabel(status) });
        }
      }

      if (read.screenshot === "changed") {
        screenshot = {
          kind: "screenshot",
          type: null,
          label: "Screenshot",
          fromStatus: "Changed",
          toStatus: "Changed",
          previousObservationId: previous.id,
          observationId: current.id,
          capturedAt: current.capturedAt,
          url: current.url,
          host: evidenceHandoffHost(current.url),
          regionLabel: current.regionLabel,
          screenshot: read.screenshot,
          signalChanges: read.signalChanges,
        };
      }

      for (const alert of read.alerts) {
        if (alert.kind !== "regression") continue;
        behavior.set(alert.type, {
          kind: "behavior",
          type: alert.type,
          label: behaviorTypeLabel(alert.type),
          fromStatus: behaviorStatusLabel(alert.previous),
          toStatus: behaviorStatusLabel(alert.current),
          previousObservationId: previous.id,
          observationId: current.id,
          capturedAt: current.capturedAt,
          url: current.url,
          host: evidenceHandoffHost(current.url),
          regionLabel: current.regionLabel,
          screenshot: read.screenshot,
          signalChanges: read.signalChanges,
        });
      }
    }

    if (screenshot) open.push(reviewItem(screenshot, "open", null));
    for (const tracked of behavior.values()) open.push(reviewItem(tracked, "open", null));
  }

  const byTime = (a: EvidenceReviewItem, b: EvidenceReviewItem) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt);
  return { open: open.sort(byTime).slice(0, 20), matched: matched.sort(byTime).slice(0, 20) };
}

export function evidenceReviewSentence(check: EvidenceReviewCheck, locale: "ja" | "en"): string {
  if (check.state === "matched" && check.kind === "behavior") {
    return `${check.label}: ${check.toStatus} → ${check.resultStatus}`;
  }
  if (check.state === "matched") {
    return locale === "ja" ? "スクリーンショットは Same" : "Screenshot is Same";
  }
  if (check.kind === "behavior") {
    return locale === "ja"
      ? `次の同じ URL × 地域で、${check.label} が Working に戻ったかを見る。`
      : `On the next record of this URL and region, see whether ${check.label} returned to Working.`;
  }
  return locale === "ja"
    ? "次の同じ URL × 地域で、スクリーンショットが Same かを見る。"
    : "On the next record of this URL and region, see whether the screenshot is Same.";
}

export function evidenceReviewDraft(item: EvidenceReviewItem, locale: "ja" | "en"): string {
  const shot = item.screenshot === "changed" ? "Changed" : item.screenshot === "same" ? "Same" : "Not comparable";
  const behaviors = item.behaviors
    .map((row) => (row.previous ? `${row.label}: ${row.previous} → ${row.current}` : `${row.label}: ${row.current}`))
    .join("\n");
  const checks = item.checks.map((check) => evidenceReviewSentence(check, locale)).join("\n");
  if (locale === "ja") {
    return [
      item.host,
      item.regionLabel,
      `スクリーンショット: ${shot}`,
      behaviors ? `操作:\n${behaviors}` : "",
      item.state === "open" ? `確認すること:\n${checks}` : `照合:\n${checks}`,
    ]
      .filter(Boolean)
      .join("\n");
  }
  return [
    item.host,
    item.regionLabel,
    `Screenshot: ${shot}`,
    behaviors ? `Behavior:\n${behaviors}` : "",
    item.state === "open" ? `Check:\n${checks}` : `Matched:\n${checks}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** LLM が無いとき、提出差が無い記録への事実。 */
export function evidenceAgentRecordFallback(input: {
  url: string;
  regionLabel: string;
  screenshot: EvidenceHandoffScreenshot | null;
  locale: "ja" | "en";
}): string {
  const host = evidenceHandoffHost(input.url);
  const shot =
    input.screenshot === "changed"
      ? "Changed"
      : input.screenshot === "same"
        ? "Same"
        : input.screenshot === "not_comparable"
          ? "Not comparable"
          : null;
  if (input.locale === "ja") {
    if (!shot) return `${host}、${input.regionLabel}。同じ URL × 地域の直前の記録はありません。`;
    return `${host}、${input.regionLabel}。スクリーンショットは ${shot}。`;
  }
  if (!shot) return `${host}, ${input.regionLabel}. There is no earlier record for this URL and region.`;
  return `${host}, ${input.regionLabel}. Screenshot is ${shot}.`;
}
export function evidenceHandoffRecordAnswer(item: EvidenceHandoffItem, locale: "ja" | "en"): string {
  const shot =
    item.screenshot === "changed" ? "Changed" : item.screenshot === "same" ? "Same" : "Not comparable";
  const behaviors = item.behaviors
    .map((row) =>
      row.previous
        ? `${row.label}: ${row.previous} → ${row.current}`
        : `${row.label}: ${row.current}`,
    )
    .join("; ");
  if (locale === "ja") {
    const lines = [
      `${item.host}、${item.regionLabel}。スクリーンショットは ${shot}。`,
      behaviors ? `操作: ${behaviors}。` : "",
      item.signalChanges.length > 0 ? `メタの差: ${item.signalChanges.join(", ")}。` : "",
    ];
    return lines.filter(Boolean).join("");
  }
  const lines = [
    `${item.host}, ${item.regionLabel}. Screenshot is ${shot}.`,
    behaviors ? `Behavior: ${behaviors}.` : "",
    item.signalChanges.length > 0 ? `Metadata differs: ${item.signalChanges.join(", ")}.` : "",
  ];
  return lines.filter(Boolean).join(" ");
}
