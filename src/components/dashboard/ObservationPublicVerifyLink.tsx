"use client";

import { useCallback, useState } from "react";

type Props = {
  verifyUrl: string;
  title: string;
  copyButton: string;
  copiedLabel: string;
  failedLabel: string;
};

export function ObservationPublicVerifyLink({
  verifyUrl,
  title,
  copyButton,
  copiedLabel,
  failedLabel,
}: Props) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const copy = useCallback(async () => {
    setFeedback(null);
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setFeedback(copiedLabel);
    } catch {
      setFeedback(failedLabel);
    }
    window.setTimeout(() => setFeedback(null), 2400);
  }, [copiedLabel, failedLabel, verifyUrl]);

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4 sm:col-span-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{title}</p>
      <p className="mt-2 break-all font-mono text-xs text-ink">
        <a href={verifyUrl} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
          {verifyUrl}
        </a>
      </p>
      <button
        type="button"
        onClick={() => void copy()}
        className="mt-3 inline-flex rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink hover:border-accent/40"
      >
        {feedback ?? copyButton}
      </button>
    </div>
  );
}
