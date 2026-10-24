export const PRODUCT_TOUR_STEP_IDS = [
  "observe",
  "records",
  "recordsScreen",
  "recordDetail",
  "recordScreen",
  "compare",
  "share",
  "journeys",
  "loop",
  "observeAgain",
] as const;

export type ProductTourStepId = (typeof PRODUCT_TOUR_STEP_IDS)[number];
