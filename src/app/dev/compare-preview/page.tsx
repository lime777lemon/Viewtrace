import { notFound } from "next/navigation";
import { ObservationComparePrompt } from "@/components/dashboard/ObservationComparePrompt";
import { ObservationCompareView } from "@/components/dashboard/ObservationCompareView";
import { ObservationAiAuditPanel } from "@/components/dashboard/ObservationAiAuditPanel";
import { observationAiAuditCopyFrom } from "@/lib/observation-ai-audit-copy";
import { buildRecordPageAudit } from "@/lib/observation-ai-audit";
import {
  ObservationHtmlHeadSignalsPanel,
  observationHtmlHeadCopyFrom,
} from "@/components/dashboard/ObservationHtmlHeadSignalsPanel";
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

type Props = { searchParams: Promise<{ fixture?: string }> };

export default async function DevComparePreviewPage({ searchParams }: Props) {
  if (process.env.NODE_ENV !== "development") notFound();
  const locale = await getRequestLocale();
  const t = copy[locale].observationCompare;
  const htmlCopy = observationHtmlHeadCopyFrom(copy[locale].observationDetail);
  const aiAuditCopy = observationAiAuditCopyFrom(copy[locale].observationDetail);
  const fixture = (await searchParams).fixture?.trim() ?? "time";

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
              <ObservationHtmlHeadSignalsPanel
                signals={compareFixtureTimeRight.captureConditions?.html_signals}
                copy={htmlCopy}
                requestedUrl={compareFixtureTimeRight.url}
              />
              <ObservationAiAuditPanel
                copy={aiAuditCopy}
                previewAudit={buildRecordPageAudit(previewAuditObservation(), locale)}
              />
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
