import { createHash } from "node:crypto";
import type { Observation, ObservationHistoryEvent } from "@/lib/demo/observations";
import {
  captureConditionsForContentHash,
  type CaptureConditionsV1,
  CONTENT_HASH_VERSION_EVIDENCE,
  CONTENT_HASH_VERSION_WITH_CAPTURE,
} from "@/lib/capture-conditions";

/** v1: legacy rows without capture_conditions (includes note/status/events). */
export const OBSERVATION_CONTENT_HASH_VERSION = 1 as const;

/** v3: evidence-only canonical (URL, region, captured_at, screenshot, sha256, capture_conditions). */
export const OBSERVATION_CONTENT_HASH_VERSION_EVIDENCE = CONTENT_HASH_VERSION_EVIDENCE;

/** 新規 INSERT は常に v3。 */
export const OBSERVATION_CONTENT_HASH_VERSION_CURRENT = CONTENT_HASH_VERSION_EVIDENCE;

export type ObservationEvidenceHashFields = {
  id: string;
  url: string;
  region: string;
  region_label: string;
  captured_at: string;
  snapshot_image_url: string;
  snapshot_sha256: string;
  capture_conditions?: CaptureConditionsV1 | null;
};

/** @deprecated v1/v2 検証用。新規行では使わない。 */
export type ObservationContentHashFields = {
  id: string;
  url: string;
  region: string;
  region_label: string;
  captured_at: string;
  status: Observation["status"];
  note: string;
  page_title: string;
  snapshot_image_url: string;
  events: ObservationHistoryEvent[] | null;
  capture_conditions?: CaptureConditionsV1 | null;
};

function normalizeEventsForHash(events: ObservationHistoryEvent[] | null | undefined) {
  return (events ?? []).map((e) => ({
    at: e.at,
    kind: e.kind,
    label: e.label,
    detail: e.detail ?? "",
  }));
}

function computeEvidenceHashFromFields(fields: ObservationEvidenceHashFields): string {
  const canonical: Record<string, unknown> = {
    v: CONTENT_HASH_VERSION_EVIDENCE,
    id: fields.id,
    url: fields.url,
    region: fields.region,
    region_label: fields.region_label,
    captured_at: fields.captured_at,
    snapshot_image_url: fields.snapshot_image_url,
    snapshot_sha256: fields.snapshot_sha256,
  };
  if (fields.capture_conditions) {
    canonical.capture_conditions = captureConditionsForContentHash(fields.capture_conditions);
  }
  return createHash("sha256").update(JSON.stringify(canonical), "utf8").digest("hex");
}

function computeLegacyHashFromFields(fields: ObservationContentHashFields): string {
  const v = fields.capture_conditions
    ? CONTENT_HASH_VERSION_WITH_CAPTURE
    : OBSERVATION_CONTENT_HASH_VERSION;
  const canonical: Record<string, unknown> = {
    v,
    id: fields.id,
    url: fields.url,
    region: fields.region,
    region_label: fields.region_label,
    captured_at: fields.captured_at,
    status: fields.status,
    note: fields.note,
    page_title: fields.page_title,
    snapshot_image_url: fields.snapshot_image_url,
    events: normalizeEventsForHash(fields.events),
  };
  if (v >= CONTENT_HASH_VERSION_WITH_CAPTURE && fields.capture_conditions) {
    canonical.capture_conditions = captureConditionsForContentHash(fields.capture_conditions);
  }
  return createHash("sha256").update(JSON.stringify(canonical), "utf8").digest("hex");
}

export function observationToEvidenceHashFields(obs: Observation): ObservationEvidenceHashFields {
  const region = (obs.regionValue ?? obs.regionLabel ?? "").trim();
  return {
    id: obs.id,
    url: obs.url,
    region,
    region_label: (obs.regionLabel ?? "").trim(),
    captured_at: obs.capturedAt,
    snapshot_image_url: obs.snapshotImageUrl ?? "",
    snapshot_sha256: obs.snapshotSha256 ?? "",
    capture_conditions: obs.captureConditions ?? null,
  };
}

/** @deprecated v1/v2 検証用 */
export function observationToContentHashFields(obs: Observation): ObservationContentHashFields {
  const region = (obs.regionValue ?? obs.regionLabel ?? "").trim();
  return {
    id: obs.id,
    url: obs.url,
    region,
    region_label: (obs.regionLabel ?? "").trim(),
    captured_at: obs.capturedAt,
    status: obs.status,
    note: obs.note ?? "",
    page_title: obs.pageTitle ?? "",
    snapshot_image_url: obs.snapshotImageUrl ?? "",
    events: obs.events ?? null,
    capture_conditions: obs.captureConditions ?? null,
  };
}

export function evidenceHashFieldsFromDbRow(row: Record<string, unknown>): ObservationEvidenceHashFields {
  let capture_conditions: CaptureConditionsV1 | null = null;
  if (row.capture_conditions != null && typeof row.capture_conditions === "object") {
    capture_conditions = row.capture_conditions as CaptureConditionsV1;
  }

  const snapshot_sha256 =
    typeof row.snapshot_sha256 === "string" ? row.snapshot_sha256.trim().toLowerCase() : "";

  return {
    id: String(row.id ?? ""),
    url: typeof row.url === "string" ? row.url : "",
    region: typeof row.region === "string" ? row.region : "",
    region_label: typeof row.region_label === "string" ? row.region_label : "",
    captured_at: typeof row.captured_at === "string" ? row.captured_at : "",
    snapshot_image_url: typeof row.snapshot_image_url === "string" ? row.snapshot_image_url : "",
    snapshot_sha256,
    capture_conditions,
  };
}

/** @deprecated v1/v2 検証用 */
export function contentHashFieldsFromDbRow(row: Record<string, unknown>): ObservationContentHashFields {
  const statusRaw = typeof row.status === "string" ? row.status : "pending";
  const status: Observation["status"] =
    statusRaw === "success" || statusRaw === "failure" || statusRaw === "pending"
      ? statusRaw
      : "pending";

  let capture_conditions: CaptureConditionsV1 | null = null;
  if (row.capture_conditions != null && typeof row.capture_conditions === "object") {
    capture_conditions = row.capture_conditions as CaptureConditionsV1;
  }

  return {
    id: String(row.id ?? ""),
    url: typeof row.url === "string" ? row.url : "",
    region: typeof row.region === "string" ? row.region : "",
    region_label: typeof row.region_label === "string" ? row.region_label : "",
    captured_at: typeof row.captured_at === "string" ? row.captured_at : "",
    status,
    note: typeof row.note === "string" ? row.note : "",
    page_title: typeof row.page_title === "string" ? row.page_title : "",
    snapshot_image_url: typeof row.snapshot_image_url === "string" ? row.snapshot_image_url : "",
    events: Array.isArray(row.events) ? (row.events as ObservationHistoryEvent[]) : null,
    capture_conditions,
  };
}

/** 新規記録保存時の content_hash（v3・証跡のみ） */
export function computeObservationContentHash(obs: Observation): string {
  return computeEvidenceHashFromFields(observationToEvidenceHashFields(obs));
}

export function computeObservationEvidenceHashFromDbRow(row: Record<string, unknown>): string {
  return computeEvidenceHashFromFields(evidenceHashFieldsFromDbRow(row));
}

/** @deprecated v1/v2 検証用 */
export function computeObservationContentHashFromDbRow(row: Record<string, unknown>): string {
  return computeLegacyHashFromFields(contentHashFieldsFromDbRow(row));
}

export type ObservationContentIntegrity = "ok" | "missing" | "mismatch";

function hashMatchesStored(stored: string, expected: string): boolean {
  return expected.toLowerCase() === stored.toLowerCase();
}

/** 保存済み hash が v1 / v2 / v3 のいずれかと一致するか検証 */
export function verifyObservationStoredHashFromDbRow(
  row: Record<string, unknown>,
): ObservationContentIntegrity {
  const stored = typeof row.content_hash === "string" ? row.content_hash.trim() : "";
  if (!stored) return "missing";

  const v3 = computeObservationEvidenceHashFromDbRow(row);
  if (hashMatchesStored(stored, v3)) return "ok";

  const legacy = computeObservationContentHashFromDbRow(row);
  if (hashMatchesStored(stored, legacy)) return "ok";

  return "mismatch";
}

/** 表示用: 保存 hash と一致するバージョン番号 */
export function contentHashVersionForDbRow(row: Record<string, unknown>): number {
  const stored = typeof row.content_hash === "string" ? row.content_hash.trim() : "";
  if (!stored) return OBSERVATION_CONTENT_HASH_VERSION_CURRENT;

  const v3 = computeObservationEvidenceHashFromDbRow(row);
  if (hashMatchesStored(stored, v3)) return OBSERVATION_CONTENT_HASH_VERSION_EVIDENCE;

  if (row.capture_conditions != null && typeof row.capture_conditions === "object") {
    return CONTENT_HASH_VERSION_WITH_CAPTURE;
  }
  return OBSERVATION_CONTENT_HASH_VERSION;
}

export function contentHashVersionForObservation(obs: Observation): number {
  const evidence = observationToEvidenceHashFields(obs);
  const legacy = observationToContentHashFields(obs);
  return contentHashVersionForDbRow({
    content_hash: obs.contentHash ?? "",
    capture_conditions: evidence.capture_conditions ?? null,
    id: evidence.id,
    url: evidence.url,
    region: evidence.region,
    region_label: evidence.region_label,
    captured_at: evidence.captured_at,
    snapshot_image_url: evidence.snapshot_image_url,
    snapshot_sha256: evidence.snapshot_sha256,
    status: legacy.status,
    note: legacy.note,
    page_title: legacy.page_title,
    events: legacy.events,
  });
}

/** @deprecated Prefer verifyObservationStoredHashFromDbRow when a DB row is available */
export function verifyObservationStoredHash(obs: Observation): ObservationContentIntegrity {
  if (!obs.contentHash?.trim()) return "missing";
  const v3 = computeEvidenceHashFromFields(observationToEvidenceHashFields(obs));
  if (hashMatchesStored(obs.contentHash, v3)) return "ok";
  const legacy = computeLegacyHashFromFields(
    observationToContentHashFields({
      ...obs,
      regionValue: obs.regionValue ?? obs.regionLabel,
    }),
  );
  return hashMatchesStored(obs.contentHash, legacy) ? "ok" : "mismatch";
}
