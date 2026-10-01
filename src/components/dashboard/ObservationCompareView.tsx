import Link from "next/link";
import type { Observation } from "@/lib/demo/observations";
import { formatJaDate } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import { observationGeoCopyFrom, observationGeoReadout } from "@/lib/observation-geo-readout";
import type { ObservationCompareField } from "@/lib/observation-compare";
import { visibleSnapshotImageUrl } from "@/lib/observation-screenshot-retention";

type Props = {
  left: Observation;
  right: Observation;
  siblings: Observation[];
  fields: ObservationCompareField[];
  locale: Locale;
  retentionDays: number;
  mode: "time" | "region";
};

function fieldLabel(
  key: ObservationCompareField["key"],
  t: {
    screenshot: string;
    finalUrl: string;
    titleField: string;
    description: string;
    canonical: string;
    robots: string;
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
    case "ogImage":
      return t.ogImage;
  }
}

function displayValue(value: string, emptyLabel: string): string {
  return value.trim() ? value : emptyLabel;
}

function heading(obs: Observation, locale: Locale): string {
  const geo = observationGeoReadout({
    requestedLabel: obs.regionLabel,
    regionValue: obs.regionValue,
    captureConditions: obs.captureConditions,
    copy: observationGeoCopyFrom(copy[locale].observationDetail),
    locale,
  });
  return `${formatJaDate(obs.capturedAt, locale)} — ${geo.headline}`;
}

function scopeCaption(
  obs: Observation,
  t: { paneScopeFullPage: string; paneScopeViewport: string; paneScopeUnknown: string },
): string {
  const requested = obs.captureConditions?.full_page_requested;
  const scope =
    requested === true ? t.paneScopeFullPage : requested === false ? t.paneScopeViewport : t.paneScopeUnknown;
  const w = obs.captureConditions?.result?.image_width_px;
  const h = obs.captureConditions?.result?.image_height_px;
  if (w && h) return `${scope} · ${w}×${h}`;
  return scope;
}

function SnapshotPane({
  obs,
  retentionDays,
  noImage,
}: {
  obs: Observation;
  retentionDays: number;
  noImage: string;
}) {
  const imageUrl = visibleSnapshotImageUrl(obs, retentionDays);
  return (
    <div className="h-[min(70vh,40rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-surface">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="block w-full h-auto" />
      ) : (
        <p className="px-4 py-16 text-center text-sm text-ink-muted">{noImage}</p>
      )}
    </div>
  );
}

export function ObservationCompareView({
  left,
  right,
  siblings,
  fields,
  locale,
  retentionDays,
  mode,
}: Props) {
  const t = copy[locale].observationCompare;
  const changedCount = fields.filter((row) => row.verdict === "changed").length;
  const headingTitle = mode === "region" ? t.regionTitle : t.timeTitle;
  const headingSubtitle = mode === "region" ? t.regionSubtitle : t.timeSubtitle;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{headingTitle}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">{headingSubtitle}</p>
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">{t.factHint}</p>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {changedCount} {t.changed}
        </p>
      </div>

      {siblings.length > 2 ? (
        <form
          method="get"
          action="/dashboard/observations/compare"
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface-elevated p-4"
        >
          <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs font-semibold text-ink-muted">
            {t.pickLeft}
            <select
              name="a"
              defaultValue={left.id}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-normal text-ink"
            >
              {siblings.map((row) => (
                <option key={row.id} value={row.id}>
                  {heading(row, locale)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs font-semibold text-ink-muted">
            {t.pickRight}
            <select
              name="b"
              defaultValue={right.id}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-normal text-ink"
            >
              {siblings.map((row) => (
                <option key={row.id} value={row.id}>
                  {heading(row, locale)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            {t.submit}
          </button>
        </form>
      ) : null}

      <p className="font-display text-lg font-semibold text-ink">
        {heading(left, locale)} <span className="text-ink-muted">{t.vs}</span> {heading(right, locale)}
      </p>
      <p className="break-all font-mono text-xs text-ink-muted">{left.url}</p>

      <div className="grid items-start gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              {heading(left, locale)}
            </p>
            <Link
              href={`/dashboard/observations/${left.id}`}
              className="text-sm font-semibold text-accent hover:text-accent-hover"
            >
              {t.openRecord}
            </Link>
          </div>
          <p className="text-xs text-ink-muted">{scopeCaption(left, t)}</p>
          <SnapshotPane obs={left} retentionDays={retentionDays} noImage={t.noImage} />
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              {heading(right, locale)}
            </p>
            <Link
              href={`/dashboard/observations/${right.id}`}
              className="text-sm font-semibold text-accent hover:text-accent-hover"
            >
              {t.openRecord}
            </Link>
          </div>
          <p className="text-xs text-ink-muted">{scopeCaption(right, t)}</p>
          <SnapshotPane obs={right} retentionDays={retentionDays} noImage={t.noImage} />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-elevated">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-ink-muted">
              <th className="px-4 py-3 font-semibold"> </th>
              <th className="px-4 py-3 font-semibold">{t.factColumn}</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((row) => {
              const verdictLabel =
                row.verdict === "changed"
                  ? t.changed
                  : row.verdict === "same"
                    ? t.same
                    : row.verdict === "incomparable"
                      ? t.notComparable
                      : t.unknown;
              const showValues = row.verdict !== "same" && row.verdict !== "incomparable" && row.key !== "screenshot";
              const screenshotHint =
                row.key !== "screenshot"
                  ? null
                  : row.verdict === "changed"
                    ? t.screenshotChangedHint
                    : row.verdict === "incomparable"
                      ? row.incomparableReason === "scope"
                        ? t.screenshotIncomparableScope
                        : row.incomparableReason === "viewport"
                          ? t.screenshotIncomparableViewport
                          : t.screenshotIncomparableUnknown
                      : null;
              return (
                <tr key={row.key} className="border-b border-border/70 last:border-b-0">
                  <th className="align-top px-4 py-3 font-semibold text-ink">{fieldLabel(row.key, t)}</th>
                  <td className="px-4 py-3">
                    <p
                      className={
                        row.verdict === "changed"
                          ? "text-xs font-semibold uppercase tracking-wider text-accent"
                          : "text-xs font-semibold uppercase tracking-wider text-ink-muted"
                      }
                    >
                      {verdictLabel}
                    </p>
                    {screenshotHint ? (
                      <p className="mt-2 text-xs leading-relaxed text-ink-muted">{screenshotHint}</p>
                    ) : null}
                    {showValues ? (
                      <dl className="mt-2 grid gap-2 text-xs text-ink">
                        <div>
                          <dt className="text-ink-muted">{heading(left, locale)}</dt>
                          <dd className="mt-0.5 break-all font-mono">{displayValue(row.left, t.emptyValue)}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-muted">{heading(right, locale)}</dt>
                          <dd className="mt-0.5 break-all font-mono">{displayValue(row.right, t.emptyValue)}</dd>
                        </div>
                      </dl>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
