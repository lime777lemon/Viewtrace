"use server";

import { createHash } from "node:crypto";
import { getSession } from "@/lib/auth/session";
import { getObservationMergedForPlan } from "@/lib/demo/user-observations";
import { computeSnapshotPerceptualHash, perceptualHashDistance } from "@/lib/snapshot-perceptual-hash";

const MAX_SNAPSHOT_BYTES = 30 * 1024 * 1024;

export type SnapshotVerifyVerdict =
  /** バイト列が記録時と同一 */
  | "exact"
  /** バイトは異なるが知覚距離 0〜5（ほぼ同一見た目） */
  | "visual_strong"
  /** 知覚距離 6〜10（かなり近い） */
  | "visual_weak"
  /** 知覚距離が大きい、または保存 phash なしでバイト不一致 */
  | "different"
  /** 取得はできたが phash 計算不可・形式不整合 */
  | "unverified";

/**
 * オンデマンド: URL から 1 回取得し、(1) SHA-256 完全一致 (2) 不一致時は知覚ハッシュ距離で近似判定。
 */
export async function verifyObservationSnapshotBinaryAction(
  observationId: string,
): Promise<
  | {
      ok: true;
      verdict: SnapshotVerifyVerdict;
      sha256Match: boolean;
      phashDistance: number | null;
    }
  | {
      ok: false;
      error: "unauthorized" | "not_found" | "no_hash" | "no_url" | "fetch_failed" | "too_large";
    }
> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const obs = await getObservationMergedForPlan(observationId, session.plan);
  if (!obs) return { ok: false, error: "not_found" };
  if (!obs.snapshotSha256?.trim()) return { ok: false, error: "no_hash" };
  const url = obs.snapshotImageUrl?.trim();
  if (!url || !/^https?:\/\//i.test(url)) return { ok: false, error: "no_url" };

  let res: Response;
  try {
    res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    return { ok: false, error: "fetch_failed" };
  }

  if (!res.ok) return { ok: false, error: "fetch_failed" };

  const lenHeader = res.headers.get("content-length");
  if (lenHeader && Number(lenHeader) > MAX_SNAPSHOT_BYTES) {
    return { ok: false, error: "too_large" };
  }

  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_SNAPSHOT_BYTES) {
    return { ok: false, error: "too_large" };
  }

  const body = Buffer.from(buf);
  const hex = createHash("sha256").update(body).digest("hex");
  const sha256Match = hex.toLowerCase() === obs.snapshotSha256.toLowerCase();

  if (sha256Match) {
    return { ok: true, verdict: "exact", sha256Match: true, phashDistance: null };
  }

  const storedPhash = obs.snapshotPhash?.trim();
  if (!storedPhash) {
    return { ok: true, verdict: "different", sha256Match: false, phashDistance: null };
  }

  const freshPhash = await computeSnapshotPerceptualHash(body);
  if (!freshPhash) {
    return { ok: true, verdict: "unverified", sha256Match: false, phashDistance: null };
  }

  const dist = perceptualHashDistance(freshPhash, storedPhash);
  if (dist === null) {
    return { ok: true, verdict: "unverified", sha256Match: false, phashDistance: null };
  }

  if (dist <= 5) {
    return { ok: true, verdict: "visual_strong", sha256Match: false, phashDistance: dist };
  }
  if (dist <= 10) {
    return { ok: true, verdict: "visual_weak", sha256Match: false, phashDistance: dist };
  }
  return { ok: true, verdict: "different", sha256Match: false, phashDistance: dist };
}
