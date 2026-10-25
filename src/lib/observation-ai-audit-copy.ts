import type { AiAuditEvidenceId, AiAuditImpact } from "@/lib/observation-ai-audit";

export type ObservationAiAuditCopy = {
  title: string;
  badge: string;
  hint: string;
  empty: string;
  scope: string;
  itemVisible: string;
  itemCompare: string;
  itemPageNotes: string;
  generate: string;
  generating: string;
  regenerate: string;
  failed: string;
  kindVisible: string;
  kindRegionTime: string;
  kindPage: string;
  sourceRecord: string;
  sourceAi: string;
  shareDisclaimer: string;
  generatedAt: string;
  onPdfHint: string;
  whatChanged: string;
  impact: string;
  impactHigh: string;
  impactMedium: string;
  impactLow: string;
  evidence: string;
  recommendedCheck: string;
  evidenceScreenshot: string;
  evidenceDetectedFacts: string;
  evidenceTitle: string;
  evidenceDescription: string;
  evidenceCanonical: string;
  evidenceNoindex: string;
  evidenceRobots: string;
  evidenceOg: string;
  evidenceHttp: string;
  evidenceHtmlLang: string;
  evidenceGeo: string;
  evidenceFinalUrl: string;
  evidenceInteraction: string;
  mixHint: string;
};

export function observationAiAuditCopyFrom(t: {
  aiAuditTitle: string;
  aiAuditBadge: string;
  aiAuditHint: string;
  aiAuditEmpty: string;
  aiAuditScope: string;
  aiAuditItemVisible: string;
  aiAuditItemCompare: string;
  aiAuditItemPageNotes: string;
  aiAuditGenerate: string;
  aiAuditGenerating: string;
  aiAuditRegenerate: string;
  aiAuditFailed: string;
  aiAuditKindVisible: string;
  aiAuditKindRegionTime: string;
  aiAuditKindPage: string;
  aiAuditSourceRecord: string;
  aiAuditSourceAi: string;
  aiAuditShareDisclaimer: string;
  aiAuditGeneratedAt: string;
  aiAuditOnPdfHint: string;
  aiAuditWhatChanged: string;
  aiAuditImpact: string;
  aiAuditImpactHigh: string;
  aiAuditImpactMedium: string;
  aiAuditImpactLow: string;
  aiAuditEvidence: string;
  aiAuditRecommendedCheck: string;
  aiAuditEvidenceScreenshot: string;
  aiAuditEvidenceDetectedFacts: string;
  aiAuditEvidenceTitle: string;
  aiAuditEvidenceDescription: string;
  aiAuditEvidenceCanonical: string;
  aiAuditEvidenceNoindex: string;
  aiAuditEvidenceRobots: string;
  aiAuditEvidenceOg: string;
  aiAuditEvidenceHttp: string;
  aiAuditEvidenceHtmlLang: string;
  aiAuditEvidenceGeo: string;
  aiAuditEvidenceFinalUrl: string;
  aiAuditEvidenceInteraction: string;
  aiAuditMixHint: string;
}): ObservationAiAuditCopy {
  return {
    title: t.aiAuditTitle,
    badge: t.aiAuditBadge,
    hint: t.aiAuditHint,
    empty: t.aiAuditEmpty,
    scope: t.aiAuditScope,
    itemVisible: t.aiAuditItemVisible,
    itemCompare: t.aiAuditItemCompare,
    itemPageNotes: t.aiAuditItemPageNotes,
    generate: t.aiAuditGenerate,
    generating: t.aiAuditGenerating,
    regenerate: t.aiAuditRegenerate,
    failed: t.aiAuditFailed,
    kindVisible: t.aiAuditKindVisible,
    kindRegionTime: t.aiAuditKindRegionTime,
    kindPage: t.aiAuditKindPage,
    sourceRecord: t.aiAuditSourceRecord,
    sourceAi: t.aiAuditSourceAi,
    shareDisclaimer: t.aiAuditShareDisclaimer,
    generatedAt: t.aiAuditGeneratedAt,
    onPdfHint: t.aiAuditOnPdfHint,
    whatChanged: t.aiAuditWhatChanged,
    impact: t.aiAuditImpact,
    impactHigh: t.aiAuditImpactHigh,
    impactMedium: t.aiAuditImpactMedium,
    impactLow: t.aiAuditImpactLow,
    evidence: t.aiAuditEvidence,
    recommendedCheck: t.aiAuditRecommendedCheck,
    evidenceScreenshot: t.aiAuditEvidenceScreenshot,
    evidenceDetectedFacts: t.aiAuditEvidenceDetectedFacts,
    evidenceTitle: t.aiAuditEvidenceTitle,
    evidenceDescription: t.aiAuditEvidenceDescription,
    evidenceCanonical: t.aiAuditEvidenceCanonical,
    evidenceNoindex: t.aiAuditEvidenceNoindex,
    evidenceRobots: t.aiAuditEvidenceRobots,
    evidenceOg: t.aiAuditEvidenceOg,
    evidenceHttp: t.aiAuditEvidenceHttp,
    evidenceHtmlLang: t.aiAuditEvidenceHtmlLang,
    evidenceGeo: t.aiAuditEvidenceGeo,
    evidenceFinalUrl: t.aiAuditEvidenceFinalUrl,
    evidenceInteraction: t.aiAuditEvidenceInteraction,
    mixHint: t.aiAuditMixHint,
  };
}

export function aiAuditImpactLabel(
  copy: Pick<ObservationAiAuditCopy, "impactHigh" | "impactMedium" | "impactLow">,
  impact: AiAuditImpact,
): string {
  if (impact === "high") return copy.impactHigh;
  if (impact === "medium") return copy.impactMedium;
  return copy.impactLow;
}

export function aiAuditEvidenceLabel(
  copy: Pick<
    ObservationAiAuditCopy,
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
    | "evidenceInteraction"
  >,
  evidence: AiAuditEvidenceId,
): string {
  switch (evidence) {
    case "screenshot":
      return copy.evidenceScreenshot;
    case "detected_facts":
      return copy.evidenceDetectedFacts;
    case "title":
      return copy.evidenceTitle;
    case "description":
      return copy.evidenceDescription;
    case "canonical":
      return copy.evidenceCanonical;
    case "noindex":
      return copy.evidenceNoindex;
    case "robots":
      return copy.evidenceRobots;
    case "og":
      return copy.evidenceOg;
    case "http_status":
      return copy.evidenceHttp;
    case "html_lang":
      return copy.evidenceHtmlLang;
    case "geo":
      return copy.evidenceGeo;
    case "final_url":
      return copy.evidenceFinalUrl;
    case "interaction":
      return copy.evidenceInteraction;
  }
}
