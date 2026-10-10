"use client";

import { useState } from "react";

type Props = {
  leftSrc: string;
  rightSrc: string;
  leftLabel: string;
  rightLabel: string;
  title: string;
  hint: string;
  rangeLabel: string;
};

export function ObservationCompareSlider({
  leftSrc,
  rightSrc,
  leftLabel,
  rightLabel,
  title,
  hint,
  rangeLabel,
}: Props) {
  const [pct, setPct] = useState(50);

  return (
    <section aria-labelledby="time-compare-slider-heading" className="space-y-3">
      <div>
        <h2 id="time-compare-slider-heading" className="font-display text-lg font-semibold text-ink">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{hint}</p>
      </div>
      <div className="relative overflow-hidden rounded-xl border border-border bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={rightSrc} alt={rightLabel} className="block h-auto w-full" />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={leftSrc} alt={leftLabel} className="block h-auto w-full" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-px bg-white shadow"
          style={{ left: `${pct}%` }}
        />
      </div>
      <label className="block">
        <span className="sr-only">{rangeLabel}</span>
        <input
          type="range"
          min={0}
          max={100}
          value={pct}
          onChange={(event) => setPct(Number(event.target.value))}
          className="w-full accent-accent"
        />
      </label>
      <div className="flex justify-between gap-4 text-xs text-ink-muted">
        <span>{leftLabel}</span>
        <span className="text-right">{rightLabel}</span>
      </div>
    </section>
  );
}
