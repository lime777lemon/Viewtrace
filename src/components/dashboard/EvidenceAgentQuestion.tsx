"use client";

import { useState } from "react";
import { askEvidenceAgentAction } from "@/app/actions/evidence-agent";
import type { AiAuditEvidenceId } from "@/lib/observation-ai-audit";

type Props = {
  observationId: string;
  locale: "ja" | "en";
  askLabel: string;
  askingLabel: string;
  placeholder: string;
  inferenceLabel: string;
  recordLabel: string;
  evidenceLabel: string;
  evidenceNames: Record<AiAuditEvidenceId, string>;
  errors: {
    unauthorized: string;
    plan: string;
    quota: string;
    invalid: string;
    not_found: string;
    failed: string;
  };
};

export function EvidenceAgentQuestion({
  observationId,
  locale,
  askLabel,
  askingLabel,
  placeholder,
  inferenceLabel,
  recordLabel,
  evidenceLabel,
  evidenceNames,
  errors,
}: Props) {
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [source, setSource] = useState<"ai" | "record" | null>(null);
  const [evidence, setEvidence] = useState<AiAuditEvidenceId[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await askEvidenceAgentAction(observationId, question, locale);
      if (!result.ok) {
        setAnswer(null);
        setSource(null);
        setEvidence([]);
        setError(errors[result.error]);
        return;
      }
      setAnswer(result.answer);
      setSource(result.source);
      setEvidence(result.evidence);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3">
      <label className="block text-sm text-ink">
        <span className="sr-only">{placeholder}</span>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={500}
          rows={2}
          placeholder={placeholder}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted"
        />
      </label>
      <button
        type="submit"
        disabled={pending || question.trim().length < 1}
        className="inline-flex rounded-full border border-border bg-surface-elevated px-4 py-2 text-sm font-semibold text-ink hover:border-accent/40 disabled:opacity-60"
      >
        {pending ? askingLabel : askLabel}
      </button>
      {error ? <p className="text-sm text-ink">{error}</p> : null}
      {answer && source ? (
        <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {source === "ai" ? inferenceLabel : recordLabel}
          </p>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed">{answer}</p>
          {evidence.length > 0 ? (
            <p className="mt-2 text-xs text-ink-muted">
              {evidenceLabel}: {evidence.map((id) => evidenceNames[id]).join(" · ")}
            </p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
