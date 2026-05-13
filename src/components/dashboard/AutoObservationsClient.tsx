"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { recordWebVerifiedObservationAction } from "@/app/actions/observations";
import { saveObservationWatchAction, deleteObservationWatchAction } from "@/app/actions/observation-watches";
import { WatchScheduleFields, type WatchScheduleFieldsCopy, type WatchScheduleValues } from "@/components/dashboard/WatchScheduleFields";
import { WatchSettingsReadout } from "@/components/dashboard/WatchSettingsReadout";
import {
  clampRepeatCount,
  parseWatchFrequency,
  parseWatchNotifyMode,
  shortenWatchOptionLabelForPreview,
  type WatchFrequency,
  type WatchNotifyMode,
} from "@/lib/observation-watch-schedule";
import type { ScheduledObservationEnvStatus } from "@/lib/scheduled-observation-env";

function ObserveNowSubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex rounded-full border border-accent/50 bg-accent-soft px-5 py-2.5 text-sm font-semibold text-ink hover:bg-accent-soft/80 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export type AutoObsWatchRow = {
  id: string;
  url: string;
  region: string;
  enabled: boolean;
  schedule_frequency: string | null;
  repeat_count: number | null;
  notify_mode: string | null;
};

export type AutoObservationsCopy = {
  metaTitle: string;
  title: string;
  subtitle: string;
  addTitle: string;
  urlLabel: string;
  urlPlaceholder: string;
  regionLabel: string;
  listTitle: string;
  empty: string;
  saveNew: string;
  saveRow: string;
  delete: string;
  deleteConfirm: string;
  linkObservations: string;
  invalidQuery: string;
  invalidUrlQuery: string;
  invalidRegionQuery: string;
  upgradeHint: string;
  addPreviewLabel: string;
  addPreviewFootnote: string;
  summarySavedHeading: string;
  summaryUrlEmpty: string;
  summarySavedFootnote: string;
  saveError: string;
  saveErrorHint: string;
  savedListRowTitle: string;
  savedListRowBody: string;
  observeNow: string;
  observeNowPending: string;
  deliveryStatusTitle: string;
  deliveryStatusIntro: string;
  deliveryItemCronSecret: string;
  deliveryItemSupabaseAdmin: string;
  deliveryItemResend: string;
  deliveryItemBrowserless: string;
  deliveryItemVercel: string;
  deliveryItemAccountEmail: string;
  deliveryConfigured: string;
  deliveryNotConfigured: string;
  deliveryAccountEmailOk: string;
  deliveryLocalNote: string;
  deliveryCaptureFailureNote: string;
};

type RegionOption = { value: string; label: string };

type Props = {
  watches: AutoObsWatchRow[];
  regions: RegionOption[];
  copy: AutoObservationsCopy;
  scheduleCopy: WatchScheduleFieldsCopy;
  showInvalidBanner: boolean;
  showInvalidUrlBanner: boolean;
  showInvalidRegionBanner: boolean;
  showSaveErrorBanner: boolean;
  showSavedRowBanner: boolean;
  envStatus: ScheduledObservationEnvStatus;
  accountEmailConfigured: boolean;
};

export function AutoObservationsClient({
  watches,
  regions,
  copy,
  scheduleCopy,
  showInvalidBanner,
  showInvalidUrlBanner,
  showInvalidRegionBanner,
  showSaveErrorBanner,
  showSavedRowBanner,
  envStatus,
  accountEmailConfigured,
}: Props) {
  const defaultRegion = regions[0]?.value ?? "US-CA";

  const [addUrl, setAddUrl] = useState("");
  const [addRegion, setAddRegion] = useState(defaultRegion);
  const [addSchedule, setAddSchedule] = useState<WatchScheduleValues>({
    enabled: true,
    frequency: "daily",
    repeat: 1,
    notify: "always",
  });

  const [rowSnapshots, setRowSnapshots] = useState<Record<string, WatchScheduleValues>>({});

  useEffect(() => {
    setAddRegion((r) => (regions.some((x) => x.value === r) ? r : defaultRegion));
  }, [defaultRegion, regions]);

  const handleAddScheduleChange = useCallback((v: WatchScheduleValues) => {
    setAddSchedule(v);
  }, []);

  const setRowSnapshot = useCallback((id: string, v: WatchScheduleValues) => {
    setRowSnapshots((prev) => ({ ...prev, [id]: v }));
  }, []);

  const addRegionLabel = useMemo(
    () => regions.find((r) => r.value === addRegion)?.label ?? addRegion,
    [addRegion, regions],
  );

  const addPreviewLine = useMemo(() => {
    const url = addUrl.trim() || copy.summaryUrlEmpty;
    const freq =
      addSchedule.frequency === "daily"
        ? scheduleCopy.frequencyDaily
        : addSchedule.frequency === "weekly"
          ? scheduleCopy.frequencyWeekly
          : scheduleCopy.frequencyMonthly;
    const notify =
      addSchedule.notify === "always" ? scheduleCopy.notifyAlways : scheduleCopy.notifyChangeOnly;
    const mon = addSchedule.enabled ? scheduleCopy.monitoringOn : scheduleCopy.monitoringOff;
    const rep = String(addSchedule.repeat);
    return [
      url,
      addRegionLabel,
      mon,
      shortenWatchOptionLabelForPreview(freq),
      rep,
      shortenWatchOptionLabelForPreview(notify),
    ].join(" · ");
  }, [addUrl, addRegionLabel, addSchedule, copy.summaryUrlEmpty, scheduleCopy]);

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="mt-2 text-sm text-ink-muted">{copy.subtitle}</p>
        <p className="mt-3 text-sm">
          <Link href="/dashboard/observations" className="font-medium text-accent hover:text-accent-hover">
            {copy.linkObservations}
          </Link>
        </p>
      </div>

      {showInvalidUrlBanner ? (
        <p className="rounded-lg border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {copy.invalidUrlQuery}
        </p>
      ) : null}

      {showInvalidRegionBanner ? (
        <p className="rounded-lg border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {copy.invalidRegionQuery}
        </p>
      ) : null}

      {showInvalidBanner ? (
        <p className="rounded-lg border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {copy.invalidQuery}
        </p>
      ) : null}

      {showSaveErrorBanner ? (
        <div
          role="alert"
          className="rounded-lg border border-rose-300/90 bg-rose-50 px-4 py-3 text-sm text-rose-950"
        >
          <p className="font-semibold">{copy.saveError}</p>
          <p className="mt-1 text-xs leading-relaxed text-rose-900/90">{copy.saveErrorHint}</p>
        </div>
      ) : null}

      {showSavedRowBanner ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-emerald-300/90 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
        >
          <p className="font-semibold">{copy.savedListRowTitle}</p>
          <p className="mt-1 text-xs leading-relaxed text-emerald-900/95">{copy.savedListRowBody}</p>
        </div>
      ) : null}

      <section className="rounded-2xl border border-border bg-surface-elevated p-6">
        <h2 className="text-sm font-semibold text-ink">{copy.deliveryStatusTitle}</h2>
        <p className="mt-2 text-xs leading-relaxed text-ink-muted sm:text-sm">{copy.deliveryStatusIntro}</p>
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-surface px-3 sm:px-4">
          <li className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
            <span className="text-ink-muted">{copy.deliveryItemCronSecret}</span>
            <span className={envStatus.cronSecret ? "font-semibold text-emerald-800" : "font-semibold text-amber-800"}>
              {envStatus.cronSecret ? copy.deliveryConfigured : copy.deliveryNotConfigured}
            </span>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
            <span className="text-ink-muted">{copy.deliveryItemSupabaseAdmin}</span>
            <span className={envStatus.supabaseAdmin ? "font-semibold text-emerald-800" : "font-semibold text-amber-800"}>
              {envStatus.supabaseAdmin ? copy.deliveryConfigured : copy.deliveryNotConfigured}
            </span>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
            <span className="text-ink-muted">{copy.deliveryItemResend}</span>
            <span className={envStatus.resend ? "font-semibold text-emerald-800" : "font-semibold text-amber-800"}>
              {envStatus.resend ? copy.deliveryConfigured : copy.deliveryNotConfigured}
            </span>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
            <span className="text-ink-muted">{copy.deliveryItemBrowserless}</span>
            <span className={envStatus.browserless ? "font-semibold text-emerald-800" : "font-semibold text-amber-800"}>
              {envStatus.browserless ? copy.deliveryConfigured : copy.deliveryNotConfigured}
            </span>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
            <span className="text-ink-muted">{copy.deliveryItemVercel}</span>
            <span className={envStatus.onVercel ? "font-semibold text-emerald-800" : "font-semibold text-amber-800"}>
              {envStatus.onVercel ? copy.deliveryConfigured : copy.deliveryNotConfigured}
            </span>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
            <span className="text-ink-muted">{copy.deliveryItemAccountEmail}</span>
            <span className={accountEmailConfigured ? "font-semibold text-emerald-800" : "font-semibold text-amber-800"}>
              {accountEmailConfigured ? copy.deliveryAccountEmailOk : copy.deliveryNotConfigured}
            </span>
          </li>
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-ink-muted">{copy.deliveryLocalNote}</p>
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">{copy.deliveryCaptureFailureNote}</p>
      </section>

      <section className="rounded-2xl border border-border bg-surface-elevated p-6">
        <h2 className="text-sm font-semibold text-ink">{copy.addTitle}</h2>
        <form action={saveObservationWatchAction} className="mt-4 space-y-4">
          <input type="hidden" name="observationId" value="" />
          <input type="hidden" name="redirect_after" value="auto-observations" />
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-ink-muted">{copy.urlLabel}</span>
            <input
              type="text"
              name="url"
              required
              inputMode="url"
              autoComplete="url"
              value={addUrl}
              onChange={(e) => setAddUrl(e.target.value)}
              placeholder={copy.urlPlaceholder}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-ink-muted">{copy.regionLabel}</span>
            <select
              name="region"
              value={addRegion}
              onChange={(e) => setAddRegion(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            >
              {regions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <WatchScheduleFields
            copy={scheduleCopy}
            initialEnabled
            initialFrequency="daily"
            initialRepeat={1}
            initialNotify="always"
            onValuesChange={handleAddScheduleChange}
          />
          <div
            className="rounded-lg border border-dashed border-border bg-surface px-3 py-2.5"
            aria-live="polite"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              {copy.addPreviewLabel}
            </p>
            <p className="mt-1 text-sm leading-snug text-ink">{addPreviewLine}</p>
            <p className="mt-1.5 text-xs text-ink-muted">{copy.addPreviewFootnote}</p>
          </div>
          <button
            type="submit"
            className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            {copy.saveNew}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-surface-elevated p-6">
        <h2 className="text-sm font-semibold text-ink">{copy.listTitle}</h2>
        {watches.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">{copy.empty}</p>
        ) : (
          <ul className="mt-4 space-y-6">
            {watches.map((w) => {
              const freq = parseWatchFrequency(String(w.schedule_frequency ?? "")) ?? ("daily" as WatchFrequency);
              const rep = clampRepeatCount(freq, Number(w.repeat_count ?? 1));
              const notify = parseWatchNotifyMode(String(w.notify_mode ?? "")) ?? ("always" as WatchNotifyMode);
              const regionLabel =
                regions.find((r) => r.value === w.region)?.label ?? w.region;
              const rowValues: WatchScheduleValues =
                rowSnapshots[w.id] ?? {
                  enabled: w.enabled,
                  frequency: freq,
                  repeat: rep,
                  notify,
                };
              return (
                <li
                  key={w.id}
                  className="border-b border-border pb-6 last:border-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-all font-mono text-sm font-medium text-ink">{w.url}</p>
                      <p className="mt-1 text-xs text-ink-muted">
                        {regionLabel} · {rowValues.enabled ? scheduleCopy.monitoringOn : scheduleCopy.monitoringOff}
                      </p>
                    </div>
                    <form action={deleteObservationWatchAction} className="shrink-0">
                      <input type="hidden" name="watch_id" value={w.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:border-ink-muted/40"
                        onClick={(e) => {
                          if (!window.confirm(copy.deleteConfirm)) e.preventDefault();
                        }}
                      >
                        {copy.delete}
                      </button>
                    </form>
                  </div>
                  <div className="mt-4">
                    <WatchSettingsReadout
                      heading={copy.summarySavedHeading}
                      scheduleCopy={scheduleCopy}
                      urlFieldLabel={copy.urlLabel}
                      regionFieldLabel={copy.regionLabel}
                      urlDisplay={w.url}
                      regionDisplay={regionLabel}
                      values={rowValues}
                      footnote={copy.summarySavedFootnote}
                    />
                  </div>
                  <form id={`auto-watch-save-${w.id}`} action={saveObservationWatchAction} className="mt-4 space-y-4">
                    <input type="hidden" name="observationId" value="" />
                    <input type="hidden" name="redirect_after" value="auto-observations" />
                    <input type="hidden" name="save_origin" value="list_row" />
                    <input type="hidden" name="url" value={w.url} />
                    <input type="hidden" name="region" value={w.region} />
                    <WatchScheduleFields
                      copy={scheduleCopy}
                      initialEnabled={w.enabled}
                      initialFrequency={freq}
                      initialRepeat={rep}
                      initialNotify={notify}
                      onValuesChange={(v) => setRowSnapshot(w.id, v)}
                    />
                  </form>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <form action={recordWebVerifiedObservationAction} className="inline">
                      <input type="hidden" name="url" value={w.url} />
                      <input type="hidden" name="region" value={w.region} />
                      <input type="hidden" name="regionLabel" value={regionLabel} />
                      <input type="hidden" name="verifiedTitle" value="" />
                      <input type="hidden" name="verifiedImageUrl" value="" />
                      <ObserveNowSubmitButton label={copy.observeNow} pendingLabel={copy.observeNowPending} />
                    </form>
                    <button
                      type="submit"
                      form={`auto-watch-save-${w.id}`}
                      className="inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                    >
                      {copy.saveRow}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
