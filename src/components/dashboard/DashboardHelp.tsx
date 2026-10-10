"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import { OBSERVATION_DETAIL_VIDEO_TRACKS } from "@/lib/observation-detail-video-tracks";
import { OBSERVATION_LIST_VIDEO_TRACKS } from "@/lib/observation-list-video-tracks";
import { PRODUCT_TOUR_STEP_IDS, type ProductTourStepId } from "@/lib/product-tour";

type Rect = { top: number; left: number; width: number; height: number };

function visibleTourTarget(id: ProductTourStepId): HTMLElement | null {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`));
  const visible = nodes.filter((el) => {
    const box = el.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  });
  return (
    visible.find((el) => !el.closest("aside") && !el.closest("header nav")) ??
    visible[0] ??
    null
  );
}

function readRect(el: HTMLElement): Rect {
  const box = el.getBoundingClientRect();
  return { top: box.top, left: box.left, width: box.width, height: box.height };
}

export function DashboardHelp({ locale }: { locale: Locale }) {
  const t = copy[locale].dashboard.help;
  const [tourIndex, setTourIndex] = useState<number | null>(null);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);

  const stepId = tourIndex == null ? null : PRODUCT_TOUR_STEP_IDS[tourIndex];
  const step = stepId ? t.steps[stepId] : null;
  const touring = tourIndex != null && step != null;

  const syncTarget = useCallback(() => {
    if (tourIndex == null) {
      setTargetRect(null);
      return;
    }
    const id = PRODUCT_TOUR_STEP_IDS[tourIndex];
    if (!id) {
      setTargetRect(null);
      return;
    }
    const el = visibleTourTarget(id);
    setTargetRect(el ? readRect(el) : null);
  }, [tourIndex]);

  useEffect(() => {
    syncTarget();
    if (tourIndex == null) return;
    const onShift = () => syncTarget();
    window.addEventListener("resize", onShift);
    window.addEventListener("scroll", onShift, true);
    return () => {
      window.removeEventListener("resize", onShift);
      window.removeEventListener("scroll", onShift, true);
    };
  }, [syncTarget, tourIndex]);

  useEffect(() => {
    if (!touring) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setTourIndex(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [touring]);

  const tooltipStyle = targetRect
    ? {
        top: Math.min(targetRect.top + targetRect.height + 12, window.innerHeight - 220),
        left: Math.min(Math.max(16, targetRect.left), window.innerWidth - 336),
      }
    : undefined;

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            {t.tourTitle}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t.tourIntro}</p>
        </div>

        <ol className="space-y-4">
          {PRODUCT_TOUR_STEP_IDS.map((id, index) => {
            const item = t.steps[id];
            return (
              <li key={id} className="rounded-xl border border-border bg-surface-elevated p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  {t.stepOf
                    .replace("{current}", String(index + 1))
                    .replace("{total}", String(PRODUCT_TOUR_STEP_IDS.length))}
                </p>
                <h2 className="mt-1 text-sm font-semibold text-ink">{item.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{item.body}</p>
                {id === "recordsScreen" ? (
                  <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
                    <p className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                      {t.recordsVideoTitle}
                    </p>
                    <p className="px-3 pt-1 text-xs leading-relaxed text-ink-muted">
                      {t.recordsVideoCaptionHint}
                    </p>
                    <video
                      className="mt-2 aspect-video w-full bg-surface-elevated"
                      controls
                      playsInline
                      preload="metadata"
                      crossOrigin="anonymous"
                      poster="/marketing/screenshots/observations-list-ja.png"
                      aria-label={t.recordsVideoAria}
                    >
                      <source src="/marketing/videos/observations-list-en.mp4" type="video/mp4" />
                      {OBSERVATION_LIST_VIDEO_TRACKS.map((track) => (
                        <track
                          key={track.srclang}
                          kind="subtitles"
                          src={track.src}
                          srcLang={track.srclang}
                          label={track.label}
                          default={track.srclang === (locale === "ja" ? "ja" : "en")}
                        />
                      ))}
                    </video>
                  </div>
                ) : null}
                {id === "recordScreen" ? (
                  <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
                    <p className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                      {t.recordVideoTitle}
                    </p>
                    <p className="px-3 pt-1 text-xs leading-relaxed text-ink-muted">
                      {t.recordsVideoCaptionHint}
                    </p>
                    <video
                      className="mt-2 aspect-video w-full bg-surface-elevated"
                      controls
                      playsInline
                      preload="metadata"
                      crossOrigin="anonymous"
                      poster="/marketing/screenshots/observation-detail-en.png"
                      aria-label={t.recordVideoAria}
                    >
                      <source src="/marketing/videos/observation-detail-en.mp4" type="video/mp4" />
                      {OBSERVATION_DETAIL_VIDEO_TRACKS.map((track) => (
                        <track
                          key={track.srclang}
                          kind="subtitles"
                          src={track.src}
                          srcLang={track.srclang}
                          label={track.label}
                          default={track.srclang === (locale === "ja" ? "ja" : "en")}
                        />
                      ))}
                    </video>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/contact" className="text-sm font-semibold text-accent hover:text-accent-hover">
            {t.contact}
          </Link>
          <button
            type="button"
            onClick={() => setTourIndex(0)}
            className="inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            {t.startTour}
          </button>
        </div>
      </div>

      {touring && step && stepId ? (
        <div className="fixed inset-0 z-60">
          {targetRect ? (
            <div
              className="pointer-events-none fixed rounded-xl ring-2 ring-accent"
              style={{
                top: targetRect.top - 6,
                left: targetRect.left - 6,
                width: targetRect.width + 12,
                height: targetRect.height + 12,
                boxShadow: "0 0 0 9999px rgb(15 23 42 / 0.45)",
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-ink/40" />
          )}
          <div
            role="dialog"
            aria-live="polite"
            className="absolute z-61 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-4 shadow-xl"
            style={
              tooltipStyle ?? {
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }
            }
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              {t.tourTitle} ·{" "}
              {t.stepOf
                .replace("{current}", String((tourIndex ?? 0) + 1))
                .replace("{total}", String(PRODUCT_TOUR_STEP_IDS.length))}
            </p>
            <h3 className="mt-1 text-sm font-semibold text-ink">{step.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{step.body}</p>
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setTourIndex(null)}
                className="text-xs font-semibold text-ink-muted hover:text-ink"
              >
                {t.close}
              </button>
              <div className="flex gap-2">
                {tourIndex != null && tourIndex > 0 ? (
                  <button
                    type="button"
                    onClick={() => setTourIndex(tourIndex - 1)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-elevated"
                  >
                    {t.back}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    if (tourIndex == null) return;
                    if (tourIndex >= PRODUCT_TOUR_STEP_IDS.length - 1) {
                      setTourIndex(null);
                      return;
                    }
                    setTourIndex(tourIndex + 1);
                  }}
                  className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover"
                >
                  {tourIndex != null && tourIndex >= PRODUCT_TOUR_STEP_IDS.length - 1
                    ? t.done
                    : t.next}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
