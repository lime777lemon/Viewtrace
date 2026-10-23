import { ObservationAiAuditFindings } from "@/components/dashboard/ObservationAiAuditFindings";
import type { ObservationAiAuditCopy } from "@/lib/observation-ai-audit-copy";
import { presentObservationAiAudit, type ObservationAiAudit } from "@/lib/observation-ai-audit";
import type { Locale } from "@/lib/i18n";

type ReadoutCopy = ObservationAiAuditCopy;

export function ObservationAiAuditReadout({
  copy,
  audit,
  generatedAtLabel,
  locale = "en",
}: {
  copy: ReadoutCopy;
  audit: ObservationAiAudit;
  generatedAtLabel: string;
  locale?: Locale;
}) {
  const shown = presentObservationAiAudit(audit, locale);
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
          {shown.source === "ai" ? copy.sourceAi : copy.sourceRecord}
        </p>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{copy.shareDisclaimer}</p>
      <p className="mt-1 text-xs text-ink-muted">
        {copy.generatedAt} {generatedAtLabel}
      </p>
      <p className="mt-3 text-sm text-ink">{shown.summary}</p>
      {shown.notes.length ? (
        <div className="mt-3">
          <ObservationAiAuditFindings copy={copy} notes={shown.notes} />
        </div>
      ) : null}
    </section>
  );
}
