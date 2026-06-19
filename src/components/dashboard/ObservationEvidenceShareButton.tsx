"use client";

import { useCallback, useState } from "react";
import {
  formatObservationEvidenceShareText,
  type ObservationEvidenceShareFields,
  type ObservationEvidenceShareLabels,
} from "@/lib/observation-evidence-share";

type Props = {
  fields: ObservationEvidenceShareFields;
  labels: ObservationEvidenceShareLabels;
  shareTitle: string;
  buttonLabel: string;
  copiedLabel: string;
  failedLabel: string;
};

export function ObservationEvidenceShareButton({
  fields,
  labels,
  shareTitle,
  buttonLabel,
  copiedLabel,
  failedLabel,
}: Props) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const share = useCallback(async () => {
    setFeedback(null);
    const text = formatObservationEvidenceShareText(fields, labels);

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: shareTitle,
          text,
        });
        setFeedback(copiedLabel);
        window.setTimeout(() => setFeedback(null), 2400);
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setFeedback(copiedLabel);
    } catch {
      setFeedback(failedLabel);
    }
    window.setTimeout(() => setFeedback(null), 2400);
  }, [copiedLabel, failedLabel, fields, labels, shareTitle]);

  return (
    <button
      type="button"
      onClick={() => void share()}
      className="inline-flex rounded-full border border-accent/50 bg-accent/10 px-4 py-2 text-xs font-semibold text-ink hover:border-accent/70"
    >
      {feedback ?? buttonLabel}
    </button>
  );
}
