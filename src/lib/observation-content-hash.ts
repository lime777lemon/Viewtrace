import { createHash } from "node:crypto";
import type { Observation, ObservationHistoryEvent } from "@/lib/demo/observations";

/** ハッシュアルゴリズム版。ペイロード形式を変えるときは必ず増やす */
export const OBSERVATION_CONTENT_HASH_VERSION = 1 as const;

/** DB 行と insert ペイロードで共通の正規化入力（ハッシュの単一ソース） */
export type ObservationContentHashFields = {
  id: string;
  url: string;
  /** observations.region — insert 時は regionValue ?? regionLabel */
  region: string;
  /** observations.region_label */
  region_label: string;
  captured_at: string;
  status: Observation["status"];
  note: string;
  page_title: string;
  snapshot_image_url: string;
  events: ObservationHistoryEvent[] | null;
};

function normalizeEventsForHash(events: ObservationHistoryEvent[] | null | undefined) {
  return (events ?? []).map((e) => ({
    at: e.at,
    kind: e.kind,
    label: e.label,
    detail: e.detail ?? "",
  }));
}

function computeContentHashFromFields(fields: ObservationContentHashFields): string {
  const canonical = {
    v: OBSERVATION_CONTENT_HASH_VERSION,
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

  return createHash("sha256").update(JSON.stringify(canonical), "utf8").digest("hex");
}

/** 記録保存直前の Observation → insert ペイロードと同じフィールドでハッシュ化 */
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
  };
}

/** DB 行 → ハッシュ入力（UI 用の regionLabel フォールバックは含めない） */
export function contentHashFieldsFromDbRow(row: Record<string, unknown>): ObservationContentHashFields {
  const statusRaw = typeof row.status === "string" ? row.status : "pending";
  const status: Observation["status"] =
    statusRaw === "success" || statusRaw === "failure" || statusRaw === "pending"
      ? statusRaw
      : "pending";

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
  };
}

/**
 * 記録時点の「主要フィールド」から正規化ペイロードを作り SHA-256（hex）を返す。
 * DB 行が改変されていれば、保存済み content_hash と一致しなくなる（ユーザーが両方書き換え可能な限界は残る）。
 */
export function computeObservationContentHash(obs: Observation): string {
  return computeContentHashFromFields(observationToContentHashFields(obs));
}

export function computeObservationContentHashFromDbRow(row: Record<string, unknown>): string {
  return computeContentHashFromFields(contentHashFieldsFromDbRow(row));
}

export type ObservationContentIntegrity = "ok" | "missing" | "mismatch";

export function verifyObservationStoredHashFromDbRow(
  row: Record<string, unknown>,
): ObservationContentIntegrity {
  const stored = typeof row.content_hash === "string" ? row.content_hash.trim() : "";
  if (!stored) return "missing";
  const expected = computeObservationContentHashFromDbRow(row);
  return expected.toLowerCase() === stored.toLowerCase() ? "ok" : "mismatch";
}

/** @deprecated Prefer verifyObservationStoredHashFromDbRow when a DB row is available */
export function verifyObservationStoredHash(obs: Observation): ObservationContentIntegrity {
  if (!obs.contentHash?.trim()) return "missing";
  const fields = observationToContentHashFields({ ...obs, regionValue: obs.regionValue ?? obs.regionLabel });
  const expected = computeContentHashFromFields(fields);
  return expected.toLowerCase() === obs.contentHash.toLowerCase() ? "ok" : "mismatch";
}
