import type { ScrollCheckpointSample } from "@/lib/observation-scroll-interaction";

export type ScrollSectionInfo = {
  found: boolean;
  top: number;
  range: number;
  reduced: boolean;
};

export type ScrollTypeRowPush = {
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

export type ScrollInteractionRunResult = {
  section: ScrollSectionInfo;
  checkpoints: ScrollCheckpointSample[];
  reveal: boolean;
  lazyWork: boolean;
  typeRow: ScrollTypeRowPush | null;
};
