import { sanitizeObservationRouteId } from "@/lib/observation-route-id";

/** メール内リンク用。パスに UUID を載せるとモバイルで折り返し・ハイフン置換で壊れやすいため、短い API へ誘導する */
export function buildObservationRecordOpenUrls(appOrigin: string, obsId: string): {
  openUrl: string;
  detailUrl: string;
  id: string;
} {
  const origin = appOrigin.replace(/\/+$/, "");
  const id = sanitizeObservationRouteId(obsId) || obsId.trim().toLowerCase();
  const detailUrl = `${origin}/dashboard/observations/${id}`;
  const openUrl = `${origin}/api/open/observation?id=${encodeURIComponent(id)}`;
  return { openUrl, detailUrl, id };
}
