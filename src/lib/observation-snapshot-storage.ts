import { createHash } from "node:crypto";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { computeSnapshotPerceptualHash } from "@/lib/snapshot-perceptual-hash";

export type ObservationSnapshotUploadResult =
  | {
      ok: true;
      url: string;
      snapshotSha256: string;
      snapshotPhash: string | null;
      snapshotBytes: number;
      snapshotContentType: string;
    }
  | {
      ok: false;
      code: "token_missing" | "url_too_long" | "upload_failed";
      message?: string;
    };

export type ObservationSnapshotUploadOptions = {
  /**
   * 保存形式。
   * - `webp`: デフォルト。転送・保存コストを抑えつつ、視認性を維持する
   * - `png`: 変換しない（デバッグやフォールバック用途）
   */
  format?: "webp" | "png";
  /**
   * WebP の品質（0-100）。
   * 文字/UI の視認性を優先するため、低すぎる値は避けること。
   */
  webpQuality?: number;
  /** Pro 等: 知覚ハッシュを付与（CPU わずかに増） */
  includePerceptualHash?: boolean;
};

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** 観測 ID ごとにスナップショットを公開 Blob に置き、結果を返す */
export async function uploadObservationSnapshotPng(
  observationId: string,
  png: ArrayBuffer,
  opts?: ObservationSnapshotUploadOptions,
): Promise<ObservationSnapshotUploadResult> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    console.warn("[blob] observation snapshot skipped", { observationId, code: "token_missing" });
    return { ok: false, code: "token_missing" };
  }
  try {
    const input = Buffer.from(png);

    const format = opts?.format ?? "webp";
    const quality = clampInt(opts?.webpQuality ?? 85, 70, 92);

    let body: Buffer = input;
    let key = `observations/${observationId}.png`;
    let contentType: "image/png" | "image/webp" = "image/png";

    if (format === "webp") {
      try {
        const converted = await sharp(input, { failOnError: false })
          .webp({ quality, effort: 4 })
          .toBuffer();

        // If WebP becomes larger (rare), keep PNG to avoid quality regressions.
        if (converted.length > 0 && converted.length <= input.length * 1.1) {
          body = converted;
          key = `observations/${observationId}.webp`;
          contentType = "image/webp";
        } else {
          console.info("[blob] webp skipped (larger than png)", {
            observationId,
            pngBytes: input.length,
            webpBytes: converted.length,
          });
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.warn("[blob] webp conversion failed; falling back to png", { observationId, message });
      }
    }

    const snapshotSha256 = createHash("sha256").update(body).digest("hex");
    const snapshotBytes = body.length;

    let snapshotPhash: string | null = null;
    if (opts?.includePerceptualHash) {
      snapshotPhash = await computeSnapshotPerceptualHash(body);
      if (!snapshotPhash) {
        console.warn("[blob] perceptual hash unavailable", { observationId, contentType });
      }
    }

    const { url } = await put(key, body, {
      access: "public",
      contentType,
      token,
    });
    if (url.length >= 2048) {
      console.warn("[blob] observation snapshot rejected", {
        observationId,
        code: "url_too_long",
        urlLength: url.length,
      });
      return { ok: false, code: "url_too_long", message: `URL length ${url.length}` };
    }
    console.info("[blob] observation snapshot uploaded", {
      observationId,
      format: contentType,
      bytes: snapshotBytes,
      snapshotSha256,
      hasPhash: Boolean(snapshotPhash),
      quality: format === "webp" ? quality : undefined,
    });
    return {
      ok: true,
      url,
      snapshotSha256,
      snapshotPhash,
      snapshotBytes,
      snapshotContentType: contentType,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn("[blob] observation snapshot upload failed", { observationId, message });
    return { ok: false, code: "upload_failed", message };
  }
}
