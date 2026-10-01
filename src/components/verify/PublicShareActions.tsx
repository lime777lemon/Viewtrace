"use client";

import { useCallback, useState } from "react";
import { PrintReportButton } from "@/components/dashboard/PrintReportButton";

type Props = {
  copyLabel: string;
  copiedLabel: string;
  failedLabel: string;
  printLabel: string;
};

export function PublicShareActions({ copyLabel, copiedLabel, failedLabel, printLabel }: Props) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const copy = useCallback(async () => {
    setFeedback(null);
    try {
      await navigator.clipboard.writeText(window.location.href);
      setFeedback(copiedLabel);
    } catch {
      setFeedback(failedLabel);
    }
    window.setTimeout(() => setFeedback(null), 2400);
  }, [copiedLabel, failedLabel]);

  return (
    <div className="no-print mt-6 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => void copy()}
        className="inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
      >
        {feedback ?? copyLabel}
      </button>
      <PrintReportButton label={printLabel} />
    </div>
  );
}
