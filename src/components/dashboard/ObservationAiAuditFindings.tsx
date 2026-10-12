import { ObservationFactCountBar } from "@/components/dashboard/ObservationFactCountBar";
import {
  aiAuditEvidenceLabel,
  aiAuditImpactLabel,
  type ObservationAiAuditCopy,
} from "@/lib/observation-ai-audit-copy";
import {
  auditEvidenceHref,
  isStructuredFinding,
  type AiAuditImpact,
  type AiAuditNote,
  type AiAuditNoteKind,
} from "@/lib/observation-ai-audit";

type Props = {
  copy: Pick<
    ObservationAiAuditCopy,
    | "kindVisible"
    | "kindRegionTime"
    | "kindPage"
    | "whatChanged"
    | "impact"
    | "impactHigh"
    | "impactMedium"
    | "impactLow"
    | "evidence"
    | "recommendedCheck"
    | "evidenceScreenshot"
    | "evidenceDetectedFacts"
    | "evidenceTitle"
    | "evidenceDescription"
    | "evidenceCanonical"
    | "evidenceNoindex"
    | "evidenceRobots"
    | "evidenceOg"
    | "evidenceHttp"
    | "evidenceHtmlLang"
    | "evidenceGeo"
    | "evidenceFinalUrl"
    | "mixHint"
  >;
  notes: AiAuditNote[];
  linkEvidence?: boolean;
};

function kindLabel(kind: AiAuditNoteKind, copy: Props["copy"]): string {
  if (kind === "visible") return copy.kindVisible;
  if (kind === "region_time") return copy.kindRegionTime;
  return copy.kindPage;
}

function impactClass(impact: AiAuditImpact): string {
  if (impact === "high") return "text-accent";
  if (impact === "medium") return "text-warn";
  return "text-ink-muted";
}

function findingKey(note: AiAuditNote, index: number): string {
  return `${note.kind}:${note.evidence ?? ""}:${note.text}:${index}`;
}

export function ObservationAiAuditFindings({ copy, notes, linkEvidence = false }: Props) {
  if (!notes.length) return null;

  const high = notes.filter((note) => note.impact === "high").length;
  const medium = notes.filter((note) => note.impact === "medium").length;
  const low = notes.filter((note) => note.impact === "low").length;
  const showMix = high + medium + low > 0;

  return (
    <div className="space-y-3">
      {showMix ? (
        <div>
          <ObservationFactCountBar
            ariaLabel={copy.mixHint}
            segments={[
              { key: "high", count: high, label: copy.impactHigh, color: "#1a6b5c" },
              { key: "medium", count: medium, label: copy.impactMedium, color: "#8b5a2b" },
              { key: "low", count: low, label: copy.impactLow, color: "#3d4a63" },
            ]}
          />
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">{copy.mixHint}</p>
        </div>
      ) : null}
    <ul className="space-y-2">
      {notes.map((note, index) => {
        if (!isStructuredFinding(note) || !note.impact || !note.evidence || !note.check) {
          return (
            <li
              key={findingKey(note, index)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {kindLabel(note.kind, copy)}
              </p>
              <p className="mt-1">{note.text}</p>
            </li>
          );
        }

        const evidenceLabel = aiAuditEvidenceLabel(copy, note.evidence);
        const evidenceBody = linkEvidence ? (
          <a
            href={auditEvidenceHref(note.evidence)}
            className="font-semibold text-accent hover:text-accent-hover"
          >
            {evidenceLabel}
          </a>
        ) : (
          <span className="font-semibold text-ink">{evidenceLabel}</span>
        );

        return (
          <li
            key={findingKey(note, index)}
            className="rounded-lg border border-border bg-surface px-3 py-3 text-sm text-ink"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {kindLabel(note.kind, copy)}
              </p>
              <p className={`text-xs font-semibold uppercase tracking-wider ${impactClass(note.impact)}`}>
                {copy.impact} {aiAuditImpactLabel(copy, note.impact)}
              </p>
            </div>
            <p className="mt-2 text-xs font-semibold text-ink-muted">{copy.whatChanged}</p>
            <p className="mt-0.5">{note.text}</p>
            <p className="mt-2 text-xs font-semibold text-ink-muted">{copy.recommendedCheck}</p>
            <p className="mt-0.5">{note.check}</p>
            <p className="mt-2 text-xs text-ink-muted">
              {copy.evidence}: {evidenceBody}
            </p>
          </li>
        );
      })}
    </ul>
    </div>
  );
}
