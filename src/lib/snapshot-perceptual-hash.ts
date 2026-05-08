import imghash from "imghash";
import sharp from "sharp";

/** blockhash 系のビット長（4 の倍数）。大きいほど判別力が上がる */
export const SNAPSHOT_PHASH_BITS = 256;

/**
 * 画像バッファから知覚ハッシュ（16 進）を計算。WebP 等で失敗したら PNG に落として再試行。
 */
export async function computeSnapshotPerceptualHash(imageBytes: Buffer): Promise<string | null> {
  try {
    return await imghash.hash(imageBytes, SNAPSHOT_PHASH_BITS, "hex");
  } catch {
    try {
      const png = await sharp(imageBytes, { failOnError: false }).png().toBuffer();
      return await imghash.hash(png, SNAPSHOT_PHASH_BITS, "hex");
    } catch {
      return null;
    }
  }
}

/** ハミング距離（ビット不一致数）。形式が違う場合は null */
export function perceptualHashDistance(hexA: string, hexB: string): number | null {
  try {
    const a = imghash.hexToBinary(hexA.trim());
    const b = imghash.hexToBinary(hexB.trim());
    if (a.length !== b.length || a.length === 0) return null;
    let d = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) d += 1;
    }
    return d;
  } catch {
    return null;
  }
}
