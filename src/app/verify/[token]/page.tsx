import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewtraceLogo } from "@/components/brand/ViewtraceLogo";
import {
  ObservationCaptureConditionsPanel,
  observationCaptureConditionsCopyFrom,
} from "@/components/dashboard/ObservationCaptureConditionsPanel";
import { ObservationRegionReadout } from "@/components/dashboard/ObservationRegionReadout";
import { observationGeoCopyFrom } from "@/lib/observation-geo-readout";
import {
  ObservationHtmlHeadSignalsPanel,
  observationHtmlHeadCopyFrom,
} from "@/components/dashboard/ObservationHtmlHeadSignalsPanel";
import { ObservationAiAuditReadout } from "@/components/dashboard/ObservationAiAuditReadout";
import { observationAiAuditCopyFrom } from "@/lib/observation-ai-audit-copy";
import { PublicShareActions } from "@/components/verify/PublicShareActions";
import { PublicVerifySnapshot } from "@/components/verify/PublicVerifySnapshot";
import { VerifyViewBeacon } from "@/components/verify/VerifyViewBeacon";
import { fetchObservationForPublicVerify } from "@/lib/observation-public-verify";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { sanitizeVerifyTokenParam } from "@/lib/observation-verify-token";
import { htmlHeadSignalsHasAny } from "@/lib/url-preview";

export const dynamic = "force-dynamic";

type TokenParams = { params: Promise<{ token: string }> };
type Props = TokenParams;

export async function generateMetadata({ params }: TokenParams): Promise<Metadata> {
  const { token: tokenRaw } = await params;
  const locale = await getRequestLocale();
  const t = copy[locale].publicVerify;
  if (!sanitizeVerifyTokenParam(tokenRaw)) {
    return { title: t.title, robots: { index: false, follow: false } };
  }
  return {
    title: t.title,
    description: t.subtitle,
    robots: { index: false, follow: false },
  };
}

export default async function PublicVerifyPage({ params }: Props) {
  const { token: tokenRaw } = await params;
  const token = sanitizeVerifyTokenParam(tokenRaw);
  if (!token) notFound();

  const locale = await getRequestLocale();
  const t = copy[locale].publicVerify;
  const td = copy[locale].observationDetail;
  const sv = copy[locale].snapshotVisuals;

  const obs = await fetchObservationForPublicVerify(token);
  if (!obs) notFound();

  const capturedLabel = `${formatJaDateTime(obs.capturedAt, locale)} · ${formatUtcLabel(obs.capturedAt)}`;
  const statusLabel =
    obs.status === "success"
      ? td.statusSuccess
      : obs.status === "failure"
        ? td.statusFailure
        : td.statusPending;
  const finalUrl = obs.htmlSignals?.final_url?.trim() || "";

  const captureConditionsCopy = observationCaptureConditionsCopyFrom(td);
  const geoCopy = observationGeoCopyFrom(td);

  const htmlHeadSignalsCopy = observationHtmlHeadCopyFrom(td);
  const aiAuditCopy = observationAiAuditCopyFrom(td);
  const showHtmlSignals = Boolean(obs.htmlSignals && htmlHeadSignalsHasAny(obs.htmlSignals));

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
        <VerifyViewBeacon token={token} />
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{t.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t.subtitle}</p>

        <PublicShareActions
          copyLabel={t.copyShareUrl}
          copiedLabel={t.shareCopied}
          failedLabel={t.shareCopyFailed}
          printLabel={t.savePdf}
        />

        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface-elevated">
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
              {obs.screenshotExpired ? t.screenshotExpired : t.noScreenshot}
            </p>
          )}
        </div>

        <dl className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface-elevated px-5 sm:px-6">
          <div className="grid gap-1 py-4 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {t.fieldTimestamp}
            </dt>
            <dd className="text-sm text-ink">{capturedLabel}</dd>
          </div>
          <div className="grid gap-1 py-4 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {t.fieldRegion}
            </dt>
            <dd className="text-sm text-ink">
              <ObservationRegionReadout
                requestedLabel={obs.regionLabel}
                regionValue={obs.regionValue}
                captureConditions={obs.captureConditions}
                copy={geoCopy}
                locale={locale}
              />
            </dd>
          </div>
          <div className="grid gap-1 py-4 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {t.fieldUrl}
            </dt>
            <dd className="break-all font-mono text-xs text-ink">{obs.url || "—"}</dd>
          </div>
          <div className="grid gap-1 py-4 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {t.fieldFinalUrl}
            </dt>
            <dd className="break-all font-mono text-xs text-ink">{finalUrl || "—"}</dd>
          </div>
          <div className="grid gap-1 py-4 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {t.fieldStatus}
            </dt>
            <dd className="text-sm font-medium text-ink">{statusLabel}</dd>
          </div>
          <div className="grid gap-1 py-4 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {t.fieldSha256}
            </dt>
            <dd className="text-sm text-ink">
              <p className="break-all font-mono text-xs leading-relaxed">
                {obs.snapshotSha256?.trim() || "—"}
              </p>
              {obs.snapshotSha256?.trim() ? (
                <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{t.fieldSha256Hint}</p>
              ) : null}
            </dd>
          </div>
          <div className="grid gap-1 py-4 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {t.fieldObservationId}
            </dt>
            <dd className="break-all font-mono text-xs text-ink-muted">{obs.id}</dd>
          </div>
        </dl>

        {showHtmlSignals && obs.htmlSignals ? (
          <div className="mt-6">
            <ObservationHtmlHeadSignalsPanel
              signals={obs.htmlSignals}
              copy={htmlHeadSignalsCopy}
              requestedUrl={obs.url}
            />
          </div>
        ) : null}

        <div className="mt-6">
          <ObservationCaptureConditionsPanel
            conditions={obs.captureConditions}
            copy={captureConditionsCopy}
            locale={locale}
          />
        </div>

        {obs.aiAudit ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface-elevated px-5 py-5 sm:px-6">
            <ObservationAiAuditReadout
              copy={aiAuditCopy}
              audit={obs.aiAudit}
              generatedAtLabel={`${formatJaDateTime(obs.aiAudit.createdAt, locale)} · ${formatUtcLabel(obs.aiAudit.createdAt)}`}
            />
          </div>
        ) : null}

        <p className="mt-6 text-xs leading-relaxed text-ink-muted">{t.disclaimer}</p>
        <p className="no-print mt-3">
          <Link
            href={`/verify/${token}/evidence.json`}
            className="text-sm font-semibold text-accent hover:text-accent-hover"
          >
            {t.evidenceJsonDownload}
          </Link>
        </p>

        <p className="mt-10 text-center text-xs text-ink-muted">
          <Link href="/" className="font-medium text-ink-muted hover:text-accent">
            Powered by Viewtrace
          </Link>
        </p>
      </main>
    </div>
  );
}
