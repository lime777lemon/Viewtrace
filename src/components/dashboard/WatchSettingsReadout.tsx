import type { WatchFrequency } from "@/lib/observation-watch-schedule";
import type { WatchScheduleFieldsCopy, WatchScheduleValues } from "@/components/dashboard/WatchScheduleFields";

function frequencyLabel(copy: WatchScheduleFieldsCopy, f: WatchFrequency): string {
  if (f === "daily") return copy.frequencyDaily;
  if (f === "weekly") return copy.frequencyWeekly;
  return copy.frequencyMonthly;
}

type Props = {
  heading: string;
  scheduleCopy: WatchScheduleFieldsCopy;
  urlFieldLabel: string;
  regionFieldLabel: string;
  urlDisplay: string;
  regionDisplay: string;
  values: WatchScheduleValues;
  footnote?: string;
};

/** 自動観測フォームの設定を一覧で読めるようにする（常時表示用） */
export function WatchSettingsReadout({
  heading,
  scheduleCopy,
  urlFieldLabel,
  regionFieldLabel,
  urlDisplay,
  regionDisplay,
  values,
  footnote,
}: Props) {
  const monitoring = values.enabled ? scheduleCopy.monitoringOn : scheduleCopy.monitoringOff;
  const notify =
    values.notify === "always" ? scheduleCopy.notifyAlways : scheduleCopy.notifyChangeOnly;
  const freq = frequencyLabel(scheduleCopy, values.frequency);
  const repeat = String(values.repeat);

  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm shadow-sm" aria-live="polite">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{heading}</p>
      <dl className="mt-2 space-y-2 text-ink">
        <div className="grid gap-0.5 sm:grid-cols-[minmax(7.5rem,auto)_1fr] sm:gap-x-3 sm:gap-y-0">
          <dt className="text-xs font-medium text-ink-muted">{urlFieldLabel}</dt>
          <dd className="min-w-0 break-all font-mono text-xs leading-relaxed sm:text-sm">{urlDisplay}</dd>
        </div>
        <div className="grid gap-0.5 sm:grid-cols-[minmax(7.5rem,auto)_1fr] sm:gap-x-3">
          <dt className="text-xs font-medium text-ink-muted">{regionFieldLabel}</dt>
          <dd className="text-xs leading-relaxed sm:text-sm">{regionDisplay}</dd>
        </div>
        <div className="grid gap-0.5 sm:grid-cols-[minmax(7.5rem,auto)_1fr] sm:gap-x-3">
          <dt className="text-xs font-medium text-ink-muted">{scheduleCopy.monitoringStateLabel}</dt>
          <dd className="text-xs leading-relaxed sm:text-sm">{monitoring}</dd>
        </div>
        <div className="grid gap-0.5 sm:grid-cols-[minmax(7.5rem,auto)_1fr] sm:gap-x-3">
          <dt className="text-xs font-medium text-ink-muted">{scheduleCopy.frequencyLabel}</dt>
          <dd className="text-xs leading-relaxed sm:text-sm">{freq}</dd>
        </div>
        <div className="grid gap-0.5 sm:grid-cols-[minmax(7.5rem,auto)_1fr] sm:gap-x-3">
          <dt className="text-xs font-medium text-ink-muted">{scheduleCopy.repeatLabel}</dt>
          <dd className="text-xs leading-relaxed sm:text-sm">{repeat}</dd>
        </div>
        <div className="grid gap-0.5 sm:grid-cols-[minmax(7.5rem,auto)_1fr] sm:gap-x-3">
          <dt className="text-xs font-medium text-ink-muted">{scheduleCopy.notifyLabel}</dt>
          <dd className="text-xs leading-relaxed sm:text-sm">{notify}</dd>
        </div>
      </dl>
      {footnote ? <p className="mt-3 border-t border-border pt-2 text-xs text-ink-muted">{footnote}</p> : null}
    </div>
  );
}
