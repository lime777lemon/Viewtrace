"use client";

import { useState } from "react";
import {
  compareObservationLivePageAction,
  type LivePageCompareVerdict,
} from "@/app/actions/compare-observation-live-page";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";

type Props = {
  observationId: string;
  locale: Locale;
  regionLabel: string;
  canCompare: boolean;
};

export function ObservationLivePageComparePanel({
  observationId,
  locale,
  regionLabel,
  canCompare,
}: Props) {
  const t = copy[locale].snapshotLiveCompare;
  const [pending, setPending] = useState(false);
  const [ratioLabel, setRatioLabel] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<LivePageCompareVerdict | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function compare() {
    setPending(true);
    setRatioLabel(null);
    setVerdict(null);
    setMessage(null);
    try {
      const r = await compareObservationLivePageAction(observationId);
      if (!r.ok) {
        const map: Record<string, string> = {
          unauthorized: t.errUnauthorized,
          not_found: t.errNotFound,
          not_success: t.errNotSuccess,
          no_snapshot: t.errNoSnapshot,
          no_region: t.errNoRegion,
          browserless_not_configured: t.errCaptureUnavailable,
          forbidden_host: t.errForbiddenHost,
          capture_failed: t.errCaptureFailed,
          diff_failed: t.errDiffFailed,
        };
        setMessage(map[r.error] ?? t.errGeneric);
        return;
      }

      setRatioLabel(r.ratioLabel);
      setVerdict(r.verdict);
      const verdictMap: Record<LivePageCompareVerdict, string> = {
        unchanged: t.verdictUnchanged,
        minor: t.verdictMinor,
        changed: t.verdictChanged,
      };
      setMessage(verdictMap[r.verdict]);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-dashed border-border bg-surface/60 p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold tracking-tight text-ink">{t.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t.hint}</p>
      <p className="mt-2 text-xs text-ink-muted">
        {t.regionNote.replace("{region}", regionLabel)}
      </p>

      {canCompare ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => void compare()}
            className="inline-flex rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink hover:border-accent/40 disabled:opacity-60"
          >
            {pending ? t.comparing : t.compareButton}
          </button>
          <span className="text-xs text-ink-muted">{t.clickOnce}</span>
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink-muted">{t.unavailable}</p>
      )}

      {pending ? (
        <p className="mt-4 text-sm text-ink-muted">{t.comparingHint}</p>
      ) : null}

      {ratioLabel ? (
        <p className="mt-4 rounded-full border border-accent/30 bg-accent-soft/40 px-3 py-1 text-xs font-semibold text-accent w-fit">
          {t.ratioLabel}: {ratioLabel}
        </p>
      ) : null}

      {message ? (
        <p
          className={`mt-3 text-sm ${
            verdict === "changed"
              ? "font-medium text-amber-900 dark:text-amber-100"
              : "text-ink"
          }`}
        >
          {message}
        </p>
      ) : null}

      <p className="mt-4 text-xs leading-relaxed text-ink-muted">{t.notFileProof}</p>
    </section>
  );
}
