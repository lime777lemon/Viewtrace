"use client";

import { useState } from "react";
import { updateObservationAnnotationsAction } from "@/app/actions/update-observation-annotations";
import type { ObservationReviewStatus } from "@/lib/demo/observations";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";

type Props = {
  observationId: string;
  locale: Locale;
  initialNote?: string;
  initialTags?: string[];
  initialFolder?: string;
  initialReviewStatus?: ObservationReviewStatus;
};

const REVIEW_VALUES = ["", "open", "reviewed", "archived", "flagged"] as const;

export function ObservationAnnotationPanel({
  observationId,
  locale,
  initialNote = "",
  initialTags = [],
  initialFolder = "",
  initialReviewStatus,
}: Props) {
  const t = copy[locale].observationAnnotation;
  const [note, setNote] = useState(initialNote);
  const [tagsText, setTagsText] = useState(initialTags.join(", "));
  const [folder, setFolder] = useState(initialFolder);
  const [reviewStatus, setReviewStatus] = useState<ObservationReviewStatus | "">(
    initialReviewStatus ?? "",
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setMessage(null);
    const tags = tagsText
      .split(/[,、]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const r = await updateObservationAnnotationsAction(observationId, {
      note,
      tags,
      folder,
      reviewStatus,
    });
    setPending(false);
    if (!r.ok) {
      setMessage(t.saveFailed);
      return;
    }
    setMessage(t.saveOk);
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-elevated p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold tracking-tight text-ink">{t.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t.hint}</p>

      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {t.noteLabel}
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={500}
            className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink"
            placeholder={t.notePlaceholder}
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {t.tagsLabel}
          </span>
          <input
            type="text"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink"
            placeholder={t.tagsPlaceholder}
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {t.folderLabel}
          </span>
          <input
            type="text"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            maxLength={120}
            className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink"
            placeholder={t.folderPlaceholder}
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {t.statusLabel}
          </span>
          <select
            value={reviewStatus}
            onChange={(e) => setReviewStatus(e.target.value as ObservationReviewStatus | "")}
            className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink"
          >
            {REVIEW_VALUES.map((value) => (
              <option key={value || "unset"} value={value}>
                {value === ""
                  ? t.reviewOptions.unset
                  : t.reviewOptions[value as ObservationReviewStatus]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink-muted">{t.statusHint}</p>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => void save()}
          className="inline-flex rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? t.saving : t.save}
        </button>
        {message ? <span className="text-sm text-ink-muted">{message}</span> : null}
      </div>
    </section>
  );
}
