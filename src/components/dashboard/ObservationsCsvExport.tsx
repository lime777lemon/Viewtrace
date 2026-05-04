"use client";

import type { Observation } from "@/lib/demo/observations";

function toCsv(rows: Observation[]): string {
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

export function ObservationsCsvExport({ rows }: { rows: Observation[] }) {
  function download() {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `viewtrace-observations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      className="inline-flex shrink-0 items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-accent)]/40"
    >
      CSVエクスポート
    </button>
  );
}
