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
  };
}
