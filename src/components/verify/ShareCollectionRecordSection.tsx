"use client";

import { useId, useState, type ReactNode } from "react";

type Props = {
  heading: string;
  capturedLabel: string;
  regionLabel: string;
  url: string;
  showLabel: string;
  hideLabel: string;
  children: ReactNode;
};

export function ShareCollectionRecordSection({
  heading,
  capturedLabel,
  regionLabel,
  url,
  showLabel,
  hideLabel,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <section className="rounded-2xl border border-border bg-surface-elevated">
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4 sm:px-6">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{heading}</p>
          <p className="text-sm font-medium text-ink">{capturedLabel}</p>
          {regionLabel ? <p className="text-sm text-ink-muted">{regionLabel}</p> : null}
          <p className="break-all font-mono text-xs text-ink">{url}</p>
        </div>
        <button
          type="button"
          className="no-print inline-flex shrink-0 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink hover:border-accent/40"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? hideLabel : showLabel}
        </button>
      </div>
      <div id={panelId} className={open ? "border-t border-border px-2 py-4 sm:px-4" : "hidden print:block"}>
        {children}
      </div>
    </section>
  );
}
