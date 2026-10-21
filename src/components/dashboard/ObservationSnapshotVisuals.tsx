"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import { decodeHtmlText } from "@/lib/url-preview";

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
  mediaKind?: "image" | "video" | "live";
  clipHref?: string | null;
  fullPage?: boolean;
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
  mediaKind = "image",
  clipHref = null,
  fullPage = false,
}: Props) {
  const t = copy[locale].snapshotVisuals;
  const { imageUrl, phase } = useHydratedSnapshotImage(
    observationUrl,
    serverImageUrl,
    fetchSnapshot && mediaKind === "image",
  );

  const [diffRatioLabel, setDiffRatioLabel] = useState<string | null>(null);
  const [diffPhase, setDiffPhase] = useState<"idle" | "loading" | "error">("idle");

  const currentForDiff = serverImageUrl ?? imageUrl;
  const previousUrl = comparePrevious?.snapshotImageUrl ?? null;

  useEffect(() => {
    if (mediaKind !== "image" || !currentForDiff || !previousUrl) {
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
  }, [currentForDiff, previousUrl, mediaKind]);

  const showVideo = mediaKind === "video" && Boolean(serverImageUrl);
  const showLive = mediaKind === "live";
  const showImg = !showVideo && !showLive && Boolean(imageUrl);
  const showLoading = !showImg && !showVideo && !showLive && phase === "loading";
  const showError = !showImg && !showVideo && !showLive && phase === "error";

  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  useEffect(() => {
    if (!fullscreenOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreenOpen(false);
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [fullscreenOpen]);

  return (
    <>
      <section>
        <h2 className="font-display text-lg font-semibold text-ink">
          {showVideo ? t.videoTitle : showLive ? t.liveOnlyTitle : t.snapshotTitle}
        </h2>
        {decodeHtmlText(displayTitle) ? (
          <p className="mt-3 text-sm font-medium text-ink">{decodeHtmlText(displayTitle)}</p>
        ) : null}
        <div className="relative mt-4 overflow-hidden rounded-2xl border border-border bg-surface-elevated">
          {showVideo ? (
            <video
              src={serverImageUrl!}
              controls
              playsInline
              className="block h-auto w-full bg-ink"
            />
          ) : showLive ? (
            <div className="flex aspect-16/10 flex-col justify-center gap-2 px-6 py-10 text-center">
              <p className="text-sm font-medium text-ink">{t.liveOnlyTitle}</p>
              <p className="text-xs text-ink-muted">{t.liveOnlyHint}</p>
              {clipHref ? (
                <Link
                  href={clipHref}
                  className="mx-auto mt-2 text-sm font-semibold text-accent hover:text-accent-hover"
                >
                  {t.liveOnlyCta}
                </Link>
              ) : null}
            </div>
          ) : showImg ? (
            <>
              <div className={fullPage ? "max-h-[min(80vh,960px)] overflow-y-auto overflow-x-hidden overscroll-contain" : ""}>
                {/* eslint-disable-next-line @next/next/no-img-element -- 外部 OG / Microlink CDN */}
                <img
                  src={imageUrl!}
                  alt=""
                  className="block h-auto w-full"
                  loading="eager"
                />
              </div>
              <button
                type="button"
                onClick={() => setFullscreenOpen(true)}
                className="absolute bottom-3 right-3 rounded-full bg-ink/80 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-ink"
              >
                {t.viewFullscreen}
              </button>
            </>
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
        <p className="mt-2 text-xs text-ink-muted">
          {showVideo ? t.videoHint : showLive ? t.liveOnlyHint : fullPage ? t.fullPageScrollHint : t.viewportHint}
        </p>
        <p className="mt-1 text-xs text-ink-muted">{metaLine}</p>
      </section>

      {mediaKind === "image" ? (
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
      ) : null}

      {fullscreenOpen && showImg ? (
        <div
          className="fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label={t.snapshotTitle}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
            <p className="truncate text-xs text-white/70">{t.fullscreenHint}</p>
            <button
              type="button"
              onClick={() => setFullscreenOpen(false)}
              className="shrink-0 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25"
            >
              {t.closeFullscreen}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[env(safe-area-inset-bottom)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- 外部 OG / Microlink CDN */}
            <img
              src={imageUrl!}
              alt=""
              className="mx-auto block h-auto w-full max-w-4xl"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
