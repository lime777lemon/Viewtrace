"use client";

import { useCallback, useState } from "react";
import { buildObservationRecordOpenUrls } from "@/lib/observation-record-open-urls";

type Props = {
  observationId: string;
  label: string;
  copiedLabel: string;
  failedLabel: string;
};

export function ObservationRecordShareButton({
  observationId,
  label,
  copiedLabel,
  failedLabel,
}: Props) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const copyLink = useCallback(async () => {
    setFeedback(null);
    const origin = window.location.origin;
    const { openUrl } = buildObservationRecordOpenUrls(origin, observationId);
    try {
      await navigator.clipboard.writeText(openUrl);
      setFeedback(copiedLabel);
    } catch {
      setFeedback(failedLabel);
    }
    window.setTimeout(() => setFeedback(null), 2400);
  }, [copiedLabel, failedLabel, observationId]);

  return (
    <button
      type="button"
      onClick={() => void copyLink()}
      className="inline-flex shrink-0 items-center rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-accent/40"
    >
      {feedback ?? label}
    </button>
  );
}
