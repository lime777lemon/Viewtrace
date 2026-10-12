import { notFound } from "next/navigation";
import { ObservationComparePrompt } from "@/components/dashboard/ObservationComparePrompt";
import { ObservationCompareView } from "@/components/dashboard/ObservationCompareView";
import { ObservationDetectedFacts } from "@/components/dashboard/ObservationDetectedFacts";
import { ObservationAiAuditPanel } from "@/components/dashboard/ObservationAiAuditPanel";
import { ObservationAiAuditReadout } from "@/components/dashboard/ObservationAiAuditReadout";
import { observationAiAuditCopyFrom } from "@/lib/observation-ai-audit-copy";
import { buildRecordPageAudit } from "@/lib/observation-ai-audit";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";
import {
  ObservationHtmlHeadSignalsPanel,
  observationHtmlHeadCopyFrom,
} from "@/components/dashboard/ObservationHtmlHeadSignalsPanel";
import {
  ObservationPageSignalsPanel,
  observationPageSignalsCopyFrom,
} from "@/components/dashboard/ObservationPageSignalsPanel";
import { ObservationOptionalMetricsPanel } from "@/components/dashboard/ObservationOptionalMetricsPanel";
import { observationOptionalMetricsCopyFrom } from "@/lib/observation-optional-metrics-copy";
import type { LabCwvV1 } from "@/lib/observation-lab-cwv";
import type { FieldCwvV1 } from "@/lib/observation-field-cwv";
import type { SyntheticInteractionV1 } from "@/lib/observation-synthetic-interaction";
import type { SubpageScoresV1 } from "@/lib/observation-subpages";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { compareObservations, orderObservationsByCapturedAt } from "@/lib/observation-compare";
import type { Observation } from "@/lib/demo/observations";
import {
  compareFixtureOnce,
  compareFixtureRegionLeft,
  compareFixtureRegionRight,
  compareFixtureTimeLeft,
  compareFixtureTimeRight,
} from "@/lib/observation-compare-fixtures";

function previewAuditObservation(): Observation {
  const conditions = compareFixtureTimeRight.captureConditions;
  const signals = conditions?.html_signals;
  if (!conditions || !signals) return compareFixtureTimeRight;
  return {
    ...compareFixtureTimeRight,
    captureConditions: {
      ...conditions,
      html_signals: {
        ...signals,
        document_title: "",
        noindex: true,
        html_lang: "en",
      },
    },
  };
}

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false }, title: "Compare preview" };

type Props = { searchParams: Promise<{ fixture?: string; field?: string }> };

export default async function DevComparePreviewPage({ searchParams }: Props) {
  if (process.env.NODE_ENV !== "development") notFound();
  const locale = await getRequestLocale();
  const params = await searchParams;
  const t = copy[locale].observationCompare;
  const htmlCopy = observationHtmlHeadCopyFrom(copy[locale].observationDetail);
  const pageSignalsCopy = observationPageSignalsCopyFrom(copy[locale].observationDetail);
  const optionalMetricsCopy = observationOptionalMetricsCopyFrom(copy[locale].observationDetail);
  const aiAuditCopy = observationAiAuditCopyFrom(copy[locale].observationDetail);
  const previewLabCwv: LabCwvV1 = {
    schema_version: 1,
    source: "browserless_lighthouse",
    measured_at: compareFixtureTimeRight.capturedAt,
    url: compareFixtureTimeRight.url,
    lcp_ms: 5580,
    cls: 0.006,
    tbt_ms: 608,
    fcp_ms: 5290,
    inp_ms: null,
    duration_ms: 42000,
    proxy_bytes: null,
    error: null,
  };
  const previewFieldCwv: FieldCwvV1 =
    params.field === "empty"
      ? {
          schema_version: 1,
          source: "chrome_ux_report",
          measured_at: compareFixtureTimeRight.capturedAt,
          requested_url: "https://viewtrace.net/",
          origin: "https://viewtrace.net",
          crux_key: "https://viewtrace.net/",
          scope: null,
          inp_ms: null,
          lcp_ms: null,
          cls: null,
          collection_first: null,
          collection_last: null,
          error: "no_data",
        }
      : {
          schema_version: 1,
          source: "chrome_ux_report",
          measured_at: compareFixtureTimeRight.capturedAt,
          requested_url: compareFixtureTimeRight.url,
          origin: "https://example.com",
          crux_key: "https://example.com",
          scope: "origin",
          inp_ms: 184,
          lcp_ms: 2100,
          cls: 0.04,
          collection_first: "2026-09-14",
          collection_last: "2026-10-11",
          error: null,
        };
  const previewSynthetic: SyntheticInteractionV1 = {
    schema_version: 1,
    source: "browserless_click",
    measured_at: compareFixtureTimeRight.capturedAt,
    requested_url: compareFixtureTimeRight.url,
    duration_ms: 12000,
    proxy_bytes: null,
    skipped_unsafe: 2,
    interactions: [
      {
        label: "Navigation menu",
        kind: "nav",
        latency_ms: 142,
        navigated: false,
        error: null,
      },
      {
        label: "Features",
        kind: "link",
        latency_ms: 118,
        navigated: true,
        error: null,
      },
    ],
    error: null,
  };
  const previewSubpages: SubpageScoresV1 = {
    schema_version: 1,
    source: "same_origin_html_fetch",
    measured_at: compareFixtureTimeRight.capturedAt,
    screenshot: false,
    origin: "https://example.com",
    max_pages: 10,
    pages: [
      {
        url: "https://example.com/features",
        path: "/features",
        title: null,
        http_status: 200,
        score: 47,
        band: "attention",
        reason_ids: [
          "title_missing",
          "description_missing",
          "canonical_missing",
          "robots_missing",
          "og_missing",
          "twitter_missing",
        ],
        error: null,
      },
      {
        url: "https://example.com/contact",
        path: "/contact",
        title: null,
        http_status: 200,
        score: 47,
        band: "attention",
        reason_ids: [
          "title_missing",
          "description_missing",
          "canonical_missing",
          "robots_missing",
          "og_missing",
          "twitter_missing",
        ],
        error: null,
      },
      {
        url: "https://example.com/checkout",
        path: "/checkout",
        title: "お支払い",
        http_status: 200,
        score: 57,
        band: "attention",
        reason_ids: [
          "description_missing",
          "canonical_missing",
          "robots_missing",
          "og_missing",
          "twitter_missing",
        ],
        error: null,
      },
      {
        url: "https://example.com/for/agency",
        path: "/for/agency",
        title: "Monitor, detect, prove — geo landing-page checks for agencies",
        http_status: 200,
        score: 97,
        band: "good",
        reason_ids: ["twitter_missing"],
        error: null,
      },
      {
        url: "https://example.com/for/performance-agency",
        path: "/for/performance-agency",
        title: "Monitor, detect, prove — landing-page protection for performance agencies",
        http_status: 200,
        score: 97,
        band: "good",
        reason_ids: ["twitter_missing"],
        error: null,
      },
      {
        url: "https://example.com/terms",
        path: "/terms",
        title: null,
        http_status: 200,
        score: 47,
        band: "attention",
        reason_ids: [
          "title_missing",
          "description_missing",
          "canonical_missing",
          "robots_missing",
          "og_missing",
          "twitter_missing",
        ],
        error: null,
      },
    ],
  };
  const fixture = params.fixture?.trim() ?? "time";

  return (
    <div className="min-h-screen bg-surface px-4 py-8 text-ink">
      <p className="mx-auto mb-6 max-w-5xl text-xs text-ink-muted">{t.title} preview (dev)</p>
      <div className="mx-auto max-w-5xl">
        {fixture === "prompt" ? (
          <ObservationComparePrompt
            observation={compareFixtureOnce}
            timeSiblings={[compareFixtureOnce]}
            regionCandidates={[]}
            locale={locale}
          />
        ) : null}
        {fixture === "time" ? (
          <>
            <ObservationCompareView
              left={orderObservationsByCapturedAt(compareFixtureTimeLeft, compareFixtureTimeRight)[0]}
              right={orderObservationsByCapturedAt(compareFixtureTimeLeft, compareFixtureTimeRight)[1]}
              siblings={[compareFixtureTimeLeft, compareFixtureTimeRight]}
              fields={compareObservations(compareFixtureTimeLeft, compareFixtureTimeRight)}
              locale={locale}
              retentionDays={60}
              mode="time"
            />
            <div className="mt-8 space-y-6">
              <ObservationDetectedFacts
                current={previewAuditObservation()}
                timeSiblings={[compareFixtureTimeLeft, previewAuditObservation()]}
                locale={locale}
              />
              <ObservationHtmlHeadSignalsPanel
                signals={compareFixtureTimeRight.captureConditions?.html_signals}
                copy={htmlCopy}
                requestedUrl={compareFixtureTimeRight.url}
              />
              <ObservationPageSignalsPanel
                signals={previewAuditObservation().captureConditions?.html_signals}
                copy={pageSignalsCopy}
                history={[
                  {
                    id: compareFixtureTimeLeft.id,
                    capturedAt: compareFixtureTimeLeft.capturedAt,
                    signals: compareFixtureTimeLeft.captureConditions?.html_signals,
                  },
                  {
                    id: previewAuditObservation().id,
                    capturedAt: previewAuditObservation().capturedAt,
                    signals: previewAuditObservation().captureConditions?.html_signals,
                  },
                ]}
                currentId={previewAuditObservation().id}
                locale={locale}
              />
              <ObservationOptionalMetricsPanel
                copy={optionalMetricsCopy}
                initialLabCwv={previewLabCwv}
                initialFieldCwv={previewFieldCwv}
                initialSynthetic={previewSynthetic}
                initialSubpages={previewSubpages}
                labCwvUsed={1}
                labCwvLimit={10}
                fieldCwvUsed={1}
                fieldCwvLimit={50}
                syntheticUsed={1}
                syntheticLimit={10}
                subpageMaxLinks={5}
                browserlessConfigured={false}
                cruxConfigured={false}
              />
              <ObservationAiAuditPanel
                copy={aiAuditCopy}
                previewAudit={buildRecordPageAudit(
                  previewAuditObservation(),
                  locale,
                  compareFixtureTimeLeft,
                )}
              />
              <div className="rounded-2xl border border-dashed border-border bg-surface-elevated px-5 py-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  PDF preview
                </p>
                <ObservationAiAuditReadout
                  copy={aiAuditCopy}
                  audit={buildRecordPageAudit(
                    previewAuditObservation(),
                    locale,
                    compareFixtureTimeLeft,
                  )}
                  generatedAtLabel={`${formatJaDateTime(compareFixtureTimeRight.capturedAt, locale)} · ${formatUtcLabel(compareFixtureTimeRight.capturedAt)}`}
                />
              </div>
            </div>
          </>
        ) : null}
        {fixture === "region" ? (
          <ObservationCompareView
            left={compareFixtureRegionLeft}
            right={compareFixtureRegionRight}
            siblings={[compareFixtureRegionLeft, compareFixtureRegionRight]}
            fields={compareObservations(compareFixtureRegionLeft, compareFixtureRegionRight)}
            locale={locale}
            retentionDays={60}
            mode="region"
          />
        ) : null}
      </div>
    </div>
  );
}
