import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

/** 2 つのスナップショット URL 間のピクセル差分率（0–1）。取得失敗時は null。 */
export async function computeSnapshotDiffRatio(aUrl: string, bUrl: string): Promise<number | null> {
  try {
    const [aRes, bRes] = await Promise.all([fetch(aUrl), fetch(bUrl)]);
    if (!aRes.ok || !bRes.ok) return null;
    const [aBuf, bBuf] = await Promise.all([aRes.arrayBuffer(), bRes.arrayBuffer()]);
    const aPng = PNG.sync.read(Buffer.from(aBuf));
    const bPng = PNG.sync.read(Buffer.from(bBuf));
    const width = Math.min(aPng.width, bPng.width);
    const height = Math.min(aPng.height, bPng.height);
    if (width <= 0 || height <= 0) return null;

    const aCropped = new PNG({ width, height });
    const bCropped = new PNG({ width, height });
    PNG.bitblt(aPng, aCropped, 0, 0, width, height, 0, 0);
    PNG.bitblt(bPng, bCropped, 0, 0, width, height, 0, 0);

    const diff = new PNG({ width, height });
    const diffPixels = pixelmatch(aCropped.data, bCropped.data, diff.data, width, height, {
      threshold: 0.1,
    });
    const total = width * height;
    return total > 0 ? diffPixels / total : null;
  } catch {
    return null;
  }
}

export function formatDiffRatioPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}
