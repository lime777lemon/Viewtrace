import { ObservationAiAuditReadout } from "@/components/dashboard/ObservationAiAuditReadout";
import {
  ObservationCaptureConditionsPanel,
  observationCaptureConditionsCopyFrom,
} from "@/components/dashboard/ObservationCaptureConditionsPanel";
import { ObservationCaptureTierBanner } from "@/components/dashboard/ObservationCaptureTierBanner";
import { ObservationCheckSummary } from "@/components/dashboard/ObservationCheckSummary";
import { ObservationDetailSnapshotSection } from "@/components/dashboard/ObservationDetailSnapshotSection";
import { ObservationDetectedFacts } from "@/components/dashboard/ObservationDetectedFacts";
import { ObservationDigitalSeal } from "@/components/dashboard/ObservationDigitalSeal";
import { ObservationEvidenceHashes } from "@/components/dashboard/ObservationEvidenceHashes";
import { ObservationEvidenceJsonDownload } from "@/components/dashboard/ObservationEvidenceJsonDownload";
import {
  ObservationHtmlHeadSignalsPanel,
  observationHtmlHeadCopyFrom,
} from "@/components/dashboard/ObservationHtmlHeadSignalsPanel";
import { ObservationInteractionCheckPanel } from "@/components/dashboard/ObservationInteractionCheckPanel";
import { ObservationJourneyPanel } from "@/components/dashboard/ObservationJourneyPanel";
import { ObservationLpVerdictCard } from "@/components/dashboard/ObservationLpVerdictCard";
import { ObservationMeasurementsPanel } from "@/components/dashboard/ObservationMeasurementsPanel";
import { ObservationOptionalMetricsPanel } from "@/components/dashboard/ObservationOptionalMetricsPanel";
import {
  ObservationPageSignalsPanel,
  observationPageSignalsCopyFrom,
} from "@/components/dashboard/ObservationPageSignalsPanel";
import { ObservationPublicVerifyLink } from "@/components/dashboard/ObservationPublicVerifyLink";
import { ObservationRegionReadout } from "@/components/dashboard/ObservationRegionReadout";
import { ObservationSeoFactsPanel } from "@/components/dashboard/ObservationSeoFactsPanel";
import { ObservationWebFactsPanel } from "@/components/dashboard/ObservationWebFactsPanel";
import type { EvidenceReportObservationDetailData } from "@/lib/evidence-report-observation-detail";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";
import { copy, type Locale } from "@/lib/i18n";
import { pageSeoForCapture } from "@/lib/measurement-record";
import { observationAiAuditCopyFrom } from "@/lib/observation-ai-audit-copy";
import { observationGeoCopyFrom } from "@/lib/observation-geo-readout";
import { isHomepageLiveCheckObservation } from "@/lib/observation-homepage-mode";
import { observationOptionalMetricsCopyFrom } from "@/lib/observation-optional-metrics-copy";
import { decodeHtmlText } from "@/lib/url-preview";

type Props = {
  data: EvidenceReportObservationDetailData;
  locale: Locale;
};

/**
 * 公開 Evidence Report の 1 記録ぶん。`/dashboard/observations/[id]` と同じ材料を同じ順で出す。
 *
 * 記録 → 検出した事実 → 監査（AI）。
 * 実行・設定・Watch・ダッシュボード導線は出さない（ログインが要るため）。保存済みの事実だけ。
 */
export function EvidenceReportObservationDetail({ data, locale }: Props) {
  const t = copy[locale].observationDetail;
  const {
    obs,
    verifyUrl,
    screenshotExpired,
    storedVisibleImage,
    compareSiblings,
    previousRaw,
    previousCapture,
    storedScroll,
    previousStored,
    storedSynthetic,
    storedLabCwv,
    storedFieldCwv,
    storedSubpages,
    journeyPeers,
    peerSynthetics,
    peerScrolls,
    aiAudit,
    checkRun,
    pack,
  } = data;

  const captureConditionsCopy = observationCaptureConditionsCopyFrom(t);
  const geoCopy = observationGeoCopyFrom(t);
  const htmlHeadSignalsCopy = observationHtmlHeadCopyFrom(t);
  const pageSignalsCopy = observationPageSignalsCopyFrom(t);
  const optionalMetricsCopy = observationOptionalMetricsCopyFrom(t);
  const aiAuditCopy = observationAiAuditCopyFrom(t);

  const homepageLive = isHomepageLiveCheckObservation(obs);
  const displayTitle = decodeHtmlText(obs.pageTitle ?? null);
  const displayImageUrl = homepageLive ? null : storedVisibleImage;
  const optionalScroll = storedScroll?.result ?? null;
  const optionalSynthetic = storedSynthetic?.result ?? null;

  const comparePrevious = previousRaw
    ? {
        id: previousRaw.id,
        snapshotImageUrl: previousRaw.snapshotImageUrl,
        capturedAtLabel: `${formatJaDateTime(previousRaw.capturedAt, locale)} · ${formatUtcLabel(previousRaw.capturedAt)}`,
      }
    : null;

  return (
    <article
      id={`observation-${obs.id}`}
      className="scroll-mt-24 space-y-8 rounded-2xl border border-border bg-surface px-4 py-6 shadow-sm sm:px-6"
    >
      <header className="space-y-1">
        <p className="font-mono text-xs text-ink-muted">{obs.id}</p>
        <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
          {formatJaDateTime(obs.capturedAt, locale)}
          <span className="ml-2 text-sm font-normal text-ink-muted">{formatUtcLabel(obs.capturedAt)}</span>
        </h3>
        <p className="break-all font-mono text-xs text-ink">{obs.url}</p>
      </header>

      {checkRun ? (
        <ObservationCheckSummary
          loaded={checkRun}
          observationId={obs.id}
          locale={locale}
          seo={pageSeoForCapture(obs.captureConditions)}
          check={optionalScroll}
          behaviorDiff={storedScroll?.behavior_diff ?? null}
          publicView
        />
      ) : null}

      <ObservationCaptureTierBanner obs={obs} locale={locale} screenshotExpired={screenshotExpired} publicView />

      <section className="space-y-6" aria-label={t.recordSectionTitle}>
        <h4 className="font-display text-lg font-semibold text-ink">{t.recordSectionTitle}</h4>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface-elevated p-4">
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t.capturedAt}</dt>
            <dd className="mt-1 text-sm text-ink">{formatJaDateTime(obs.capturedAt, locale)}</dd>
            <dd className="mt-0.5 text-xs text-ink-muted">{formatUtcLabel(obs.capturedAt)}</dd>
          </div>
          <div className="rounded-xl border border-border bg-surface-elevated p-4">
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t.region}</dt>
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
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t.pageTitleCaptured}</dt>
              <dd className="mt-1 text-sm text-ink">{displayTitle}</dd>
            </div>
          ) : null}
          <div className="rounded-xl border border-border bg-surface-elevated p-4 sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t.url}</dt>
            <dd className="mt-1 break-all font-mono text-sm text-ink">{obs.url}</dd>
          </div>
          <div className="rounded-xl border border-border bg-surface-elevated p-4 sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t.captureOutcome}</dt>
            <dd className="mt-1 text-sm text-ink">
              {obs.status === "success" ? t.statusSuccess : obs.status === "failure" ? t.statusFailure : t.statusPending}
            </dd>
          </div>
        </dl>

        <ObservationMeasurementsPanel
          current={obs}
          timeSiblings={compareSiblings}
          locale={locale}
          synthetic={optionalSynthetic}
          session={optionalScroll?.discovery?.session ?? null}
          renderedPage={optionalScroll?.discovery?.rendered_page ?? null}
          behaviorTypes={optionalScroll?.types ?? null}
          journeyRuns={checkRun?.journeyRuns ?? []}
        />

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

        <ObservationDetailSnapshotSection
          obs={obs}
          displayTitle={displayTitle}
          displayImageUrl={displayImageUrl}
          resolvedCanonical={null}
          locale={locale}
          comparePrevious={comparePrevious}
          screenshotExpired={screenshotExpired}
          publicView
        />

        <ObservationDetectedFacts current={obs} timeSiblings={compareSiblings} locale={locale} publicView />

        <ObservationJourneyPanel
          observationId={obs.id}
          regionLabel={obs.regionLabel}
          observationStatus={obs.status}
          initialSynthetic={optionalSynthetic}
          regionPeers={journeyPeers.map((row) => ({
            observationId: row.id,
            regionLabel: row.regionLabel,
            status: row.status,
            synthetic: peerSynthetics.get(row.id) ?? null,
          }))}
          locale={locale}
          canRun={false}
          used={0}
          limit={0}
          readOnly
        />

        <ObservationInteractionCheckPanel
          observationId={obs.id}
          regionLabel={obs.regionLabel}
          initialCheck={optionalScroll}
          regionPeers={journeyPeers.map((row) => ({
            observationId: row.id,
            regionLabel: row.regionLabel,
            check: peerScrolls.get(row.id) ?? null,
          }))}
          locale={locale}
          canRun={false}
          used={0}
          limit={0}
          behaviorDiff={storedScroll?.behavior_diff ?? null}
          previousCheck={previousStored?.result ?? null}
          watchIncluded={storedScroll?.billing === "watch_included"}
          watchAnomaly={storedScroll?.watch_anomaly ?? null}
          observationUrl={obs.url}
          readOnly
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <ObservationHtmlHeadSignalsPanel
            signals={obs.captureConditions?.html_signals}
            copy={htmlHeadSignalsCopy}
            requestedUrl={obs.url}
            locale={locale === "ja" ? "ja" : "en"}
            previous={previousCapture?.captureConditions?.html_signals ?? null}
            webFacts={obs.captureConditions?.web_facts ?? null}
            previousWebFacts={previousCapture?.captureConditions?.web_facts ?? null}
            seo={pageSeoForCapture(obs.captureConditions)}
            previousSeo={pageSeoForCapture(previousCapture?.captureConditions)}
          />
          <ObservationSeoFactsPanel
            facts={obs.captureConditions?.seo_facts}
            html={obs.captureConditions?.html_signals}
            locale={locale}
          />
          <ObservationEvidenceHashes obs={obs} locale={locale} />
          <ObservationCaptureConditionsPanel
            conditions={obs.captureConditions}
            copy={captureConditionsCopy}
            locale={locale}
          />
        </div>

        <ObservationWebFactsPanel facts={obs.captureConditions?.web_facts} locale={locale} />
      </section>

      <ObservationPageSignalsPanel
        signals={obs.captureConditions?.html_signals}
        copy={pageSignalsCopy}
        history={compareSiblings.map((row) => ({
          id: row.id,
          capturedAt: row.capturedAt,
          signals: row.captureConditions?.html_signals,
        }))}
        currentId={obs.id}
        locale={locale}
      />

      {storedLabCwv || storedFieldCwv || storedSynthetic || storedSubpages?.pages.length ? (
        <ObservationOptionalMetricsPanel
          copy={optionalMetricsCopy}
          initialLabCwv={storedLabCwv?.result ?? null}
          initialFieldCwv={storedFieldCwv?.result ?? null}
          initialSynthetic={optionalSynthetic}
          initialSubpages={storedSubpages}
          labCwvUsed={0}
          labCwvLimit={0}
          fieldCwvUsed={0}
          fieldCwvLimit={0}
          syntheticUsed={0}
          syntheticLimit={0}
          subpageMaxLinks={0}
          browserlessConfigured
          cruxConfigured
          hideSyntheticRunner
          readOnly
        />
      ) : null}

      {aiAudit ? (
        <section className="rounded-2xl border border-dashed border-border bg-surface-elevated px-5 py-5 sm:px-6">
          <ObservationAiAuditReadout
            copy={aiAuditCopy}
            audit={aiAudit}
            locale={locale}
            generatedAtLabel={`${formatJaDateTime(aiAudit.createdAt, locale)} · ${formatUtcLabel(aiAudit.createdAt)}`}
          />
        </section>
      ) : null}

      <section className="space-y-6" aria-label={t.verifyLinkTitle}>
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
          <h5 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t.evidenceJsonTitle}</h5>
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

        <ObservationDigitalSeal obs={obs} locale={locale} />
      </section>
    </article>
  );
}
