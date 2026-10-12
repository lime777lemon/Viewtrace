import Link from "next/link";
import type { Observation } from "@/lib/demo/observations";
import { formatJaDate } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import { auditEvidenceDomId } from "@/lib/observation-ai-audit";
import { ObservationFactCountBar } from "@/components/dashboard/ObservationFactCountBar";
import {
  compareObservations,
  observationCompareHref,
  previousObservationForCompare,
  type ObservationCompareField,
  type ObservationCompareFieldKey,
} from "@/lib/observation-compare";

type Props = {
  current: Observation;
  timeSiblings: Observation[];
  locale: Locale;
};

function fieldLabel(
  key: ObservationCompareFieldKey,
  t: (typeof copy)[Locale]["observationCompare"],
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

function verdictClass(verdict: ObservationCompareField["verdict"]): string {
  return verdict === "changed"
    ? "text-xs font-semibold uppercase tracking-wider text-accent"
    : "text-xs font-semibold uppercase tracking-wider text-ink-muted";
}

function verdictText(
  verdict: ObservationCompareField["verdict"],
  t: (typeof copy)[Locale]["observationCompare"],
): string {
  if (verdict === "changed") return t.changed;
  if (verdict === "same") return t.same;
  if (verdict === "incomparable") return t.notComparable;
  return t.unknown;
}

function displayValue(value: string, emptyLabel: string): string {
  return value.trim() ? value : emptyLabel;
}

/** 42: Screenshot 三値の下に、既にあるメタ差を事実で並べる。Page changed とは書かない。 */
export function ObservationDetectedFacts({ current, timeSiblings, locale }: Props) {
  const t = copy[locale].observationCompare;
  const previous = previousObservationForCompare(current, timeSiblings);
  if (!previous) return null;

  const fields = compareObservations(previous, current);
  const screenshot = fields.find((row) => row.key === "screenshot");
  const metadata = fields.filter((row) => row.key !== "screenshot");
  const changedMeta = metadata.filter((row) => row.verdict === "changed");
  const changedCount = fields.filter((row) => row.verdict === "changed").length;
  const sameCount = fields.filter((row) => row.verdict === "same").length;
  const incomparableCount = fields.filter((row) => row.verdict === "incomparable").length;

  const screenshotHint =
    screenshot?.verdict === "changed"
      ? t.screenshotChangedHint
      : screenshot?.verdict === "incomparable"
        ? screenshot.incomparableReason === "scope"
          ? t.screenshotIncomparableScope
          : screenshot.incomparableReason === "viewport"
            ? t.screenshotIncomparableViewport
            : t.screenshotIncomparableUnknown
        : null;

  return (
    <section
      id={auditEvidenceDomId("detected_facts")}
      className="scroll-mt-28 rounded-xl border border-border bg-surface-elevated p-4 sm:p-5"
      aria-labelledby="observation-detected-facts-heading"
    >
      <h3 id="observation-detected-facts-heading" className="text-sm font-semibold text-ink">
        {t.detectedFactsTitle}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">
        {t.detectedFactsHint.replace("{when}", formatJaDate(previous.capturedAt, locale))}
      </p>

      <div className="mt-4">
        <ObservationFactCountBar
          ariaLabel={t.factsStripCount
            .replace("{changed}", String(changedCount))
            .replace("{same}", String(sameCount))
            .replace("{incomparable}", String(incomparableCount))}
          segments={[
            { key: "changed", count: changedCount, label: t.changed, color: "#1a6b5c" },
            { key: "same", count: sameCount, label: t.same, color: "#c4bfb6" },
            {
              key: "incomparable",
              count: incomparableCount,
              label: t.notComparable,
              color: "#8b5a2b",
            },
          ]}
        />
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">{t.factsStripHint}</p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {fields.map((row) => (
            <li
              key={row.key}
              className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-ink"
            >
              {fieldLabel(row.key, t)}{" "}
              <span
                className={
                  row.verdict === "changed" ? "font-semibold text-accent" : "font-semibold text-ink-muted"
                }
              >
                {verdictText(row.verdict, t)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {screenshot ? (
        <div className="mt-4 rounded-lg border border-border bg-surface px-3 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-ink">{t.screenshot}</p>
            <p className={verdictClass(screenshot.verdict)}>{verdictText(screenshot.verdict, t)}</p>
          </div>
          {screenshotHint ? (
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">{screenshotHint}</p>
          ) : null}
        </div>
      ) : null}

      {changedMeta.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {changedMeta.map((row) => (
            <li key={row.key} className="rounded-lg border border-border bg-surface px-3 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-ink">{fieldLabel(row.key, t)}</p>
                <p className={verdictClass(row.verdict)}>{t.changed}</p>
              </div>
              <dl className="mt-2 grid gap-2 text-xs text-ink">
                <div>
                  <dt className="text-ink-muted">{t.previousRecord}</dt>
                  <dd className="mt-0.5 break-all font-mono">
                    {displayValue(row.left, t.emptyValue)}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-muted">{t.thisRecord}</dt>
                  <dd className="mt-0.5 break-all font-mono">
                    {displayValue(row.right, t.emptyValue)}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-ink-muted">{t.noMetadataChanges}</p>
      )}

      <Link
        href={observationCompareHref(previous.id, current.id)}
        className="mt-3 inline-flex text-sm font-semibold text-accent hover:text-accent-hover"
      >
        {t.promptOpen}
      </Link>
    </section>
  );
}
