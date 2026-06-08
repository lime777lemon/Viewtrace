"use client";

import { useState } from "react";
import { exportObservationsCsvForWatchAction } from "@/app/actions/observations-export";

type Props = {
  url: string;
  region: string;
  label: string;
  pendingLabel: string;
  auditCheckbox: string;
  auditHint?: string;
  modeStandard: string;
  modeAudit: string;
};

export function ObservationWatchCsvExport({
  url,
  region,
  label,
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
      const res = await exportObservationsCsvForWatchAction(url, region, includeAudit);
      if (!res.ok) return;
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setPending(false);
    }
  }

  const modeLabel = includeAudit ? modeAudit : modeStandard;

  return (
    <div className="inline-flex min-w-48 flex-col rounded-xl border border-border bg-surface px-3 py-2.5 shadow-sm">
      <label
        className="flex cursor-pointer items-center gap-2"
        title={auditHint}
      >
        <input
          type="checkbox"
          checked={includeAudit}
          onChange={(e) => setIncludeAudit(e.target.checked)}
          className="size-3.5 shrink-0 rounded border-border accent-accent"
        />
        <span className="min-w-0 flex-1 text-xs text-ink-muted">{auditCheckbox}</span>
        <span
          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
            includeAudit ? "bg-accent/15 text-accent" : "bg-surface-elevated text-ink-muted"
          }`}
        >
          {modeLabel}
        </span>
      </label>
      <button
        type="button"
        disabled={pending}
        onClick={() => void download()}
        className="mt-2 inline-flex w-full items-center justify-center rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-accent/40 disabled:opacity-60"
      >
        {pending ? pendingLabel : label}
      </button>
    </div>
  );
}
