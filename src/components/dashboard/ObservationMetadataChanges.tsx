import Link from "next/link";
import type { Observation } from "@/lib/demo/observations";
import { formatJaDate } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import {
  compareObservations,
  observationCompareHref,
  previousObservationForCompare,
  type ObservationCompareFieldKey,
} from "@/lib/observation-compare";

type Props = {
  current: Observation;
  timeSiblings: Observation[];
  locale: Locale;
};

function fieldLabel(
  key: ObservationCompareFieldKey,
  t: {
    screenshot: string;
    finalUrl: string;
    titleField: string;
    description: string;
    canonical: string;
    robots: string;
    noindex: string;
    ogImage: string;
  },
): string {
  switch (key) {
    case "screenshot":
      return t.screenshot;
    case "finalUrl":
      return t.finalUrl;
    case "title":
      return t.titleField;
    case "description":
      return t.description;
    case "canonical":
      return t.canonical;
    case "robots":
      return t.robots;
    case "noindex":
      return t.noindex;
    case "ogImage":
      return t.ogImage;
  }
}

export function ObservationMetadataChanges({ current, timeSiblings, locale }: Props) {
  const t = copy[locale].observationCompare;
  const previous = previousObservationForCompare(current, timeSiblings);
  if (!previous) return null;

  const changed = compareObservations(previous, current).filter((row) => row.verdict === "changed");
  if (changed.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-surface-elevated p-4 sm:col-span-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
        {t.changesTitle}
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">
        {t.changesHint.replace("{when}", formatJaDate(previous.capturedAt, locale))}
      </p>
      <ul className="mt-3 space-y-1 text-sm text-ink">
        {changed.map((row) => (
          <li key={row.key}>
            <span className="font-medium">{fieldLabel(row.key, t)}</span>
            <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-accent">{t.changed}</span>
          </li>
        ))}
      </ul>
      <Link
        href={observationCompareHref(previous.id, current.id)}
        className="mt-3 inline-flex text-sm font-semibold text-accent hover:text-accent-hover"
      >
        {t.promptOpen}
      </Link>
    </section>
  );
}
