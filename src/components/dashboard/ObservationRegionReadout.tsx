import { observationGeoReadout, type ObservationGeoReadoutCopy } from "@/lib/observation-geo-readout";
import type { CaptureConditionsV1 } from "@/lib/capture-conditions";
import type { Locale } from "@/lib/i18n";

type Props = {
  requestedLabel: string;
  regionValue?: string | null;
  captureConditions?: CaptureConditionsV1 | null;
  copy: ObservationGeoReadoutCopy;
  locale: Locale;
  compact?: boolean;
};

export function ObservationRegionReadout({
  requestedLabel,
  regionValue,
  captureConditions,
  copy,
  locale,
  compact = false,
}: Props) {
  const readout = observationGeoReadout({
    requestedLabel,
    regionValue,
    captureConditions,
    copy,
    locale,
  });

  if (!readout.distinguish) {
    return <span>{readout.headline}</span>;
  }

  if (compact) {
    return (
      <span>
        {readout.headline}
        <span className="mt-0.5 block text-[11px] font-normal text-ink-muted">{readout.detailLine}</span>
      </span>
    );
  }

  return (
    <span>
      <span className="block">{readout.headline}</span>
      <span className="mt-1 block text-xs font-normal text-ink-muted">{readout.detailLine}</span>
    </span>
  );
}
