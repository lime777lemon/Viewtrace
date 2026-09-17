import type { CaptureConditionsV1 } from "@/lib/capture-conditions";
import type { Observation, ObservationStatus } from "@/lib/demo/observations";

/** AdsChecks の SLOT_EMPTY に相当。追加撮影なしで既存フィールドから判定する。 */
export type LpVerdictCode =
  | "lp_rendered"
  | "lp_no_snapshot"
  | "lp_capture_failed"
  | "lp_pending";

export type ObservationEvidencePack = {
  schema: "viewtrace.observation.evidence.v1";
  job: "landing_page_geo_verification";
  observationId: string;
  url: string;
  regionLabel: string;
  regionValue: string | null;
  capturedAt: string;
  status: ObservationStatus;
  verdict: {
    code: LpVerdictCode;
    snapshotPresent: boolean;
    httpStatus: number | null;
    captureScope: "full_page" | "viewport" | "unknown";
  };
  pageTitle: string | null;
  snapshot: {
    imageUrl: string | null;
    sha256: string | null;
    contentType: string | null;
    bytes: number | null;
    widthPx: number | null;
    heightPx: number | null;
  };
  integrity: {
    contentHash: string | null;
    snapshotSha256: string | null;
  };
  geo: {
    country: string | null;
    state: string | null;
  };
  verifyUrl: string | null;
};

export function resolveLpVerdict(input: {
  status: ObservationStatus;
  snapshotImageUrl?: string | null;
  captureConditions?: CaptureConditionsV1 | null;
}): ObservationEvidencePack["verdict"] {
  const snapshotPresent = Boolean(input.snapshotImageUrl?.trim());
  const httpStatus = input.captureConditions?.engine.direct_fetch?.http_status ?? null;
  const captureScope = input.captureConditions
    ? input.captureConditions.full_page_requested
      ? "full_page"
      : "viewport"
    : "unknown";

  let code: LpVerdictCode;
  if (input.status === "pending") code = "lp_pending";
  else if (input.status === "failure") code = "lp_capture_failed";
  else if (!snapshotPresent) code = "lp_no_snapshot";
  else code = "lp_rendered";

  return { code, snapshotPresent, httpStatus, captureScope };
}

export function buildObservationEvidencePack(input: {
  obs: Pick<
    Observation,
    | "id"
    | "url"
    | "regionLabel"
    | "regionValue"
    | "capturedAt"
    | "status"
    | "pageTitle"
    | "snapshotImageUrl"
    | "snapshotSha256"
    | "snapshotContentType"
    | "snapshotBytes"
    | "contentHash"
    | "captureConditions"
  >;
  verifyUrl: string | null;
}): ObservationEvidencePack {
  const { obs, verifyUrl } = input;
  const conditions = obs.captureConditions ?? null;
  const verdict = resolveLpVerdict({
    status: obs.status,
    snapshotImageUrl: obs.snapshotImageUrl,
    captureConditions: conditions,
  });

  return {
    schema: "viewtrace.observation.evidence.v1",
    job: "landing_page_geo_verification",
    observationId: obs.id,
    url: obs.url,
    regionLabel: obs.regionLabel,
    regionValue: obs.regionValue ?? null,
    capturedAt: obs.capturedAt,
    status: obs.status,
    verdict,
    pageTitle: obs.pageTitle ?? null,
    snapshot: {
      imageUrl: obs.snapshotImageUrl?.trim() || null,
      sha256: obs.snapshotSha256?.trim() || null,
      contentType: obs.snapshotContentType ?? null,
      bytes: obs.snapshotBytes ?? null,
      widthPx: conditions?.result.image_width_px ?? null,
      heightPx: conditions?.result.image_height_px ?? null,
    },
    integrity: {
      contentHash: obs.contentHash?.trim() || null,
      snapshotSha256: obs.snapshotSha256?.trim() || null,
    },
    geo: {
      country: conditions?.geo.country ?? null,
      state: conditions?.geo.state ?? null,
    },
    verifyUrl,
  };
}

export const WEBHOOK_PAYLOAD_SAMPLE: string = `{
  "event": "observation.auto_saved",
  "observationId": "uuid",
  "url": "https://example.com/lp",
  "region": "US-CA",
  "capturedAt": "2026-09-17T00:00:00.000Z",
  "status": "success",
  "snapshotUrl": "https://…",
  "snapshotSha256": "hex",
  "diffRatio": 0.02,
  "recordUrl": "https://viewtrace.net/dashboard/observations/…",
  "verifyUrl": "https://viewtrace.net/verify/…"
}`;
