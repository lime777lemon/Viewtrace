"use client";

import { useState } from "react";
import { verifyObservationSnapshotBinaryAction } from "@/app/actions/verify-observation-snapshot";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";

type Props = {
  observationId: string;
  locale: Locale;
  snapshotSha256?: string;
  snapshotPhash?: string;
  snapshotBytes?: number;
  snapshotContentType?: string;
  snapshotImageUrl?: string;
};

export function ObservationSnapshotBinaryPanel({
  observationId,
  locale,
  snapshotSha256,
  snapshotPhash,
  snapshotBytes,
  snapshotContentType,
  snapshotImageUrl,
}: Props) {
  const t = copy[locale].snapshotBinary;
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function verify() {
    setPending(true);
    setMessage(null);
    try {
      const r = await verifyObservationSnapshotBinaryAction(observationId);
      if (!r.ok) {
        const map: Record<string, string> = {
          unauthorized: t.errUnauthorized,
          not_found: t.errNotFound,
          no_hash: t.errNoHash,
          no_url: t.errNoUrl,
          fetch_failed: t.errFetchFailed,
          too_large: t.errTooLarge,
        };
        setMessage(map[r.error] ?? t.errGeneric);
        return;
      }

      const distNote =
        r.phashDistance !== null
          ? `${t.distNotePrefix}${r.phashDistance}${t.distNoteSuffix}`
          : "";

      switch (r.verdict) {
        case "exact":
          setMessage(`${t.verdictExact}${distNote}`.trim());
          break;
        case "visual_strong":
          setMessage(`${t.verdictStrong}${distNote}`.trim());
          break;
        case "visual_weak":
          setMessage(`${t.verdictWeak}${distNote}`.trim());
          break;
        case "different":
          setMessage(`${t.verdictDifferent}${distNote}`.trim());
          break;
        case "unverified":
          setMessage(t.verdictUnverified);
          break;
        default:
          setMessage(t.verdictUnknown);
      }
    } finally {
      setPending(false);
    }
  }

  if (!snapshotSha256) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 sm:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
          {t.titleBinary}
        </p>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          {t.hintNoHash}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 sm:col-span-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
        {t.titleIntegrity}
      </p>
      <div className="mt-1 space-y-3 text-sm text-[var(--color-ink)]">
        <p className="text-xs text-[var(--color-ink-muted)]">
          {t.hintHow}
        </p>
        {typeof snapshotBytes === "number" ? (
          <p className="text-xs text-[var(--color-ink-muted)]">
            {t.bytesAtCapture}: {snapshotBytes.toLocaleString()} bytes
            {snapshotContentType ? ` · ${snapshotContentType}` : ""}
          </p>
        ) : null}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            SHA-256
          </p>
          <p className="break-all font-mono text-xs text-[var(--color-ink-muted)]">{snapshotSha256}</p>
        </div>
        {snapshotPhash ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
              {t.phashAtCapture}
            </p>
            <p className="break-all font-mono text-xs text-[var(--color-ink-muted)]">{snapshotPhash}</p>
          </div>
        ) : (
          <p className="text-xs text-[var(--color-ink-muted)]">
            {t.phashMissing}
          </p>
        )}
        {snapshotImageUrl && /^https?:\/\//i.test(snapshotImageUrl) ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => void verify()}
              className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent)]/40 disabled:opacity-60"
            >
              {pending ? t.verifying : t.verifyButton}
            </button>
            <span className="text-xs text-[var(--color-ink-muted)]">{t.clickOnce}</span>
          </div>
        ) : null}
        {message ? <p className="text-sm text-[var(--color-ink)]">{message}</p> : null}
      </div>
    </div>
  );
}
