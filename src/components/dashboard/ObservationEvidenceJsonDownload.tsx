"use client";

import { useCallback, useState } from "react";

type Props = {
  fileName: string;
  json: unknown;
  downloadLabel: string;
  copiedLabel: string;
  copyLabel: string;
};

export function ObservationEvidenceJsonDownload({
  fileName,
  json,
  downloadLabel,
  copiedLabel,
  copyLabel,
}: Props) {
  const [copied, setCopied] = useState(false);

  const download = useCallback(() => {
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(href);
  }, [fileName, json]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(json, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [json]);

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={download}
        className="inline-flex rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink hover:border-accent/40"
      >
        {downloadLabel}
      </button>
      <button
        type="button"
        onClick={() => void copy()}
        className="inline-flex rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink hover:border-accent/40"
      >
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}
