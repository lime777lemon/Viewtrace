"use client";

import { useState } from "react";

type Props = {
  label: string;
};

export function PrintReportButton({ label }: Props) {
  const [pending, setPending] = useState(false);

  function onClick() {
    if (pending) return;
    setPending(true);
    // Print lays out the whole page, including a tall full-page capture.
    // Leave the click task first so that work is not the interaction's next paint.
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          window.print();
        } finally {
          setPending(false);
        }
      }, 0);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-busy={pending || undefined}
      className="no-print inline-flex rounded-full border border-border bg-surface-elevated px-4 py-2 text-sm font-semibold text-ink hover:border-accent/40 disabled:opacity-60"
      disabled={pending}
    >
      {label}
    </button>
  );
}
