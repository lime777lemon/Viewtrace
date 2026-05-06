import { put } from "@vercel/blob";

/** 観測 ID ごとに PNG を公開 Blob に置き、URL を返す（未設定時は null） */
export async function uploadObservationSnapshotPng(
  observationId: string,
  png: ArrayBuffer,
): Promise<string | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return null;
  try {
    const { url } = await put(`observations/${observationId}.png`, Buffer.from(png), {
      access: "public",
      contentType: "image/png",
      token,
    });
    return url.length < 2048 ? url : null;
  } catch {
    return null;
  }
}
