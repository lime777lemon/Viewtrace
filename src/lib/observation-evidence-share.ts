export type ObservationEvidenceShareFields = {
  verifyUrl?: string;
  sha256: string;
  snapshotUrl?: string;
  bytes?: number;
  contentType?: string;
  phash?: string;
};

export type ObservationEvidenceShareLabels = {
  heading: string;
  verifyUrl: string;
  sha256: string;
  snapshot: string;
  fileSize: string;
  phash: string;
};

/** Client-ready plain text for Slack, email, or clipboard. */
export function formatObservationEvidenceShareText(
  fields: ObservationEvidenceShareFields,
  labels: ObservationEvidenceShareLabels,
): string {
  const lines: string[] = [labels.heading, ""];

  if (fields.verifyUrl?.trim()) {
    lines.push(`${labels.verifyUrl}:`, fields.verifyUrl.trim(), "");
  }

  lines.push(`${labels.sha256}:`, fields.sha256.trim());

  if (fields.snapshotUrl?.trim()) {
    lines.push("", `${labels.snapshot}:`, fields.snapshotUrl.trim());
  }

  if (typeof fields.bytes === "number") {
    const size = `${fields.bytes.toLocaleString()} bytes`;
    const type = fields.contentType?.trim();
    lines.push("", `${labels.fileSize}: ${type ? `${size} · ${type}` : size}`);
  }

  if (fields.phash?.trim()) {
    lines.push("", `${labels.phash}:`, fields.phash.trim());
  }

  return lines.join("\n");
}
