"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";

type Phase = "ready" | "loading" | "error";

export type ComparePreviousSnapshot = {
  id: string;
  capturedAtLabel: string;
  snapshotImageUrl: string;
};

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
  comparePrevious?: ComparePreviousSnapshot | null;
};

export function ObservationSnapshotVisuals({
  observationUrl,
  serverImageUrl,
  openUrl,
  fetchSnapshot,
  displayTitle,
  metaLine,
  locale,
  comparePrevious = null,
}: Props) {
  const t = copy[locale].snapshotVisuals;
  const { imageUrl, phase } = useHydratedSnapshotImage(
    observationUrl,
    serverImageUrl,
    fetchSnapshot,
  );

  const [diffRatioLabel, setDiffRatioLabel] = useState<string | null>(null);
  const [diffPhase, setDiffPhase] = useState<"idle" | "loading" | "error">("idle");

  const currentForDiff = serverImageUrl ?? imageUrl;
  const previousUrl = comparePrevious?.snapshotImageUrl ?? null;

  useEffect(() => {
    if (!currentForDiff || !previousUrl) {
      setDiffRatioLabel(null);
      setDiffPhase("idle");
      return;
    }

    let cancelled = false;
    setDiffPhase("loading");
    setDiffRatioLabel(null);

    (async () => {
      try {
        const res = await fetch("/api/observations/snapshot-diff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentUrl: currentForDiff, previousUrl }),
        });
        const data = (await res.json()) as { ok?: boolean; ratioLabel?: string };
        if (cancelled) return;
        if (data.ok && data.ratioLabel) {
          setDiffRatioLabel(data.ratioLabel);
          setDiffPhase("idle");
        } else {
          setDiffPhase("error");
        }
      } catch {
        if (!cancelled) setDiffPhase("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentForDiff, previousUrl]);

  const showImg = Boolean(imageUrl);
  const showLoading = !showImg && phase === "loading";
  const showError = !showImg && phase === "error";

  return (
    <>
      <section>
        <h2 className="font-display text-lg font-semibold text-ink">{t.snapshotTitle}</h2>
        {displayTitle ? (
          <p className="mt-3 text-sm font-medium text-ink">{displayTitle}</p>
        ) : null}
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface-elevated">
          {showImg ? (
            // eslint-disable-next-line @next/next/no-img-element -- 外部 OG / Microlink CDN
            <img
              src={imageUrl!}
              alt=""
              className="max-h-[min(70vh,720px)] w-full object-cover object-top"
              loading="eager"
            />
          ) : showLoading ? (
            <div className="flex aspect-16/10 flex-col justify-center gap-2 bg-linear-to-br from-[#dfe9e6] to-[#c8d9d3] px-6 py-10 text-center">
              <p className="text-sm font-medium text-ink">{t.loadingTitle}</p>
              <p className="text-xs text-ink-muted">{t.loadingHint}</p>
            </div>
          ) : (
            <div className="flex aspect-16/10 flex-col justify-center gap-2 bg-linear-to-br from-[#dfe9e6] to-[#c8d9d3] px-6 py-10 text-center">
              <p className="text-sm font-medium text-ink">
                {showError ? t.errorTitle : t.emptyTitle}
              </p>
              <p className="text-xs text-ink-muted">
                {showError ? t.errorHint : t.emptyHint}
              </p>
              <Link
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mx-auto mt-2 text-sm font-semibold text-accent hover:text-accent-hover"
              >
                {t.openInNewTab}
              </Link>
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-ink-muted">{metaLine}</p>
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-ink">{t.diffTitle}</h2>
          {diffRatioLabel ? (
            <p className="rounded-full border border-accent/30 bg-accent-soft/40 px-3 py-1 text-xs font-semibold text-accent">
              {t.diffRatioLabel}: {diffRatioLabel}
            </p>
          ) : diffPhase === "loading" ? (
            <p className="text-xs text-ink-muted">{t.diffComputing}</p>
          ) : diffPhase === "error" ? (
            <p className="text-xs text-amber-800 dark:text-amber-200">{t.diffFailed}</p>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-ink-muted">{t.diffHint}</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface-elevated p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              {t.thisRecord}
            </p>
            <div className="mt-3 aspect-video overflow-hidden rounded-lg border border-border bg-surface">
              {showImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl!} alt="" className="h-full w-full object-cover object-top" />
              ) : showLoading ? (
                <div className="flex h-full items-center justify-center px-4 text-center text-xs text-ink-muted">
                  {t.fetchingShort}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-ink-muted">
                  {t.noImageShort}
                </div>
              )}
            </div>
          </div>
          <div
            className={`rounded-xl border p-4 ${
              comparePrevious
                ? "border-border bg-surface-elevated"
                : "border-dashed border-border bg-surface/80"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              {t.compareTo}
            </p>
            {comparePrevious ? (
              <>
                <p className="mt-2 text-xs text-ink-muted">{comparePrevious.capturedAtLabel}</p>
                <div className="mt-3 aspect-video overflow-hidden rounded-lg border border-border bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={comparePrevious.snapshotImageUrl}
                    alt=""
                    className="h-full w-full object-cover object-top"
                  />
                </div>
                <Link
                  href={`/dashboard/observations/${comparePrevious.id}`}
                  className="mt-4 inline-flex text-sm font-semibold text-accent hover:text-accent-hover"
                >
                  {t.viewPrevious}
                </Link>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm text-ink-muted">{t.compareHint}</p>
                <Link
                  href="/dashboard/observations"
                  className="mt-4 inline-flex text-sm font-semibold text-accent hover:text-accent-hover"
                >
                  {t.backToObservations}
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
