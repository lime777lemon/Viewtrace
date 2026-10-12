"use client";

import { useState } from "react";
import { deleteObservationWatchAction } from "@/app/actions/observation-watches";

const deleteButtonClass =
  "cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-ink-muted/50 hover:bg-surface hover:shadow-sm active:translate-y-px";

type Props = {
  watchId: string;
  label: string;
  confirmLabel: string;
  cancelLabel: string;
};

/** Isolated island: two-step delete so `window.confirm` cannot block INP. */
export function AutoObservationDeleteForm({ watchId, label, confirmLabel, cancelLabel }: Props) {
  const [armed, setArmed] = useState(false);

  return (
    <form action={deleteObservationWatchAction} className="shrink-0">
      <input type="hidden" name="watch_id" value={watchId} />
      {armed ? (
        <div className="flex max-w-xs flex-col items-end gap-1.5 sm:max-w-none sm:flex-row sm:items-center">
          <p className="text-right text-xs text-ink-muted">{confirmLabel}</p>
          <button type="submit" className={deleteButtonClass}>
            {label}
          </button>
          <button
            type="button"
            className="cursor-pointer px-1 text-xs font-medium text-ink-muted hover:text-ink"
            onClick={() => setArmed(false)}
          >
            {cancelLabel}
          </button>
        </div>
      ) : (
        <button type="button" className={deleteButtonClass} onClick={() => setArmed(true)}>
          {label}
        </button>
      )}
    </form>
  );
}
