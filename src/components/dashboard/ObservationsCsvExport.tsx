"use client";

import { useState } from "react";
import { exportObservationsCsvAction } from "@/app/actions/observations-export";

export function ObservationsCsvExport() {
  const [pending, setPending] = useState(false);

  async function download() {
    setPending(true);
    try {
      const res = await exportObservationsCsvAction();
      if (!res.ok) return;
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => void download()}
      className="inline-flex shrink-0 items-center rounded-full border border-border bg-surface-elevated px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-accent/40 disabled:opacity-60"
    >
      {pending ? "準備中…" : "CSVエクスポート"}
    </button>
  );
}
