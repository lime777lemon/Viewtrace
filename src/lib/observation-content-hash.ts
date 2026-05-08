import { createHash } from "node:crypto";
import type { Observation } from "@/lib/demo/observations";

/** ハッシュアルゴリズム版。ペイロード形式を変えるときは必ず増やす */
export const OBSERVATION_CONTENT_HASH_VERSION = 1 as const;

/**
 * 記録時点の「主要フィールド」から正規化ペイロードを作り SHA-256（hex）を返す。
 * DB 行が改変されていれば、保存済み content_hash と一致しなくなる（ユーザーが両方書き換え可能な限界は残る）。
 */
export function computeObservationContentHash(obs: Observation): string {
  const canonical = {
    v: OBSERVATION_CONTENT_HASH_VERSION,
    id: obs.id,
    url: obs.url,
    region: obs.regionValue ?? "",
    region_label: obs.regionLabel,
    captured_at: obs.capturedAt,
    status: obs.status,
    note: obs.note ?? "",
    page_title: obs.pageTitle ?? "",
    snapshot_image_url: obs.snapshotImageUrl ?? "",
    events: (obs.events ?? []).map((e) => ({
      at: e.at,
      kind: e.kind,
      label: e.label,
      detail: e.detail ?? "",
    })),
  };

  return createHash("sha256").update(JSON.stringify(canonical), "utf8").digest("hex");
}

export type ObservationContentIntegrity = "ok" | "missing" | "mismatch";

export function verifyObservationStoredHash(obs: Observation): ObservationContentIntegrity {
  if (!obs.contentHash?.trim()) return "missing";
  const expected = computeObservationContentHash(obs);
  return expected.toLowerCase() === obs.contentHash.toLowerCase() ? "ok" : "mismatch";
}
