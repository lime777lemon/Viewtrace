export const PRODUCT_TOUR_STEP_IDS = [
  "loop",
  "observe",
  "observeAgain",
  "records",
  "recordsScreen",
  "recordDetail",
  "recordScreen",
  "compare",
  "share",
] as const;

export type ProductTourStepId = (typeof PRODUCT_TOUR_STEP_IDS)[number];
