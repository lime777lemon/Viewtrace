import sharp from "sharp";

export async function getPngDimensions(
  png: ArrayBuffer,
): Promise<{ width: number; height: number } | null> {
  try {
    const meta = await sharp(Buffer.from(png)).metadata();
    if (typeof meta.width === "number" && typeof meta.height === "number" && meta.width > 0) {
      return { width: meta.width, height: meta.height };
    }
  } catch {
    /* ignore */
  }
  return null;
}
