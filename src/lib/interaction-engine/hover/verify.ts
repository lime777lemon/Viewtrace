import { hoverStyleChanged } from "@/lib/interaction-engine/hover/style-snapshot";
import type {
  HoverDetectHit,
  HoverExecutionResult,
  HoverTypeRowPush,
} from "@/lib/interaction-engine/hover/types";

export function verifyHoverTypeRow(input: {
  hit: HoverDetectHit;
  execution: HoverExecutionResult | null;
}): HoverTypeRowPush | null {
  const { hit, execution } = input;

  if (hit.blocked && !hit.selector) {
    return { detected: true, status: "blocked_for_safety", evidence: null };
  }
  if (!hit.selector) {
    return { detected: false, status: "not_detected", evidence: null };
  }
  if (!execution || !execution.pointerMoved) {
    return { detected: true, status: "failed", evidence: { actions: ["HOVER"], selector: hit.selector } };
  }

  const ok = hoverStyleChanged(execution.before, execution.after);
  const hoverChanges: string[] = [];
  const t0 = execution.before;
  const t1 = execution.after;
  if (ok && t0 && t1) {
    if (t0.transform !== t1.transform) hoverChanges.push("transform");
    if (t0.opacity !== t1.opacity) hoverChanges.push("opacity");
    if (t0.visibility !== t1.visibility) hoverChanges.push("visibility");
    if (t0.display !== t1.display) hoverChanges.push("display");
    if (t0.hidden !== t1.hidden) hoverChanges.push("hidden");
    if (t0.color !== t1.color) hoverChanges.push("color");
    if (!hoverChanges.length) hoverChanges.push("state");
  }

  return {
    detected: true,
    status: ok ? "working" : "no_change_observed",
    evidence: {
      actions: ["HOVER"],
      selector: execution.selector,
      t0,
      t1,
      changes: hoverChanges,
    },
  };
}
