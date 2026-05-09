"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";

type Phase = "ready" | "loading" | "error";

function useHydratedSnapshotImage(
  observationUrl: string,
  serverImageUrl: string | null,
  shouldFetch: boolean,
): { imageUrl: string | null; phase: Phase } {
  const [imageUrl, setImageUrl] = useState<string | null>(serverImageUrl);
  const [phase, setPhase] = useState<Phase>(() => {
    if (!shouldFetch) return "ready";
    return serverImageUrl ? "ready" : "loading";
  });

  useEffect(() => {
    setImageUrl(serverImageUrl);
    if (!shouldFetch) {
      setPhase("ready");
      return;
    }
    if (serverImageUrl) {
      setPhase("ready");
      return;
    }

    let cancelled = false;
    setPhase("loading");

    (async () => {
      try {
        const res = await fetch("/api/url-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: observationUrl }),
        });
        const data = (await res.json()) as { ok?: boolean; image?: string | null };
        if (cancelled) return;
        if (data.ok && data.image) {
          setImageUrl(data.image);
          setPhase("ready");
        } else {
          setPhase("error");
        }
      } catch {
        if (!cancelled) setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [observationUrl, serverImageUrl, shouldFetch]);

  return { imageUrl, phase };
}

type Props = {
  observationUrl: string;
  serverImageUrl: string | null;
  openUrl: string;
  /** 成功レコードで、保存画像が無いときクライアントからスナップショット API を叩く */
  fetchSnapshot: boolean;
  displayTitle: string | null;
  metaLine: string;
  locale: Locale;
};

export function ObservationSnapshotVisuals({
  observationUrl,
  serverImageUrl,
  openUrl,
  fetchSnapshot,
  displayTitle,
  metaLine,
  locale,
}: Props) {
  const t = copy[locale].snapshotVisuals;
  const { imageUrl, phase } = useHydratedSnapshotImage(
    observationUrl,
    serverImageUrl,
    fetchSnapshot,
  );

  const showImg = Boolean(imageUrl);
  const showLoading = !showImg && phase === "loading";
  const showError = !showImg && phase === "error";

  return (
    <>
      <section>
        <h2 className="font-display text-lg font-semibold text-[var(--color-ink)]">{t.snapshotTitle}</h2>
        {displayTitle ? (
          <p className="mt-3 text-sm font-medium text-[var(--color-ink)]">{displayTitle}</p>
        ) : null}
        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
          {showImg ? (
            // eslint-disable-next-line @next/next/no-img-element -- 外部 OG / Microlink CDN
            <img
              src={imageUrl!}
              alt=""
              className="max-h-[min(70vh,720px)] w-full object-cover object-top"
              loading="eager"
            />
          ) : showLoading ? (
            <div className="flex aspect-[16/10] flex-col justify-center gap-2 bg-gradient-to-br from-[#dfe9e6] to-[#c8d9d3] px-6 py-10 text-center">
              <p className="text-sm font-medium text-[var(--color-ink)]">{t.loadingTitle}</p>
              <p className="text-xs text-[var(--color-ink-muted)]">
                {t.loadingHint}
              </p>
            </div>
          ) : (
            <div className="flex aspect-[16/10] flex-col justify-center gap-2 bg-gradient-to-br from-[#dfe9e6] to-[#c8d9d3] px-6 py-10 text-center">
              <p className="text-sm font-medium text-[var(--color-ink)]">
                {showError ? t.errorTitle : t.emptyTitle}
              </p>
              <p className="text-xs text-[var(--color-ink-muted)]">
                {showError ? t.errorHint : t.emptyHint}
              </p>
              <Link
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mx-auto mt-2 text-sm font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
              >
                {t.openInNewTab}
              </Link>
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-[var(--color-ink-muted)]">{metaLine}</p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-[var(--color-ink)]">{t.diffTitle}</h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          {t.diffHint}
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
              {t.thisRecord}
            </p>
            <div className="mt-3 aspect-video overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
              {showImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl!} alt="" className="h-full w-full object-cover object-top" />
              ) : showLoading ? (
                <div className="flex h-full items-center justify-center px-4 text-center text-xs text-[var(--color-ink-muted)]">
                  {t.fetchingShort}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[var(--color-ink-muted)]">
                  {t.noImageShort}
                </div>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
              {t.compareTo}
            </p>
            <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
              {t.compareHint}
            </p>
            <Link
              href="/dashboard/observations"
              className="mt-4 inline-flex text-sm font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
            >
              {t.backToObservations}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
