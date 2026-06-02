import pixelmatch from "pixelmatch";
import sharp from "sharp";

type RgbaImage = { data: Buffer; width: number; height: number };

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** WebP / PNG / JPEG 等を RGBA 生データにデコード */
async function decodeImageToRgba(buf: Buffer): Promise<RgbaImage | null> {
  try {
    const { data, info } = await sharp(buf, { failOnError: false })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (info.width <= 0 || info.height <= 0) return null;
    return { data, width: info.width, height: info.height };
  } catch {
    return null;
  }
}

function cropRgbaTopLeft(src: RgbaImage, width: number, height: number): Buffer {
  const out = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const rowBytes = width * 4;
    src.data.copy(out, y * rowBytes, y * src.width * 4, y * src.width * 4 + rowBytes);
  }
  return out;
}

/** 2 つのスナップショット URL 間のピクセル差分率（0–1）。取得・デコード失敗時は null。 */
export async function computeSnapshotDiffRatio(aUrl: string, bUrl: string): Promise<number | null> {
  try {
    const [aBuf, bBuf] = await Promise.all([fetchImageBuffer(aUrl), fetchImageBuffer(bUrl)]);
    if (!aBuf || !bBuf) return null;

    const [aImg, bImg] = await Promise.all([decodeImageToRgba(aBuf), decodeImageToRgba(bBuf)]);
    if (!aImg || !bImg) return null;

    const width = Math.min(aImg.width, bImg.width);
    const height = Math.min(aImg.height, bImg.height);
    if (width <= 0 || height <= 0) return null;

    const aData = cropRgbaTopLeft(aImg, width, height);
    const bData = cropRgbaTopLeft(bImg, width, height);
    const diff = Buffer.alloc(width * height * 4);

    const diffPixels = pixelmatch(aData, bData, diff, width, height, { threshold: 0.1 });
    const total = width * height;
    return total > 0 ? diffPixels / total : null;
  } catch {
    return null;
  }
}

export function formatDiffRatioPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}
