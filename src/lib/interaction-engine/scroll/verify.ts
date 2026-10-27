import type { ScrollSectionInfo, ScrollTypeRowPush } from "@/lib/interaction-engine/scroll/types";
import {
  scrollCheckEvidence,
  type ScrollCheckpointSample,
} from "@/lib/observation-scroll-interaction";

export function verifyScrollTypeRow(input: {
  section: ScrollSectionInfo;
  checkpoints: ScrollCheckpointSample[];
  detectScrollHint: boolean;
}): ScrollTypeRowPush | null {
  const scrollDetected = Boolean(input.section.found || input.detectScrollHint);
  if (!scrollDetected) {
    return { detected: false, status: "not_detected", evidence: null };
  }
  if (!input.checkpoints.length) {
    return { detected: true, status: "failed", evidence: null };
  }
  const ev = scrollCheckEvidence(input.checkpoints);
  const hasChange = Boolean(ev && ev.changes && ev.changes.length > 0);
  if (hasChange && ev) {
    return {
      detected: true,
      status: "working",
      evidence: {
        actions: ev.actions,
        selector: ev.selector,
        t0: ev.t0,
        t1: ev.t1,
        changes: ev.changes,
      },
    };
  }
  return {
    detected: true,
    status: "no_change_observed",
    evidence: { actions: ["SCROLL"], changes: [] },
  };
}
