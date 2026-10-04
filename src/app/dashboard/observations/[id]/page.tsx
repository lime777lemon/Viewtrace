import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ObservationAnnotationPanel } from "@/components/dashboard/ObservationAnnotationPanel";
import { ObservationComparePrompt } from "@/components/dashboard/ObservationComparePrompt";
import { ObservationMetadataChanges } from "@/components/dashboard/ObservationMetadataChanges";
import { ObservationPublicVerifyLink } from "@/components/dashboard/ObservationPublicVerifyLink";
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
import { ObservationCaptureTierBanner } from "@/components/dashboard/ObservationCaptureTierBanner";
import { ObservationDetailSnapshotSection } from "@/components/dashboard/ObservationDetailSnapshotSection";
import { ObservationDigitalSeal } from "@/components/dashboard/ObservationDigitalSeal";
import { ObservationEvidenceJsonDownload } from "@/components/dashboard/ObservationEvidenceJsonDownload";
import { ObservationAiAuditPanel } from "@/components/dashboard/ObservationAiAuditPanel";
import { observationAiAuditCopyFrom } from "@/lib/observation-ai-audit-copy";
import { loadObservationAiAudit } from "@/lib/observation-ai-audit-store";
import { ObservationLpVerdictCard } from "@/components/dashboard/ObservationLpVerdictCard";
import { ObservationNotVisible } from "@/components/dashboard/ObservationNotVisible";
import { ObservationLivePageComparePanel } from "@/components/dashboard/ObservationLivePageComparePanel";
import { ObservationSnapshotBinaryPanel } from "@/components/dashboard/ObservationSnapshotBinaryPanel";
import { getSession } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCachedUrlPreviewForObservation } from "@/lib/demo/observation-snapshot";
import {
  getObservationMergedForPlan,
  listObservationsForUrlIdentity,
} from "@/lib/demo/user-observations";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";
import { ObservationWatchPanel } from "@/components/dashboard/ObservationWatchPanel";
import { getPlan } from "@/lib/plans";
import {
  clampRepeatCount,
  parseWatchFrequency,
  parseWatchNotifyMode,
  type WatchFrequency,
  type WatchNotifyMode,
} from "@/lib/observation-watch-schedule";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { sanitizeObservationRouteId } from "@/lib/observation-route-id";
import {
  buildPublicVerifyUrlForObservation,
  ensureObservationVerifyTokenForUser,
} from "@/lib/observation-verify-token";
import { findPreviousObservationWithSnapshot } from "@/lib/observation-previous";
import { buildObservationEvidencePack } from "@/lib/observation-evidence-json";
import {
  isObservationScreenshotExpired,
  visibleSnapshotImageUrl,
} from "@/lib/observation-screenshot-retention";

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { id: idRaw } = await params;
  const id = sanitizeObservationRouteId(idRaw);
  const locale = await getRequestLocale();
  if (!id) {
    return {
      title: locale === "ja" ? "記録 | Viewtrace" : "Record | Viewtrace",
      robots: { index: false, follow: false },
    };
  }
  const session = await getSession();
  const obs = session
    ? await getObservationMergedForPlan(id, session.plan)
    : undefined;
  return {
    title:
      locale === "ja"
        ? obs
          ? `記録 ${obs.id} | Viewtrace`
          : "記録 | Viewtrace"
        : obs
          ? `Record ${obs.id} | Viewtrace`
          : "Record | Viewtrace",
    robots: { index: false, follow: false },
  };
}

export default async function ObservationDetailPage({ params, searchParams }: PageProps) {
  const { id: idRaw } = await params;
  const id = sanitizeObservationRouteId(idRaw);
  if (!id) notFound();
  const sp = await searchParams;
  const locale = await getRequestLocale();
  const rt = copy[locale].observationReport;
  const vr = copy[locale].observationVerificationReport;
  const t = copy[locale].observationDetail;
  const csvExportCopy = copy[locale].observationsCsvExport;
  const autoObsCopy = copy[locale].dashboardAutoObs;
  const session = await getSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/dashboard/observations/${id}`)}`);
  }
  const obs = await getObservationMergedForPlan(id, session.plan);
  if (!obs) {
    /**
     * 自動観測メールを「別アカウント」でログイン中の端末で開くと RLS で行が見えず、
     * 真っ白な 404 になっていた。ID 自体は本人のメールに既に届いているので、
     * どのアカウントで見ているかを案内してログアウト導線を出す。
     */
    return (
      <ObservationNotVisible
        signedInEmail={session.email}
        observationId={id}
        locale={locale}
      />
    );
  }

  const supabase = await createSupabaseServerClient();

  const verifyToken = await ensureObservationVerifyTokenForUser(supabase, obs.id);
  const verifyUrl = verifyToken ? buildPublicVerifyUrlForObservation(verifyToken) : null;

  const plan = getPlan(session.plan);
  const { data: watchRow } =
    plan.autoObservationWatch && obs.regionValue
      ? await supabase
          .from("observation_watches")
          .select(
            "enabled,schedule_frequency,repeat_count,notify_mode,notify_on_metadata,webhook_url",
          )
          .eq("user_id", session.userId)
          .eq("url", obs.url)
          .eq("region", obs.regionValue)
          .maybeSingle()
      : { data: null as Record<string, unknown> | null };

  const watchWebhookUrl =
    typeof watchRow?.webhook_url === "string" ? watchRow.webhook_url.trim() : "";

  const watchEnabled = Boolean(watchRow?.enabled);
  const watchFrequency: WatchFrequency =
    parseWatchFrequency(String(watchRow?.schedule_frequency ?? "")) ?? "daily";
  const watchRepeat = clampRepeatCount(
    watchFrequency,
    typeof watchRow?.repeat_count === "number" ? watchRow.repeat_count : Number(watchRow?.repeat_count ?? 1),
    plan.watchMaxDailyRepeats,
  );
  const watchNotify: WatchNotifyMode =
    parseWatchNotifyMode(String(watchRow?.notify_mode ?? "")) ?? "change_only";
  const watchNotifyOnMetadata = Boolean(watchRow?.notify_on_metadata);

  const screenshotExpired = isObservationScreenshotExpired(obs, plan.retentionDays);
  const storedVisibleImage = visibleSnapshotImageUrl(obs, plan.retentionDays);
  const live =
    !screenshotExpired &&
    obs.status === "success" &&
    (!storedVisibleImage || !obs.pageTitle)
      ? await getCachedUrlPreviewForObservation(obs.url, obs.regionValue)
      : null;

  const displayTitle = obs.pageTitle ?? live?.title ?? null;
  const displayImageUrl = storedVisibleImage ?? (screenshotExpired ? null : live?.image ?? null);
  const resolvedCanonical = live?.canonicalUrl ?? null;

  const previousRaw =
    obs.regionValue && displayImageUrl
      ? await findPreviousObservationWithSnapshot(supabase, {
          userId: session.userId,
          url: obs.url,
          region: obs.regionValue,
          beforeCapturedAt: obs.capturedAt,
          excludeId: obs.id,
        })
      : null;

  const compareRelated =
    obs.url && obs.regionValue ? await listObservationsForUrlIdentity(obs.url) : [obs];
  const compareSiblings = compareRelated.filter(
    (row) => (row.regionValue ?? "") === (obs.regionValue ?? ""),
  );

  const captureConditionsCopy = observationCaptureConditionsCopyFrom(t);
  const geoCopy = observationGeoCopyFrom(t);

  const htmlHeadSignalsCopy = observationHtmlHeadCopyFrom(t);
  const aiAuditCopy = observationAiAuditCopyFrom(t);
  const existingAudit = await loadObservationAiAudit(supabase, session.userId, obs.id);
  const pack = buildObservationEvidencePack({
    obs,
    verifyUrl,
    hideSnapshotImage: screenshotExpired,
  });

  const comparePrevious = previousRaw
    ? {
        id: previousRaw.id,
        snapshotImageUrl: previousRaw.snapshotImageUrl,
        capturedAtLabel: `${formatJaDateTime(previousRaw.capturedAt, locale)} · ${formatUtcLabel(previousRaw.capturedAt)}`,
      }
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href="/dashboard/observations"
          className="font-medium text-accent hover:text-accent-hover"
        >
          {t.backToList}
        </Link>
      </div>

      {sp.error === "save" ? (
        <div
          role="alert"
          className="rounded-lg border border-rose-300/90 bg-rose-50 px-4 py-3 text-sm text-rose-950"
        >
          <p className="font-semibold">{autoObsCopy.saveError}</p>
          <p className="mt-1 text-xs leading-relaxed text-rose-900/90">{autoObsCopy.saveErrorHint}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{t.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold">
          <Link
            href={`/dashboard/observations/${obs.id}/verification`}
            className="text-accent hover:text-accent-hover"
          >
            {vr.openReport} →
          </Link>
          <Link
            href={`/dashboard/observations/${obs.id}/report`}
            className="text-ink-muted hover:text-accent"
          >
            {rt.openReport} →
          </Link>
        </div>
      </div>

      <ObservationCaptureTierBanner
        obs={obs}
        locale={locale}
        screenshotExpired={screenshotExpired}
      />

      <ObservationComparePrompt
        observation={obs}
        timeSiblings={compareSiblings}
        regionCandidates={compareRelated}
        locale={locale}
      />

      <ObservationMetadataChanges
        current={obs}
        timeSiblings={compareSiblings}
        locale={locale}
      />

      <section className="space-y-6" aria-labelledby="observation-record-heading">
        <div className="space-y-1">
          <h2 id="observation-record-heading" className="font-display text-lg font-semibold text-ink">
            {t.recordSectionTitle}
          </h2>
          <p className="text-sm text-ink-muted">{t.recordSectionHint}</p>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface-elevated p-4">
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              {t.capturedAt}
            </dt>
            <dd className="mt-1 text-sm text-ink">{formatJaDateTime(obs.capturedAt, locale)}</dd>
            <dd className="mt-0.5 text-xs text-ink-muted">
              {formatUtcLabel(obs.capturedAt)}
            </dd>
          </div>
          <div className="rounded-xl border border-border bg-surface-elevated p-4">
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              {t.region}
            </dt>
            <dd className="mt-1 text-sm text-ink">
              <ObservationRegionReadout
                requestedLabel={obs.regionLabel}
                regionValue={obs.regionValue}
                captureConditions={obs.captureConditions}
                copy={geoCopy}
                locale={locale}
              />
            </dd>
          </div>
          {displayTitle ? (
            <div className="rounded-xl border border-border bg-surface-elevated p-4 sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {t.pageTitleCaptured}
              </dt>
              <dd className="mt-1 text-sm text-ink">{displayTitle}</dd>
            </div>
          ) : null}
          <div className="rounded-xl border border-border bg-surface-elevated p-4 sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              {t.url}
            </dt>
            <dd className="mt-1 break-all font-mono text-sm text-ink">{obs.url}</dd>
          </div>
          <div className="rounded-xl border border-border bg-surface-elevated p-4 sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              {t.captureOutcome}
            </dt>
            <dd className="mt-1 text-sm text-ink">
              {obs.status === "success"
                ? t.statusSuccess
                : obs.status === "failure"
                  ? t.statusFailure
                  : t.statusPending}
            </dd>
          </div>
          <ObservationCaptureConditionsPanel
            conditions={obs.captureConditions}
            copy={captureConditionsCopy}
            locale={locale}
          />
          <ObservationHtmlHeadSignalsPanel
            signals={obs.captureConditions?.html_signals}
            copy={htmlHeadSignalsCopy}
            requestedUrl={obs.url}
          />
        </dl>

        <ObservationLpVerdictCard
          copy={{
            title: t.lpVerdictTitle,
            hint: t.lpVerdictHint,
            codeLpRendered: t.lpVerdictRendered,
            codeLpNoSnapshot: t.lpVerdictNoSnapshot,
            codeLpCaptureFailed: t.lpVerdictFailed,
            codeLpPending: t.lpVerdictPending,
            snapshotLabel: t.lpVerdictSnapshot,
            snapshotYes: t.lpVerdictSnapshotYes,
            snapshotNo: t.lpVerdictSnapshotNo,
            httpStatus: t.lpVerdictHttp,
            captureScope: t.lpVerdictScope,
            scopeFullPage: t.captureScopeFullPage,
            scopeViewport: t.captureScopeViewport,
            scopeUnknown: "—",
          }}
          code={pack.verdict.code}
          snapshotPresent={pack.verdict.snapshotPresent}
          httpStatus={pack.verdict.httpStatus}
          captureScope={pack.verdict.captureScope}
        />

        <div className="space-y-1">
          <h3 className="font-display text-lg font-semibold text-ink">{t.evidenceTitle}</h3>
          <p className="text-sm text-ink-muted">{t.evidenceHint}</p>
        </div>

        <ObservationSnapshotBinaryPanel
          observationId={obs.id}
          locale={locale}
          snapshotSha256={obs.snapshotSha256}
          snapshotPhash={obs.snapshotPhash}
          snapshotBytes={obs.snapshotBytes}
          snapshotContentType={obs.snapshotContentType}
          snapshotImageUrl={storedVisibleImage}
          verifyUrl={verifyUrl}
        />

        <ObservationDetailSnapshotSection
          obs={obs}
          displayTitle={displayTitle}
          displayImageUrl={displayImageUrl}
          resolvedCanonical={resolvedCanonical}
          locale={locale}
          comparePrevious={comparePrevious}
          screenshotExpired={screenshotExpired}
        />
      </section>

      <ObservationAiAuditPanel
        copy={aiAuditCopy}
        observationId={obs.id}
        locale={locale}
        initialAudit={existingAudit}
      />

      <section className="space-y-6" aria-labelledby="observation-share-heading">
        <h2 id="observation-share-heading" className="sr-only">
          {t.verifyLinkTitle}
        </h2>

        {verifyUrl ? (
          <ObservationPublicVerifyLink
            verifyUrl={verifyUrl}
            title={t.verifyLinkTitle}
            copyButton={t.verifyLinkCopy}
            copiedLabel={t.verifyLinkCopied}
            failedLabel={t.verifyLinkCopyFailed}
          />
        ) : null}

        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {t.evidenceJsonTitle}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t.evidenceJsonHint}</p>
          <div className="mt-3">
            <ObservationEvidenceJsonDownload
              fileName={`viewtrace-${obs.id}.json`}
              json={pack}
              downloadLabel={t.evidenceJsonDownload}
              copyLabel={t.evidenceJsonCopy}
              copiedLabel={t.evidenceJsonCopied}
            />
          </div>
        </div>

        <ObservationLivePageComparePanel
          observationId={obs.id}
          locale={locale}
          regionLabel={obs.regionLabel}
          canCompare={
            obs.status === "success" &&
            Boolean(storedVisibleImage) &&
            Boolean(obs.regionValue?.trim()) &&
            Boolean(obs.url?.trim())
          }
        />

        <ObservationDigitalSeal obs={obs} locale={locale} />

        {plan.autoObservationWatch && obs.regionValue ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            <ObservationWatchPanel
              url={obs.url}
              regionValue={obs.regionValue}
              regionLabel={obs.regionLabel}
              observationId={obs.id}
              initialEnabled={watchEnabled}
              initialFrequency={watchFrequency}
              initialRepeat={watchRepeat}
              initialNotify={watchNotify}
              initialNotifyOnMetadata={watchNotifyOnMetadata}
              copy={{
                title: t.watchTitle,
                intro: t.watchIntro,
                frequencyLabel: t.watchFrequencyLabel,
                frequencyDaily: t.watchFrequencyDaily,
                frequencyWeekly: t.watchFrequencyWeekly,
                frequencyMonthly: t.watchFrequencyMonthly,
                repeatLabel: t.watchRepeatLabel,
                notifyLabel: t.watchNotifyLabel,
                notifyAlways: t.watchNotifyAlways,
                notifyChangeOnly: t.watchNotifyChangeOnly,
                notifyOnMetadata: t.watchNotifyMetadata,
                notifyOnMetadataHint: t.watchNotifyMetadataHint,
                notifyOnMetadataOn: t.watchNotifyMetadataOn,
                notifyOnMetadataOff: t.watchNotifyMetadataOff,
                monitoringOn: t.watchMonitoringOn,
                monitoringOff: t.watchMonitoringOff,
                monitoringStateLabel: t.watchMonitoringStateLabel,
                estimateLabel: t.watchEstimateLabel,
                estimateValue: t.watchEstimateValue,
                planIncludes: t.watchPlanIncludes,
                unitHint: t.watchUnitHint,
                save: t.watchSave,
                webhookLabel: t.watchWebhookLabel,
                webhookHint: t.watchWebhookHint,
                webhookPlaceholder: t.watchWebhookPlaceholder,
                webhookSample: t.watchWebhookSample,
                shareButton: t.watchShareButton,
                shareCopied: t.watchShareCopied,
                shareFailed: t.watchShareFailed,
                csvExportButton: t.watchCsvExportButton,
                csvExportPending: t.watchCsvExportPending,
                csvAuditCheckbox: csvExportCopy.auditCheckbox,
                csvModeStandard: csvExportCopy.modeStandard,
                csvModeAudit: csvExportCopy.modeAudit,
              }}
              initialWebhookUrl={watchWebhookUrl || null}
              showShare={plan.autoObservationWatch}
              showCsvExport={plan.csvExport}
              monthlyLimit={plan.monthlyObservations}
              maxDailyRepeats={plan.watchMaxDailyRepeats}
            />
          </dl>
        ) : null}

        <ObservationAnnotationPanel
          observationId={obs.id}
          locale={locale}
          initialNote={obs.note ?? ""}
          initialTags={obs.tags ?? []}
          initialFolder={obs.folder ?? ""}
          initialReviewStatus={obs.reviewStatus}
        />
      </section>
    </div>
  );
}
