import Link from "next/link";
import type { Observation } from "@/lib/demo/observations";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import {
  newObservationHrefForRepeat,
  observationCompareHref,
  pairObservationForCompare,
  pairRegionObservationForCompare,
} from "@/lib/observation-compare";

type Props = {
  observation: Observation;
  timeSiblings: Observation[];
  regionCandidates: Observation[];
  locale: Locale;
};

export function ObservationComparePrompt({
  observation,
  timeSiblings,
  regionCandidates,
  locale,
}: Props) {
  const t = copy[locale].observationCompare;
  const timePair = pairObservationForCompare(observation, timeSiblings);
  const regionPair = pairRegionObservationForCompare(observation, regionCandidates);
  const canRepeat = Boolean(observation.url?.trim() && observation.regionValue?.trim());

  return (
    <div data-tour="compare" className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-border bg-surface-elevated p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t.timeAxis}</p>
        <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-ink">{t.promptTitle}</h2>
        {timePair ? (
          <>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t.promptReady}</p>
            <Link
              href={observationCompareHref(timePair.id, observation.id)}
              className="mt-4 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              {t.promptOpen}
            </Link>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t.promptNeedSecond}</p>
            {canRepeat ? (
              <Link
                href={newObservationHrefForRepeat(observation)}
                data-tour="observeAgain"
                className="mt-4 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
              >
                {t.promptCta}
              </Link>
            ) : null}
          </>
        )}
      </section>

      {regionPair ? (
        <section className="rounded-2xl border border-border bg-surface-elevated p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t.regionAxis}</p>
          <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-ink">{t.regionPromptTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t.regionPromptReady}</p>
          <Link
            href={observationCompareHref(observation.id, regionPair.id)}
            className="mt-4 inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink hover:border-accent/40"
          >
            {t.regionPromptOpen}
          </Link>
        </section>
      ) : null}
    </div>
  );
}
