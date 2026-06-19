"use client";

import { useState } from "react";
import { ObservationEvidenceShareButton } from "@/components/dashboard/ObservationEvidenceShareButton";
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
  verifyUrl?: string | null;
};

export function ObservationSnapshotBinaryPanel({
  observationId,
  locale,
  snapshotSha256,
  snapshotPhash,
  snapshotBytes,
  snapshotContentType,
  snapshotImageUrl,
  verifyUrl,
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
      <section className="rounded-2xl border border-dashed border-border bg-surface-elevated p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-ink">{t.titleIntegrity}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t.hintNoHash}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border-2 border-accent/35 bg-surface-elevated p-5 shadow-sm sm:p-6">
      <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
        {t.titleIntegrity}
      </h2>

      {snapshotImageUrl && /^https?:\/\//i.test(snapshotImageUrl) ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
          <p className="border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            {t.savedScreenshotLabel}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element -- stored evidence blob/CDN */}
          <img
            src={snapshotImageUrl}
            alt=""
            className="max-h-[min(55vh,480px)] w-full object-contain object-top"
          />
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-border bg-surface px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
          {t.sha256Label}
        </p>
        <p className="mt-2 break-all font-mono text-sm leading-relaxed text-ink">
          {snapshotSha256}
        </p>
      </div>

      <div className="mt-4 space-y-3 text-sm text-ink">
        {typeof snapshotBytes === "number" ? (
          <p className="text-xs text-ink-muted">
            {t.bytesAtCapture}: {snapshotBytes.toLocaleString()} bytes
            {snapshotContentType ? ` · ${snapshotContentType}` : ""}
          </p>
        ) : null}
        {snapshotPhash ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              {t.phashAtCapture}
            </p>
            <p className="mt-1 break-all font-mono text-xs text-ink-muted">{snapshotPhash}</p>
          </div>
        ) : (
          <p className="text-xs text-ink-muted">{t.phashMissing}</p>
        )}
        <p className="text-xs text-ink-muted">{t.hintHow}</p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <ObservationEvidenceShareButton
            fields={{
              verifyUrl: verifyUrl ?? undefined,
              sha256: snapshotSha256,
              snapshotUrl: snapshotImageUrl,
              bytes: snapshotBytes,
              contentType: snapshotContentType,
              phash: snapshotPhash,
            }}
            labels={{
              heading: t.shareHeading,
              verifyUrl: t.shareLabelVerifyUrl,
              sha256: t.sha256Label,
              snapshot: t.shareLabelSnapshot,
              fileSize: t.bytesAtCapture,
              phash: t.phashAtCapture,
            }}
            shareTitle={t.shareTitle}
            buttonLabel={t.shareButton}
            copiedLabel={t.shareCopied}
            failedLabel={t.shareFailed}
          />
          {snapshotImageUrl && /^https?:\/\//i.test(snapshotImageUrl) ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => void verify()}
                className="inline-flex rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink hover:border-accent/40 disabled:opacity-60"
              >
                {pending ? t.verifying : t.verifyButton}
              </button>
              <span className="text-xs text-ink-muted">{t.clickOnce}</span>
            </>
          ) : null}
        </div>
        {verifyUrl ? (
          <p className="text-xs text-ink-muted">{t.shareHint}</p>
        ) : null}
        {message ? <p className="text-sm text-ink">{message}</p> : null}
      </div>
    </section>
  );
}
