import type { InteractionPage } from "@/lib/interaction-engine/interaction-page";
import { detectHoverHit } from "@/lib/interaction-engine/hover/detect";
import { executeHoverPointer } from "@/lib/interaction-engine/hover/execute";
import type { HoverInteractionRunResult } from "@/lib/interaction-engine/hover/types";
import { verifyHoverTypeRow } from "@/lib/interaction-engine/hover/verify";

export type HoverInteractionCheckContext = {
  detectHit?: unknown;
};

/** Detect → Execute (pointer move) → Verify for hover. */
export async function runHoverInteractionCheck(
  page: InteractionPage,
  context: HoverInteractionCheckContext = {},
): Promise<HoverInteractionRunResult> {
  const hit = detectHoverHit(context.detectHit);
  if (hit.blocked && !hit.selector) {
    return {
      hit,
      execution: null,
      typeRow: verifyHoverTypeRow({ hit, execution: null }),
    };
  }
  if (!hit.selector) {
    return {
      hit,
      execution: null,
      typeRow: verifyHoverTypeRow({ hit, execution: null }),
    };
  }

  const execution = await executeHoverPointer({ page, hit });
  const typeRow = verifyHoverTypeRow({ hit, execution });

  return { hit, execution, typeRow };
}
