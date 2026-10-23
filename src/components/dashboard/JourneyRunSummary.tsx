import { journeyCustomerConclusion, journeyRunEvidence, parseJourneyGeoStage, type JourneyConclusionDefined, type JourneyConclusionStep } from "@/lib/journey-conclusion";
import type { JourneyDeviceClass } from "@/lib/journey-definition";
import type { Locale } from "@/lib/i18n";

export function JourneyRunSummary({
  region,
  environment,
  device,
  steps,
  defined,
  locale,
}: {
  region: string;
  environment: unknown;
  device: JourneyDeviceClass;
  steps: JourneyConclusionStep[];
  defined?: JourneyConclusionDefined[] | null;
  locale: Locale;
}) {
  const conclusion = journeyCustomerConclusion({
    region,
    stage: parseJourneyGeoStage(environment),
    device,
    steps,
    locale,
  });
  const evidence = journeyRunEvidence({ steps, defined, locale });
  if (!conclusion && !evidence.length) return null;
  return (
    <div className="mt-3">
      {conclusion ? <p className="text-sm font-semibold text-ink">{conclusion}</p> : null}
      {evidence.length ? (
        <div className="mt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{locale === "ja" ? "証拠" : "Evidence"}</p>
          <dl className="mt-1 space-y-0.5 text-xs text-ink">
            {evidence.map((line, index) => (
              <div key={`${line.label}-${index}`} className="flex gap-3">
                <dt className="w-40 shrink-0 text-ink-muted">{line.label}</dt>
                <dd className="min-w-0 break-all">{line.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </div>
  );
}
