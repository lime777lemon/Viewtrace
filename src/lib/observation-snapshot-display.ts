import type { CaptureConditionsV1 } from "@/lib/capture-conditions";

/** Whether the saved snapshot should be shown as a full-page scroll (not a viewport crop). */
export function observationSnapshotIsFullPage(captureConditions: CaptureConditionsV1 | null | undefined): boolean {
  if (!captureConditions) return false;
  if (captureConditions.full_page_requested === true) return true;
  const viewportHeight = captureConditions.viewport?.height;
  const imageHeight = captureConditions.result?.image_height_px;
  if (
    typeof viewportHeight === "number" &&
    viewportHeight > 0 &&
    typeof imageHeight === "number" &&
    imageHeight > viewportHeight * 1.2
  ) {
    return true;
  }
  return false;
}
