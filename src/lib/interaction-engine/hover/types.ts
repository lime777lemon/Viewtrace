import type { HoverStyleSnapshot } from "@/lib/interaction-engine/hover/style-snapshot";

export type HoverDetectHit = {
  selector: string | null;
  blocked: boolean;
};

export type HoverExecutionResult = {
  selector: string;
  before: HoverStyleSnapshot | null;
  after: HoverStyleSnapshot | null;
  pointerMoved: boolean;
};

export type HoverTypeRowPush = {
  detected: boolean;
  status:
    | "working"
    | "no_change_observed"
    | "failed"
    | "not_detected"
    | "not_measured"
    | "blocked_for_safety"
    | "playback_not_verifiable";
  evidence: Record<string, unknown> | null;
};

export type HoverInteractionRunResult = {
  hit: HoverDetectHit;
  execution: HoverExecutionResult | null;
  typeRow: HoverTypeRowPush | null;
};
