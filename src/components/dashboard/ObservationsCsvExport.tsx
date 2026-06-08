"use client";

import { useState } from "react";
import { exportObservationsCsvAction } from "@/app/actions/observations-export";

type Props = {
  exportButton: string;
  downloadAction: string;
  pendingLabel: string;
  auditCheckbox: string;
  auditHint: string;
  modeStandard: string;
  modeAudit: string;
};

export function ObservationsCsvExport({
  exportButton,
  downloadAction,
  pendingLabel,
  auditCheckbox,
  auditHint,
  modeStandard,
  modeAudit,
}: Props) {
  const [pending, setPending] = useState(false);
  const [includeAudit, setIncludeAudit] = useState(false);

  async function download() {
    setPending(true);
    try {
      const res = await exportObservationsCsvAction(includeAudit);
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

  const modeLabel = includeAudit ? modeAudit : modeStandard;

  return (
    <div className="flex w-full min-w-54 max-w-68 flex-col rounded-xl border border-border bg-surface-elevated shadow-sm sm:w-auto">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2.5">
        <span className="text-sm font-semibold text-ink">{exportButton}</span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            includeAudit
              ? "bg-accent/15 text-accent"
              : "bg-surface text-ink-muted"
          }`}
        >
          {modeLabel}
        </span>
      </div>
      <div className="space-y-3 px-3.5 py-3">
        <label
          className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-transparent px-0.5 py-0.5 transition hover:border-border/80"
          title={auditHint}
        >
          <input
            type="checkbox"
            checked={includeAudit}
            onChange={(e) => setIncludeAudit(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded border-border accent-accent"
            aria-describedby="csv-export-audit-hint"
          />
          <span className="min-w-0 leading-snug">
            <span className="block text-xs font-medium text-ink">{auditCheckbox}</span>
            <span id="csv-export-audit-hint" className="mt-0.5 block text-[11px] leading-relaxed text-ink-muted">
              {auditHint}
            </span>
          </span>
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={() => void download()}
          className="inline-flex w-full items-center justify-center rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:border-accent/40 hover:bg-surface-elevated disabled:opacity-60"
        >
          {pending ? pendingLabel : downloadAction}
        </button>
      </div>
    </div>
  );
}
