"use client";

import { useState, useTransition } from "react";
import { generateObservationAiAuditAction } from "@/app/actions/observation-ai-audit";
import type { ObservationAiAuditCopy } from "@/lib/observation-ai-audit-copy";
import type { AiAuditNoteKind, ObservationAiAudit } from "@/lib/observation-ai-audit";

type Props = {
  copy: ObservationAiAuditCopy;
  observationId?: string;
  locale?: "ja" | "en";
  initialAudit?: ObservationAiAudit | null;
  previewAudit?: ObservationAiAudit | null;
};

export function ObservationAiAuditPanel({
  copy,
  observationId,
  locale = "ja",
  initialAudit = null,
  previewAudit = null,
}: Props) {
  const [audit, setAudit] = useState<ObservationAiAudit | null>(initialAudit ?? previewAudit);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canGenerate = Boolean(observationId);

  const kindLabel = (kind: AiAuditNoteKind): string => {
    if (kind === "visible") return copy.kindVisible;
    if (kind === "region_time") return copy.kindRegionTime;
    return copy.kindPage;
  };

  const run = () => {
    if (!observationId) return;
    setError(null);
    startTransition(async () => {
      const result = await generateObservationAiAuditAction(observationId, locale);
      if (!result.ok) {
        setError(copy.failed);
        return;
      }
      setAudit(result.audit);
    });
  };

  return (
    <section
      aria-labelledby="observation-ai-audit-heading"
      className="rounded-xl border border-dashed border-border bg-surface-elevated p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2
          id="observation-ai-audit-heading"
          className="font-display text-lg font-semibold text-ink"
        >
          {copy.title}
        </h2>
        <p className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
          {copy.badge}
        </p>
        {audit ? (
          <p className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
            {audit.source === "ai" ? copy.sourceAi : copy.sourceRecord}
          </p>
        ) : null}
      </div>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{copy.hint}</p>

      {audit ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-ink">{audit.summary}</p>
          {audit.notes.length ? (
            <ul className="space-y-2">
              {audit.notes.map((note) => (
                <li
                  key={`${note.kind}:${note.text}`}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    {kindLabel(note.kind)}
                  </p>
                  <p className="mt-1">{note.text}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm text-ink">{copy.empty}</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {copy.scope}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">
            <li>{copy.itemVisible}</li>
            <li>{copy.itemCompare}</li>
            <li>{copy.itemPageNotes}</li>
          </ul>
        </>
      )}

      {error ? (
        <p role="alert" className="mt-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {canGenerate ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={run}
            disabled={pending}
            className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? copy.generating : audit ? copy.regenerate : copy.generate}
          </button>
        </div>
      ) : null}
    </section>
  );
}
