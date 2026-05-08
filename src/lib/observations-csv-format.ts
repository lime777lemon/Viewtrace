import type { Observation } from "@/lib/demo/observations";

export function observationsToCsv(rows: Observation[]): string {
  const header = ["id", "capturedAt", "region", "url", "status", "note"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.id,
        r.capturedAt,
        `"${r.regionLabel.replace(/"/g, '""')}"`,
        `"${r.url.replace(/"/g, '""')}"`,
        r.status,
        r.note ? `"${r.note.replace(/"/g, '""')}"` : "",
      ].join(","),
    ),
  ];
  return lines.join("\n");
}
