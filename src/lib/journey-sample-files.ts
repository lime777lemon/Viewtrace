/** Small harmless files a Journey may place on a file input. They are not sent unless the step permits submit. */

export const UPLOAD_SAMPLE_IDS = ["sample_jpg", "sample_png", "sample_pdf", "sample_csv", "sample_txt"] as const;

export type UploadSampleId = (typeof UPLOAD_SAMPLE_IDS)[number];

export type JourneyTestFile = {
  name: string;
  mime: string;
  base64: string;
};

const JPEG = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const PDF = "JVBERi0xLjEKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCjIgMCBvYmo8PC9UeXBlL1BhZ2VzL0NvdW50IDAvS2lkc1tdPj5lbmRvYmoKdHJhaWxlcjw8L1Jvb3QgMSAwIFI+PgolJUVPRgo=";
const CSV = "bmFtZSx2YWx1ZQp2aWV3dHJhY2UsMQo=";
const TEXT = "Vmlld1RyYWNlIHRlc3QgZmlsZQo=";

export const VIEWTRACE_SAMPLE_FILES: Record<UploadSampleId, JourneyTestFile> = {
  sample_jpg: { name: "viewtrace-test.jpg", mime: "image/jpeg", base64: JPEG },
  sample_png: { name: "viewtrace-test.png", mime: "image/png", base64: PNG },
  sample_pdf: { name: "viewtrace-test.pdf", mime: "application/pdf", base64: PDF },
  sample_csv: { name: "viewtrace-test.csv", mime: "text/csv", base64: CSV },
  sample_txt: { name: "viewtrace-test.txt", mime: "text/plain", base64: TEXT },
};

export const UPLOAD_CUSTOM_MAX_BYTES = 60_000;

export function parseUploadSample(raw: unknown): UploadSampleId | "" {
  return UPLOAD_SAMPLE_IDS.find((id) => id === raw) ?? "";
}

export function parseUploadCustom(raw: unknown): JourneyTestFile | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const name = typeof row.name === "string" ? row.name.replace(/[/\\]/g, "").trim().slice(0, 80) : "";
  const mime = typeof row.mime === "string" ? row.mime.trim().slice(0, 80) : "";
  const base64 = typeof row.base64 === "string" ? row.base64.replace(/\s/g, "") : "";
  if (!name || !/^[A-Za-z0-9+/=]+$/.test(base64)) return null;
  const bytes = Math.floor((base64.length * 3) / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
  if (bytes <= 0 || bytes > UPLOAD_CUSTOM_MAX_BYTES) return null;
  return { name, mime: mime || "application/octet-stream", base64 };
}
