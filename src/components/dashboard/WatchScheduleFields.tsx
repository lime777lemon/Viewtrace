"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  clampRepeatCount,
  maxRepeatForFrequency,
  parseWatchFrequency,
  type WatchFrequency,
  type WatchNotifyMode,
} from "@/lib/observation-watch-schedule";

export type WatchScheduleFieldsCopy = {
  frequencyLabel: string;
  frequencyDaily: string;
  frequencyWeekly: string;
  frequencyMonthly: string;
  repeatLabel: string;
  notifyLabel: string;
  notifyAlways: string;
  notifyChangeOnly: string;
  monitoringOn: string;
  monitoringOff: string;
  monitoringStateLabel: string;
};

export type WatchScheduleValues = {
  enabled: boolean;
  frequency: WatchFrequency;
  repeat: number;
  notify: WatchNotifyMode;
};

type Props = {
  copy: WatchScheduleFieldsCopy;
  initialEnabled: boolean;
  initialFrequency: WatchFrequency;
  initialRepeat: number;
  initialNotify: WatchNotifyMode;
  /** フォームの監視・スケジュール・通知の値が変わるたびに呼ばれる（要約表示など） */
  onValuesChange?: (v: WatchScheduleValues) => void;
};

/** 自動観測のスケジュール・通知・監視ON/OFF（Server Action の FormData 用 hidden 付き） */
export function WatchScheduleFields({
  copy,
  initialEnabled,
  initialFrequency,
  initialRepeat,
  initialNotify,
  onValuesChange,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [notify, setNotify] = useState<WatchNotifyMode>(initialNotify);
  const [frequency, setFrequency] = useState<WatchFrequency>(initialFrequency);
  const [repeat, setRepeat] = useState(() => clampRepeatCount(initialFrequency, initialRepeat));

  useEffect(() => {
    setRepeat((r) => clampRepeatCount(frequency, r));
  }, [frequency]);

  const onValuesChangeRef = useRef(onValuesChange);
  onValuesChangeRef.current = onValuesChange;

  useEffect(() => {
    onValuesChangeRef.current?.({
      enabled,
      frequency,
      repeat: clampRepeatCount(frequency, repeat),
      notify,
    });
  }, [enabled, frequency, repeat, notify]);

  useEffect(() => {
    setEnabled(initialEnabled);
    setNotify(initialNotify);
    setFrequency(initialFrequency);
    setRepeat(clampRepeatCount(initialFrequency, initialRepeat));
  }, [initialEnabled, initialNotify, initialFrequency, initialRepeat]);

  const freqOptions: { value: WatchFrequency; label: string }[] = useMemo(
    () => [
      { value: "daily", label: copy.frequencyDaily },
      { value: "weekly", label: copy.frequencyWeekly },
      { value: "monthly", label: copy.frequencyMonthly },
    ],
    [copy],
  );

  const repeatMax = maxRepeatForFrequency(frequency);
  const repeatOptions = useMemo(() => Array.from({ length: repeatMax }, (_, i) => i + 1), [repeatMax]);

  return (
    <div className="space-y-4">
      <input type="hidden" name="schedule_frequency" value={frequency} />
      <input type="hidden" name="repeat_count" value={String(repeat)} />

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-ink-muted">{copy.monitoringStateLabel}</span>
        <select
          name="enabled"
          value={enabled ? "true" : "false"}
          onChange={(e) => setEnabled(e.target.value === "true")}
          className="w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="false">{copy.monitoringOff}</option>
          <option value="true">{copy.monitoringOn}</option>
        </select>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-ink-muted">{copy.frequencyLabel}</span>
          <select
            value={frequency}
            onChange={(e) => {
              const v = parseWatchFrequency(e.target.value);
              if (v) setFrequency(v);
            }}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            {freqOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-ink-muted">{copy.repeatLabel}</span>
          <select
            value={String(repeat)}
            onChange={(e) => setRepeat(clampRepeatCount(frequency, Number(e.target.value)))}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            {repeatOptions.map((n) => (
              <option key={n} value={String(n)}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-ink-muted">{copy.notifyLabel}</legend>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="notify_mode"
            value="always"
            checked={notify === "always"}
            onChange={() => setNotify("always")}
            className="size-4 border-border text-accent"
          />
          {copy.notifyAlways}
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="notify_mode"
            value="change_only"
            checked={notify === "change_only"}
            onChange={() => setNotify("change_only")}
            className="size-4 border-border text-accent"
          />
          {copy.notifyChangeOnly}
        </label>
      </fieldset>
    </div>
  );
}
