import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewtraceLogo } from "@/components/brand/ViewtraceLogo";
import {
  ObservationHtmlHeadSignalsPanel,
  observationHtmlHeadCopyFrom,
} from "@/components/dashboard/ObservationHtmlHeadSignalsPanel";
import { PublicShareActions } from "@/components/verify/PublicShareActions";
import { PublicVerifySnapshot } from "@/components/verify/PublicVerifySnapshot";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { observationGeoCopyFrom, observationGeoReadout } from "@/lib/observation-geo-readout";
import {
  fetchShareCollectionForPublic,
  type PublicShareCollectionItem,
} from "@/lib/observation-share-collection";
import { sanitizeVerifyTokenParam } from "@/lib/observation-verify-token";
import { htmlHeadSignalsHasAny } from "@/lib/url-preview";

export const dynamic = "force-dynamic";

type TokenParams = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: TokenParams): Promise<Metadata> {
  const { token: tokenRaw } = await params;
  const token = sanitizeVerifyTokenParam(tokenRaw);
  const locale = await getRequestLocale();
  const t = copy[locale].publicShareCollection;
  if (!token) return { title: t.title, robots: { index: false, follow: false } };
  return {
    title: t.title,
    description: t.subtitle,
    robots: { index: false, follow: false },
  };
}

function requestedRegionText(obs: PublicShareCollectionItem): string {
  const bits = [obs.regionLabel, obs.regionValue]
    .map((v) => v?.trim())
    .filter((v): v is string => Boolean(v));
  return [...new Set(bits)].join(" · ");
}

function screenshotTriStateLabel(
  item: PublicShareCollectionItem,
  labels: {
    same: string;
    changed: string;
    notComparable: string;
  },
): { label: string; kind: "same" | "changed" | "incomparable" } | null {
  const field = item.screenshotCompare;
  if (!field) return null;
  if (field.verdict === "same") return { label: labels.same, kind: "same" };
  if (field.verdict === "changed") return { label: labels.changed, kind: "changed" };
  return { label: labels.notComparable, kind: "incomparable" };
}

export default async function PublicShareCollectionPage({ params }: TokenParams) {
  const { token: tokenRaw } = await params;
  const token = sanitizeVerifyTokenParam(tokenRaw);
  if (!token) notFound();

  const locale = await getRequestLocale();
  const t = copy[locale].publicShareCollection;
  const tv = copy[locale].publicVerify;
  const td = copy[locale].observationDetail;
  const tc = copy[locale].observationCompare;
  const sv = copy[locale].snapshotVisuals;

  const collection = await fetchShareCollectionForPublic(token);
  if (!collection) notFound();

  const geoCopy = observationGeoCopyFrom(td);
  const htmlHeadSignalsCopy = observationHtmlHeadCopyFrom(td);

  return (
    <div className="min-h-screen bg-surface">
      <style
        dangerouslySetInnerHTML={{
          __html: `@media print { .no-print { display: none !important; } }`,
        }}
      />
      <header className="border-b border-border bg-surface-elevated">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="shrink-0">
            <ViewtraceLogo className="h-7 w-auto" priority={false} />
          </Link>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">{t.badge}</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{t.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t.subtitle}</p>

        <PublicShareActions
          copyLabel={tv.copyShareUrl}
          copiedLabel={tv.shareCopied}
          failedLabel={tv.shareCopyFailed}
          printLabel={tv.savePdf}
        />

        <ol className="mt-10 space-y-12">
          {collection.items.map((obs, index) => {
            const capturedLabel = `${formatJaDateTime(obs.capturedAt, locale)} · ${formatUtcLabel(obs.capturedAt)}`;
            const geoReadout = observationGeoReadout({
              requestedLabel: obs.regionLabel,
              regionValue: obs.regionValue,
              captureConditions: obs.captureConditions,
              copy: geoCopy,
              locale,
            });
            const statusLabel =
              obs.status === "success"
                ? td.statusSuccess
                : obs.status === "failure"
                  ? td.statusFailure
                  : td.statusPending;
            const finalUrl = obs.htmlSignals?.final_url?.trim() || "";
            const showHtmlSignals = Boolean(obs.htmlSignals && htmlHeadSignalsHasAny(obs.htmlSignals));
            const tri = screenshotTriStateLabel(obs, {
              same: tc.same,
              changed: tc.changed,
              notComparable: tc.notComparable,
            });
            const incomparableHint =
              obs.screenshotCompare?.incomparableReason === "scope"
                ? tc.screenshotIncomparableScope
                : obs.screenshotCompare?.incomparableReason === "viewport"
                  ? tc.screenshotIncomparableViewport
                  : obs.screenshotCompare?.incomparableReason === "unknown_conditions"
                    ? tc.screenshotIncomparableUnknown
                    : null;

            return (
              <li key={obs.id} className="list-none">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  {t.itemHeading
                    .replace("{n}", String(index + 1))
                    .replace("{total}", String(collection.items.length))}
                </p>

                {tri ? (
                  <div
                    className={`mt-3 rounded-xl border px-4 py-3 text-sm ${
                      tri.kind === "changed"
                        ? "border-amber-200 bg-amber-50 text-amber-950"
                        : tri.kind === "same"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                          : "border-border bg-surface-elevated text-ink"
                    }`}
                  >
                    <p className="font-semibold">
                      {tc.screenshot}: {tri.label}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed opacity-80">{t.screenshotVsPrevious}</p>
                    {tri.kind === "changed" ? (
                      <p className="mt-1 text-xs leading-relaxed opacity-80">{tc.screenshotChangedHint}</p>
                    ) : null}
                    {tri.kind === "incomparable" && incomparableHint ? (
                      <p className="mt-1 text-xs leading-relaxed opacity-80">{incomparableHint}</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-3 text-xs leading-relaxed text-ink-muted">{t.noPreviousInCollection}</p>
                )}

                <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface-elevated">
                  {obs.snapshotImageUrl ? (
                    <PublicVerifySnapshot
                      imageUrl={obs.snapshotImageUrl}
                      labels={{
                        viewFullscreen: sv.viewFullscreen,
                        closeFullscreen: sv.closeFullscreen,
                        fullscreenHint: sv.fullscreenHint,
                      }}
                    />
                  ) : (
                    <p className="px-4 py-12 text-center text-sm text-ink-muted">
                      {obs.screenshotExpired ? tv.screenshotExpired : tv.noScreenshot}
                    </p>
                  )}
                </div>

                <dl className="mt-4 divide-y divide-border rounded-2xl border border-border bg-surface-elevated px-5 sm:px-6">
                  <div className="grid gap-1 py-4 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      {tv.fieldTimestamp}
                    </dt>
                    <dd className="text-sm text-ink">{capturedLabel}</dd>
                  </div>
                  <div className="grid gap-1 py-4 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      {t.fieldRequestedRegion}
                    </dt>
                    <dd className="text-sm text-ink">
                      {requestedRegionText(obs) || geoReadout.requestedLabel}
                    </dd>
                  </div>
                  {obs.captureConditions?.geo?.country ? (
                    <div className="grid gap-1 py-4 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        {t.fieldObservedRegion}
                      </dt>
                      <dd className="text-sm text-ink">{geoReadout.observedLabel}</dd>
                    </div>
                  ) : null}
                  <div className="grid gap-1 py-4 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      {tv.fieldUrl}
                    </dt>
                    <dd className="break-all font-mono text-xs text-ink">{obs.url || "—"}</dd>
                  </div>
                  <div className="grid gap-1 py-4 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      {tv.fieldFinalUrl}
                    </dt>
                    <dd className="break-all font-mono text-xs text-ink">{finalUrl || "—"}</dd>
                  </div>
                  <div className="grid gap-1 py-4 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      {tv.fieldStatus}
                    </dt>
                    <dd className="text-sm font-medium text-ink">{statusLabel}</dd>
                  </div>
                  <div className="grid gap-1 py-4 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      {tv.fieldSha256}
                    </dt>
                    <dd className="text-sm text-ink">
                      <p className="break-all font-mono text-xs leading-relaxed">
                        {obs.snapshotSha256?.trim() || "—"}
                      </p>
                      {obs.snapshotSha256?.trim() ? (
                        <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{tv.fieldSha256Hint}</p>
                      ) : null}
                    </dd>
                  </div>
                </dl>

                {showHtmlSignals && obs.htmlSignals ? (
                  <div className="mt-4">
                    <ObservationHtmlHeadSignalsPanel
                      signals={obs.htmlSignals}
                      copy={htmlHeadSignalsCopy}
                      requestedUrl={obs.url}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>

        <p className="mt-10 text-xs leading-relaxed text-ink-muted">{t.disclaimer}</p>
        <p className="mt-10 text-center text-xs text-ink-muted">
          <Link href="/" className="font-medium text-ink-muted hover:text-accent">
            Powered by Viewtrace
          </Link>
        </p>
      </main>
    </div>
  );
}
