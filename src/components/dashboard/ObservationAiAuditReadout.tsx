import type { ObservationAiAuditCopy } from "@/lib/observation-ai-audit-copy";
import type { AiAuditNoteKind, ObservationAiAudit } from "@/lib/observation-ai-audit";

type ReadoutCopy = Pick<
  ObservationAiAuditCopy,
  | "title"
  | "badge"
  | "kindVisible"
  | "kindRegionTime"
  | "kindPage"
  | "sourceRecord"
  | "sourceAi"
  | "shareDisclaimer"
  | "generatedAt"
>;

export function ObservationAiAuditReadout({
  copy,
  audit,
  generatedAtLabel,
}: {
  copy: ReadoutCopy;
  audit: ObservationAiAudit;
  generatedAtLabel: string;
}) {
  const kindLabel = (kind: AiAuditNoteKind): string => {
    if (kind === "visible") return copy.kindVisible;
    if (kind === "region_time") return copy.kindRegionTime;
    return copy.kindPage;
  };

  return (
    <section aria-labelledby="observation-ai-audit-readout-heading">
      <div className="flex flex-wrap items-center gap-2">
        <h2
          id="observation-ai-audit-readout-heading"
          className="font-display text-lg font-semibold text-ink"
        >
          {copy.title}
        </h2>
        <p className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
          {copy.badge}
        </p>
        <p className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
          {audit.source === "ai" ? copy.sourceAi : copy.sourceRecord}
        </p>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{copy.shareDisclaimer}</p>
      <p className="mt-1 text-xs text-ink-muted">
        {copy.generatedAt} {generatedAtLabel}
      </p>
      <p className="mt-3 text-sm text-ink">{audit.summary}</p>
      {audit.notes.length ? (
        <ul className="mt-3 space-y-2">
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
    </section>
  );
}
