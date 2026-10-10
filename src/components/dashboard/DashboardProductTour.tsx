"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { OnboardingLanguageSelect } from "@/components/dashboard/OnboardingLanguageSelect";
import { useOnboardingCopy } from "@/components/dashboard/useOnboardingCopy";
import { writeOnboardingWelcomeSeen } from "@/lib/onboarding";
import { getProductTourCopy } from "@/lib/product-tour-copy";
import {
  clearProductTourIndex,
  consumeProductTourForce,
  PRODUCT_TOUR_QUERY,
  PRODUCT_TOUR_STEP_IDS,
  productTourHref,
  productTourPathMatches,
  readProductTourCompleted,
  readProductTourIndex,
  writeProductTourCompleted,
  writeProductTourIndex,
  type ProductTourStepId,
} from "@/lib/product-tour";

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

export function DashboardProductTour({
  userId,
  observationCount,
  latestObservationId,
}: {
  userId: string;
  observationCount: number;
  latestObservationId?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { lang, setLang } = useOnboardingCopy();
  const copy = getProductTourCopy(lang);
  const [tourIndex, setTourIndex] = useState<number | null>(null);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);

  const stepId = tourIndex == null ? null : PRODUCT_TOUR_STEP_IDS[tourIndex];
  const step = stepId ? copy.steps[stepId] : null;
  const touring = tourIndex != null && step != null;

  const goToIndex = useCallback(
    (next: number | null) => {
      if (next == null) {
        clearProductTourIndex();
        writeProductTourCompleted(userId);
        setTourIndex(null);
        return;
      }
      const id = PRODUCT_TOUR_STEP_IDS[next];
      if (!id) {
        clearProductTourIndex();
        writeProductTourCompleted(userId);
        setTourIndex(null);
        return;
      }
      writeProductTourIndex(next);
      setTourIndex(next);
    },
    [userId],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forced =
      params.get(PRODUCT_TOUR_QUERY) === "1" || consumeProductTourForce();
    if (params.get(PRODUCT_TOUR_QUERY) === "1") {
      params.delete(PRODUCT_TOUR_QUERY);
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
      );
    }
    const saved = readProductTourIndex();
    if (forced) {
      writeOnboardingWelcomeSeen(userId);
      const index = saved ?? 0;
      writeProductTourIndex(index);
      setTourIndex(index);
      return;
    }
    if (saved != null) {
      setTourIndex(saved);
      return;
    }
    if (observationCount > 0) return;
    if (readProductTourCompleted(userId)) return;
    writeOnboardingWelcomeSeen(userId);
    writeProductTourIndex(0);
    setTourIndex(0);
  }, [observationCount, userId]);

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
    if (!productTourPathMatches(id, pathname, latestObservationId)) {
      setTargetRect(null);
      return;
    }
    const el = visibleTourTarget(id);
    setTargetRect(el ? readRect(el) : null);
  }, [latestObservationId, pathname, tourIndex]);

  useEffect(() => {
    if (tourIndex == null) return;
    const id = PRODUCT_TOUR_STEP_IDS[tourIndex];
    if (id && !productTourPathMatches(id, pathname, latestObservationId)) {
      router.push(productTourHref(id, latestObservationId));
    }
  }, [latestObservationId, pathname, router, tourIndex]);

  useEffect(() => {
    syncTarget();
    if (tourIndex == null) return;
    const onShift = () => syncTarget();
    window.addEventListener("resize", onShift);
    window.addEventListener("scroll", onShift, true);
    const retry = window.setTimeout(syncTarget, 120);
    return () => {
      window.removeEventListener("resize", onShift);
      window.removeEventListener("scroll", onShift, true);
      window.clearTimeout(retry);
    };
  }, [syncTarget, tourIndex]);

  useEffect(() => {
    if (!touring) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") goToIndex(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goToIndex, touring]);

  if (!touring || !step || stepId == null || tourIndex == null) return null;

  const tooltipStyle = targetRect
    ? {
        top: Math.min(targetRect.top + targetRect.height + 12, window.innerHeight - 220),
        left: Math.min(Math.max(16, targetRect.left), window.innerWidth - 336),
      }
    : undefined;

  return (
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
        aria-label={copy.ui.tourTitle}
        dir={lang === "ar" ? "rtl" : "ltr"}
        className="absolute z-61 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-4 shadow-xl"
        style={
          tooltipStyle ?? {
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }
        }
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            {copy.ui.tourTitle} ·{" "}
            {copy.ui.stepOf
              .replace("{current}", String(tourIndex + 1))
              .replace("{total}", String(PRODUCT_TOUR_STEP_IDS.length))}
          </p>
          <OnboardingLanguageSelect
            lang={lang}
            label={copy.ui.languageLabel}
            onChange={setLang}
          />
        </div>
        <h3 className="mt-1 text-sm font-semibold text-ink">{step.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{step.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => goToIndex(null)}
            className="text-xs font-semibold text-ink-muted hover:text-ink"
          >
            {copy.ui.skip}
          </button>
          <div className="flex gap-2">
            {tourIndex > 0 ? (
              <button
                type="button"
                onClick={() => goToIndex(tourIndex - 1)}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-elevated"
              >
                {copy.ui.back}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (tourIndex >= PRODUCT_TOUR_STEP_IDS.length - 1) {
                  goToIndex(null);
                  return;
                }
                goToIndex(tourIndex + 1);
              }}
              className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover"
            >
              {tourIndex >= PRODUCT_TOUR_STEP_IDS.length - 1 ? copy.ui.done : copy.ui.next}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
