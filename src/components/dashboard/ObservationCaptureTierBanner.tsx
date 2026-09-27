import Link from "next/link";
import type { Observation } from "@/lib/demo/observations";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import {
  observationRetryHref,
  resolveObservationCaptureTier,
  type ObservationCaptureTier,
} from "@/lib/observation-capture-tier";

type Props = {
  obs: Observation;
  locale: Locale;
  screenshotExpired?: boolean;
};

function tierStyles(tier: ObservationCaptureTier): string {
  switch (tier) {
    case "geo_saved":
      return "border-accent/35 bg-accent/8";
    case "preview_fallback":
      return "border-sky-500/30 bg-sky-500/8";
    case "form_image":
      return "border-border bg-surface-elevated";
    case "none":
      return "border-border bg-surface-elevated";
    default:
      return "";
  }
}

export function ObservationCaptureTierBanner({
  obs,
  locale,
  screenshotExpired = false,
}: Props) {
  const tier = resolveObservationCaptureTier(obs);
  const c = copy[locale].observationCaptureTier;

  if (screenshotExpired) {
    return (
      <div
        role="status"
        className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3"
      >
        <p className="text-sm font-semibold text-ink">{c.badgeScreenshotExpired}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{c.hintScreenshotExpired}</p>
      </div>
    );
  }

  if (tier === "failed") return null;

  const badgeLabel: Record<Exclude<ObservationCaptureTier, "failed">, string> = {
    geo_saved: c.badgeGeoSaved,
    preview_fallback: c.badgePreviewFallback,
    form_image: c.badgeFormImage,
    none: c.badgeNoImage,
  };

  const hintLabel: Record<Exclude<ObservationCaptureTier, "failed">, string> = {
    geo_saved: c.hintGeoSaved,
    preview_fallback: c.hintPreviewFallback,
    form_image: c.hintFormImage,
    none: c.hintNoImage,
  };

  const retryHref = tier === "preview_fallback" ? observationRetryHref(obs) : null;

  return (
    <div
      role="status"
      className={`rounded-xl border px-4 py-3 ${tierStyles(tier)}`}
    >
      <p className="text-sm font-semibold text-ink">{badgeLabel[tier]}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{hintLabel[tier]}</p>
      {retryHref ? (
        <p className="mt-3">
          <Link
            href={retryHref}
            className="text-sm font-semibold text-accent hover:text-accent-hover"
          >
            {c.retryLink} →
          </Link>
        </p>
      ) : null}
    </div>
  );
}
