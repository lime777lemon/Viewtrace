import {
  INTERACTION_CHECK_TYPES,
  type InteractionCheckType,
} from "@/lib/observation-regional-interaction";
import type { ScrollInteractionStatus } from "@/lib/observation-scroll-interaction";
import { RECORDED_INTERACTION_RUNS } from "@/lib/interaction-completion-runs";

/**
 * One interaction type is complete only when every gate is true.
 * Gates are derived from recorded Browserless runs. A code path does not flip a gate.
 * Engine completion (every type can be measured) is separate from one Watch run measuring every type.
 */
export const INTERACTION_COMPLETION_GATES = [
  "detect",
  "execute",
  "verify",
  "evidence",
  "cleanup",
  "working_fixture",
  "broken_fixture",
  "absent_fixture",
  "us_ca",
  "us_fl",
  "jp_13",
] as const;

export type InteractionCompletionGate = (typeof INTERACTION_COMPLETION_GATES)[number];

export const INTERACTION_RUN_REGIONS = ["US-CA", "US-FL", "JP-13"] as const;
export const INTERACTION_RUN_MODES = ["working", "broken", "absent", "unsafe"] as const;

export type InteractionRunRegion = (typeof INTERACTION_RUN_REGIONS)[number];
export type InteractionRunMode = (typeof INTERACTION_RUN_MODES)[number];

/** One production Browserless session against one fixture. Flags describe returned Evidence, not a sample. */
export type RecordedInteractionRun = {
  type: InteractionCheckType;
  region: InteractionRunRegion;
  mode: InteractionRunMode;
  ok: boolean;
  status: ScrollInteractionStatus | null;
  detected: boolean;
  selector: boolean;
  state: boolean;
  frames: boolean;
  action: boolean;
  /** True only when stored t0/t1, a measured note delta, or two different frame hashes differ. */
  changed: boolean;
  restore: "ok" | "failed" | null;
};

function openGates(): Record<InteractionCompletionGate, boolean> {
  return {
    detect: false,
    execute: false,
    verify: false,
    evidence: false,
    cleanup: false,
    working_fixture: false,
    broken_fixture: false,
    absent_fixture: false,
    us_ca: false,
    us_fl: false,
    jp_13: false,
  };
}

const SNAPSHOT_IGNORE = new Set(["key", "className"]);

/** Stored before/after values differ. Identical snapshots are not Evidence. */
export function snapshotsDiffer(t0: unknown, t1: unknown): boolean {
  if (!t0 || !t1 || typeof t0 !== "object" || typeof t1 !== "object") return false;
  const before = t0 as Record<string, unknown>;
  const after = t1 as Record<string, unknown>;
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    if (SNAPSHOT_IGNORE.has(key)) continue;
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) return true;
  }
  return false;
}

/** A note counts only when it records two different measured numbers, such as currentTime 0 → 1.2. */
export function noteShowsDelta(note: string | null | undefined): boolean {
  if (!note) return false;
  const match = note.match(/(-?\d+(?:\.\d+)?)\s*(?:→|->)\s*(-?\d+(?:\.\d+)?)/);
  return Boolean(match && match[1] !== match[2]);
}

export function framesDiffer(hashes: readonly string[] | null | undefined): boolean {
  return Boolean(hashes && hashes.length >= 2 && hashes[0] !== hashes[1]);
}

/** Working fixture passes only when Working status is backed by a stored element delta. */
export function workingRunPassed(run: RecordedInteractionRun | undefined): run is RecordedInteractionRun {
  return Boolean(
    run &&
      run.ok &&
      run.status === "working" &&
      run.changed &&
      (run.selector || run.state || run.frames),
  );
}

function findRun(
  runs: readonly RecordedInteractionRun[],
  type: InteractionCheckType,
  region: InteractionRunRegion,
  mode: InteractionRunMode,
): RecordedInteractionRun | undefined {
  return runs.find((run) => run.type === type && run.region === region && run.mode === mode);
}

export function deriveInteractionCompletion(
  runs: readonly RecordedInteractionRun[],
): Record<InteractionCheckType, Record<InteractionCompletionGate, boolean>> {
  const out = {} as Record<InteractionCheckType, Record<InteractionCompletionGate, boolean>>;
  for (const type of INTERACTION_CHECK_TYPES) {
    const usWorking = findRun(runs, type, "US-CA", "working");
    const flWorking = findRun(runs, type, "US-FL", "working");
    const jpWorking = findRun(runs, type, "JP-13", "working");
    const broken = findRun(runs, type, "US-CA", "broken");
    const absent = findRun(runs, type, "US-CA", "absent");
    const passedWorking = [usWorking, flWorking, jpWorking].filter(workingRunPassed);
    const gates = openGates();
    gates.working_fixture = passedWorking.length > 0;
    gates.us_ca = workingRunPassed(usWorking);
    gates.us_fl = workingRunPassed(flWorking);
    gates.jp_13 = workingRunPassed(jpWorking);
    gates.broken_fixture = Boolean(
      broken && broken.ok && broken.detected && broken.status === "no_change_observed",
    );
    gates.absent_fixture = Boolean(absent && absent.ok && absent.status === "not_detected");
    gates.detect = Boolean(
      usWorking && usWorking.ok && usWorking.detected && absent && absent.ok && absent.status === "not_detected",
    );
    gates.execute = passedWorking.some((run) => run.action);
    gates.verify = Boolean(
      usWorking &&
        workingRunPassed(usWorking) &&
        broken &&
        broken.ok &&
        broken.status === "no_change_observed",
    );
    gates.evidence = passedWorking.length > 0;
    gates.cleanup = [usWorking, flWorking, jpWorking].some(
      (run) => Boolean(run && run.ok && run.status === "working" && run.restore === "ok"),
    );
    out[type] = gates;
  }
  return out;
}

export const INTERACTION_COMPLETION = deriveInteractionCompletion(RECORDED_INTERACTION_RUNS);

export function interactionTypeComplete(type: InteractionCheckType): boolean {
  return INTERACTION_COMPLETION_GATES.every((gate) => INTERACTION_COMPLETION[type][gate]);
}

/** Page-level safety is separate from each type's verify gates. */
export type SafetyLayerResult = {
  unsafe_blocked: boolean;
};

export function deriveSafetyLayer(runs: readonly RecordedInteractionRun[]): SafetyLayerResult {
  return {
    unsafe_blocked: runs.some((run) => run.ok && run.status === "blocked_for_safety"),
  };
}
