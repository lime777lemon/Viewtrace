import imghash from "imghash";
import sharp from "sharp";

/**
 * imghash の `bits` 引数は **画像を分割する 1 辺のセル数**で、結果のビット数は
 * `bits × bits`。16 なら 256 bit ＝ 64 hex 文字で、`Observation` の検証上限
 * （128 文字）に十分収まる。
 * 以前 `256` を指定して 65,536 bit / 16,384 hex 文字になり、表示時に弾かれていた。
 */
export const SNAPSHOT_PHASH_GRID_SIDE = 16;
/** 互換目的の別名（既存 import 用） */
export const SNAPSHOT_PHASH_BITS = SNAPSHOT_PHASH_GRID_SIDE;

/** Observation スキーマ上の安全上限。これより長い phash は破棄する。 */
export const SNAPSHOT_PHASH_MAX_HEX_LENGTH = 128;

function clampToMaxHex(hex: string | null | undefined): string | null {
  if (!hex) return null;
  const s = hex.trim().toLowerCase();
  if (s.length === 0) return null;
  if (s.length > SNAPSHOT_PHASH_MAX_HEX_LENGTH) return null;
  if (!/^[a-f0-9]+$/.test(s)) return null;
  return s;
}

/**
 * 画像バッファから知覚ハッシュ（16 進）を計算。WebP 等で失敗したら PNG に落として再試行。
 */
export async function computeSnapshotPerceptualHash(imageBytes: Buffer): Promise<string | null> {
  try {
    return clampToMaxHex(await imghash.hash(imageBytes, SNAPSHOT_PHASH_GRID_SIDE, "hex"));
  } catch {
    try {
      const png = await sharp(imageBytes, { failOnError: false }).png().toBuffer();
      return clampToMaxHex(await imghash.hash(png, SNAPSHOT_PHASH_GRID_SIDE, "hex"));
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
