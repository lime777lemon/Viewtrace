import type { ProductTourStepId } from "@/lib/product-tour-ids";

export { PRODUCT_TOUR_STEP_IDS, type ProductTourStepId } from "@/lib/product-tour-ids";

export const PRODUCT_TOUR_QUERY = "tour";
export const PRODUCT_TOUR_INDEX_KEY = "viewtrace_product_tour_index";
export const PRODUCT_TOUR_FORCE_KEY = "viewtrace_product_tour_force";
export const PRODUCT_TOUR_COMPLETED_PREFIX = "viewtrace_product_tour_v1:";

export function productTourHref(
  id: ProductTourStepId,
  latestObservationId?: string | null,
): string {
  switch (id) {
    case "observe":
      return "/dashboard/region-search";
    case "records":
    case "recordsScreen":
    case "recordDetail":
      return "/dashboard/observations";
    case "recordScreen":
    case "compare":
    case "share":
      return latestObservationId
        ? `/dashboard/observations/${latestObservationId}`
        : "/dashboard/observations";
    case "loop":
    case "observeAgain":
    default:
      return "/dashboard";
  }
}

export function productTourPathMatches(
  id: ProductTourStepId,
  pathname: string,
  latestObservationId?: string | null,
): boolean {
  const href = productTourHref(id, latestObservationId);
  if (id === "loop" || id === "observeAgain") {
    return pathname === "/dashboard";
  }
  if (id === "observe") {
    return pathname === "/dashboard/region-search";
  }
  if (id === "records" || id === "recordsScreen" || id === "recordDetail") {
    return pathname === "/dashboard/observations";
  }
  if (latestObservationId && (id === "recordScreen" || id === "compare" || id === "share")) {
    return pathname === `/dashboard/observations/${latestObservationId}`;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function completedKey(userId: string): string {
  return `${PRODUCT_TOUR_COMPLETED_PREFIX}${userId}`;
}

export function readProductTourCompleted(userId: string): boolean {
  try {
    return localStorage.getItem(completedKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function writeProductTourCompleted(userId: string): void {
  try {
    localStorage.setItem(completedKey(userId), "1");
  } catch {
    /* private mode */
  }
}

export function readProductTourIndex(): number | null {
  try {
    const raw = sessionStorage.getItem(PRODUCT_TOUR_INDEX_KEY);
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

export function writeProductTourIndex(index: number): void {
  try {
    sessionStorage.setItem(PRODUCT_TOUR_INDEX_KEY, String(index));
  } catch {
    /* private mode */
  }
}

export function clearProductTourIndex(): void {
  try {
    sessionStorage.removeItem(PRODUCT_TOUR_INDEX_KEY);
  } catch {
    /* private mode */
  }
}

export function requestProductTourReplay(): void {
  try {
    sessionStorage.setItem(PRODUCT_TOUR_FORCE_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function consumeProductTourForce(): boolean {
  try {
    const forced = sessionStorage.getItem(PRODUCT_TOUR_FORCE_KEY) === "1";
    if (forced) sessionStorage.removeItem(PRODUCT_TOUR_FORCE_KEY);
    return forced;
  } catch {
    return false;
  }
}
