"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readProductTourCompleted, readProductTourIndex } from "@/lib/product-tour";
import {
  readRegionSearchOnboardingSeen,
  REGION_SEARCH_ONBOARDING_STEPS,
  regionSearchOnboardingCopy,
  writeRegionSearchOnboardingSeen,
  type RegionSearchOnboardingStepId,
} from "@/lib/region-search-onboarding";
import type { Locale } from "@/lib/i18n";

type Rect = { top: number; left: number; width: number; height: number };

function targetFor(id: RegionSearchOnboardingStepId): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-onboarding="${id}"]`);
}

export function RegionSearchOnboarding({
  userId,
  locale,
  autoStart,
}: {
  userId: string;
  locale: Locale;
  autoStart: boolean;
}) {
  const copy = regionSearchOnboardingCopy(locale);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const stepId = index == null ? null : REGION_SEARCH_ONBOARDING_STEPS[index];
  const step = stepId ? copy.steps[stepId] : null;

  const close = useCallback(() => {
    writeRegionSearchOnboardingSeen(userId);
    setIndex(null);
  }, [userId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forced = params.get("guide") === "1";
    if (forced) {
      params.delete("guide");
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
      );
    }
    if (forced) {
      setIndex(0);
      return;
    }
    if (readRegionSearchOnboardingSeen(userId)) return;
    if (readProductTourIndex() != null) return;
    if (!autoStart && !readProductTourCompleted(userId)) return;
    setIndex(0);
  }, [autoStart, userId]);

  useEffect(() => {
    if (index == null) return;
    dialogRef.current?.focus();
  }, [index, stepId]);

  useEffect(() => {
    if (index == null) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, index]);

  useEffect(() => {
    if (stepId == null) {
      setRect(null);
      return;
    }
    const el = targetFor(stepId);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
    const measure = () => {
      const node = targetFor(stepId);
      if (!node) {
        setRect(null);
        return;
      }
      const box = node.getBoundingClientRect();
      setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
    };
    const frame = window.requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [stepId]);

  const tooltipStyle = rect
    ? {
        top: Math.min(rect.top + rect.height + 12, window.innerHeight - 240),
        left: Math.min(Math.max(16, rect.left), window.innerWidth - 336),
      }
    : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => setIndex(0)}
        className="shrink-0 text-sm font-semibold text-accent hover:text-accent-hover"
      >
        {copy.open}
      </button>
      {index != null && step && stepId ? (
        <div className="fixed inset-0 z-60">
          {rect ? (
            <div
              className="pointer-events-none fixed rounded-xl ring-2 ring-accent"
              style={{
                top: rect.top - 6,
                left: rect.left - 6,
                width: rect.width + 12,
                height: rect.height + 12,
                boxShadow: "0 0 0 9999px rgb(15 23 42 / 0.45)",
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-ink/40" />
          )}
          <div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="region-search-onboarding-title"
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
              {copy.title} ·{" "}
              {copy.stepOf
                .replace("{current}", String(index + 1))
                .replace("{total}", String(REGION_SEARCH_ONBOARDING_STEPS.length))}
            </p>
            <h2 id="region-search-onboarding-title" className="mt-1 text-sm font-semibold text-ink">
              {step.title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{step.body}</p>
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={close}
                className="text-xs font-semibold text-ink-muted hover:text-ink"
              >
                {copy.skip}
              </button>
              <div className="flex gap-2">
                {index > 0 ? (
                  <button
                    type="button"
                    onClick={() => setIndex(index - 1)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-elevated"
                  >
                    {copy.back}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    if (index >= REGION_SEARCH_ONBOARDING_STEPS.length - 1) {
                      close();
                      return;
                    }
                    setIndex(index + 1);
                  }}
                  className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover"
                >
                  {index >= REGION_SEARCH_ONBOARDING_STEPS.length - 1 ? copy.done : copy.next}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
