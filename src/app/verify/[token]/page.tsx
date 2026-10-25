import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewtraceLogo } from "@/components/brand/ViewtraceLogo";
import { EvidenceReportSheet } from "@/components/dashboard/EvidenceReportSheet";
import { ObservationRegionReadout } from "@/components/dashboard/ObservationRegionReadout";
import { EvidenceReportObservationDetail } from "@/components/evidence-report/EvidenceReportObservationDetail";
import { PublicShareActions } from "@/components/verify/PublicShareActions";
import { PublicVerifySnapshot } from "@/components/verify/PublicVerifySnapshot";
import { VerifyViewBeacon } from "@/components/verify/VerifyViewBeacon";
import { buildEvidenceReportFacts } from "@/lib/evidence-report";
import {
  loadEvidenceReportObservationDetailForVerifyToken,
  type EvidenceReportObservationDetailData,
} from "@/lib/evidence-report-observation-detail";
import { observationAiAuditCopyFrom } from "@/lib/observation-ai-audit-copy";
import { fetchObservationForPublicVerify } from "@/lib/observation-public-verify";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { observationGeoCopyFrom } from "@/lib/observation-geo-readout";
import {
  buildPublicVerifyUrlForObservation,
  sanitizeVerifyTokenParam,
} from "@/lib/observation-verify-token";

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

  /**
   * 提出用: 証拠レポートと同じ実測サマリー（EvidenceReportSheet）と、
   * 詳細画面と同じ内容を載せる。再計測はしない。保存済みの行だけ。
   */
  let detail: EvidenceReportObservationDetailData | null = null;
  try {
    detail = await loadEvidenceReportObservationDetailForVerifyToken(token);
  } catch (error) {
    console.warn("[verify] observation details unavailable", {
      message: error instanceof Error ? error.message : "details_failed",
    });
  }

  const capturedLabel = `${formatJaDateTime(obs.capturedAt, locale)} · ${formatUtcLabel(obs.capturedAt)}`;
  const statusLabel =
    obs.status === "success"
      ? td.statusSuccess
      : obs.status === "failure"
        ? td.statusFailure
        : td.statusPending;
  const finalUrl = obs.htmlSignals?.final_url?.trim() || "";
  const geoCopy = observationGeoCopyFrom(td);
  const tr = copy[locale].observationVerificationReport;
  const verifyUrl = buildPublicVerifyUrlForObservation(token);
  const facts = detail
    ? buildEvidenceReportFacts({
        observation: detail.obs,
        locale,
        siblings: detail.compareSiblings,
        session: detail.storedScroll?.result.discovery?.session ?? null,
        behaviorTypes: detail.storedScroll?.result.types ?? null,
        synthetic: detail.storedSynthetic?.result ?? null,
        journeyRuns: (detail.checkRun?.journeyRuns ?? []).map((row) => ({
          region: row.region,
          deviceClass: row.deviceClass,
          status: row.status,
          steps: row.steps,
        })),
      })
    : null;
  const reportCopy = {
    title: t.title,
    subtitle: t.subtitle,
    disclaimer: t.disclaimer,
    fieldObservationId: t.fieldObservationId,
    fieldUrl: t.fieldUrl,
    fieldCaptureTime: t.fieldTimestamp,
    fieldCountry: t.fieldRegion,
    fieldScreenshot: tr.fieldScreenshot,
    fieldSha256: t.fieldSha256,
    fieldSha256Hint: t.fieldSha256Hint,
    fieldContentHash: tr.fieldContentHash,
    fieldVerifyUrl: tr.fieldVerifyUrl,
    fieldStatus: t.fieldStatus,
    statusSuccess: td.statusSuccess,
    statusFailure: td.statusFailure,
    statusPending: td.statusPending,
    noScreenshot: t.noScreenshot,
    fieldRequested: tr.fieldRequested,
    fieldObserved: tr.fieldObserved,
    sectionReachability: tr.sectionReachability,
    fieldHttp: tr.fieldHttp,
    fieldFinalUrl: t.fieldFinalUrl,
    fieldPageTitle: tr.fieldPageTitle,
    fieldDns: tr.fieldDns,
    fieldTls: tr.fieldTls,
    unmeasured: tr.unmeasured,
    sectionDetected: tr.sectionDetected,
    detectedHint: tr.detectedHint,
    previousValue: tr.previousValue,
    thisValue: tr.thisValue,
    sectionBehavior: tr.sectionBehavior,
    behaviorNote: tr.behaviorNote,
    sectionJourney: tr.sectionJourney,
    journeyNoSafeTarget: tr.journeyNoSafeTarget,
    journeyIncomplete: tr.journeyIncomplete,
    auditInference: tr.auditInference,
  };
  const aiAuditCopy = observationAiAuditCopyFrom(td);

  return (
    <div className="min-h-screen bg-surface">
      <style
        dangerouslySetInnerHTML={{
          __html: `@media print { .no-print { display: none !important; } }`,
        }}
      />
      <header className="border-b border-border bg-surface-elevated">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="shrink-0">
            <ViewtraceLogo className="h-7 w-auto" priority={false} />
          </Link>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">{t.badge}</p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <VerifyViewBeacon token={token} />
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{t.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t.subtitle}</p>

        <PublicShareActions
          copyLabel={t.copyShareUrl}
          copiedLabel={t.shareCopied}
          failedLabel={t.shareCopyFailed}
          printLabel={t.savePdf}
        />

        {facts && detail ? (
          <div className="mt-8">
            <EvidenceReportSheet
              copy={reportCopy}
              observationId={detail.obs.id}
              url={detail.obs.url}
              capturedLabel={capturedLabel}
              status={detail.obs.status}
              snapshotImageUrl={detail.storedVisibleImage ?? obs.snapshotImageUrl}
              snapshotSha256={detail.obs.snapshotSha256 ?? obs.snapshotSha256}
              contentHash={detail.obs.contentHash ?? obs.contentHash}
              verifyUrl={verifyUrl}
              facts={facts}
              aiAudit={detail.aiAudit}
              aiAuditCopy={aiAuditCopy}
              locale={locale}
              aiAuditGeneratedAtLabel={
                detail.aiAudit
                  ? `${formatJaDateTime(detail.aiAudit.createdAt, locale)} · ${formatUtcLabel(detail.aiAudit.createdAt)}`
                  : undefined
              }
            />
          </div>
        ) : (
          <>
            <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface-elevated">
              {obs.snapshotImageUrl ? (
                <PublicVerifySnapshot
                  imageUrl={obs.snapshotImageUrl}
                  contentType={obs.snapshotContentType}
                  labels={{
                    viewFullscreen: sv.viewFullscreen,
                    closeFullscreen: sv.closeFullscreen,
                    fullscreenHint: sv.fullscreenHint,
                  }}
                />
              ) : (
                <p className="px-4 py-12 text-center text-sm text-ink-muted">
                  {obs.screenshotExpired
                    ? t.screenshotExpired
                    : obs.captureConditions?.homepage_observation?.mode === "live_check"
                      ? sv.liveOnlyHint
                      : t.noScreenshot}
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
          </>
        )}

        <section className="mt-10 print:break-before-page">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#276248]">{t.details}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t.detailsHint}</p>
          <div className="mt-4">
            {detail ? (
              <EvidenceReportObservationDetail data={detail} locale={locale} />
            ) : (
              <p className="rounded-2xl border border-dashed border-border bg-surface px-4 py-4 text-sm text-ink-muted">
                {t.detailsUnavailable}
              </p>
            )}
          </div>
        </section>

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
