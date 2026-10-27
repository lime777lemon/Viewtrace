import type { InteractionPage } from "@/lib/interaction-engine/interaction-page";
import { detectScrollSection } from "@/lib/interaction-engine/scroll/detect";
import { executeScrollCheckpoints } from "@/lib/interaction-engine/scroll/execute";
import type { ScrollInteractionRunResult } from "@/lib/interaction-engine/scroll/types";
import { verifyScrollTypeRow } from "@/lib/interaction-engine/scroll/verify";
import { SCROLL_CHECKPOINT_FRACS } from "@/lib/observation-scroll-interaction";

export type ScrollInteractionCheckContext = {
  fracs?: readonly number[];
  detectScrollHint?: boolean;
};

/** Detect → Execute → Verify for scroll (shared across browser providers). */
export async function runScrollInteractionCheck(
  page: InteractionPage,
  context: ScrollInteractionCheckContext = {},
): Promise<ScrollInteractionRunResult> {
  const fracs = context.fracs ?? SCROLL_CHECKPOINT_FRACS;
  const detectScrollHint = Boolean(context.detectScrollHint);

  const section = await detectScrollSection(page);
  const { checkpoints, reveal, lazyWork } = await executeScrollCheckpoints({
    page,
    section,
    fracs,
  });
  const typeRow = verifyScrollTypeRow({ section, checkpoints, detectScrollHint });

  return { section, checkpoints, reveal, lazyWork, typeRow };
}
