import sharp from "sharp";

const MAX_BYTES = 2_000_000;

export async function loadAuditScreenshot(
  imageUrl: string | undefined,
): Promise<{ bytes: Uint8Array; mediaType: string } | undefined> {
  const raw = imageUrl?.trim();
  if (!raw) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== "https:") return undefined;

  try {
    const res = await fetch(parsed, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "image/avif,image/webp,image/*,*/*;q=0.8" },
    });
    if (!res.ok) return undefined;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES * 4) return undefined;
    const jpeg = await sharp(buf)
      .rotate()
      .resize({ width: 1024, withoutEnlargement: true })
      .jpeg({ quality: 72 })
      .toBuffer();
    if (jpeg.byteLength > MAX_BYTES) return undefined;
    return { bytes: new Uint8Array(jpeg), mediaType: "image/jpeg" };
  } catch {
    return undefined;
  }
}
