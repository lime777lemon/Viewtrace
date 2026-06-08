"use client";

import { saveObservationWatchAction } from "@/app/actions/observation-watches";
import { ObservationRecordShareButton } from "@/components/dashboard/ObservationRecordShareButton";
import { ObservationWatchCsvExport } from "@/components/dashboard/ObservationWatchCsvExport";
import { WatchScheduleFields, type WatchScheduleFieldsCopy } from "@/components/dashboard/WatchScheduleFields";
import { WatchWebhookField } from "@/components/dashboard/WatchWebhookField";
import type { WatchFrequency, WatchNotifyMode } from "@/lib/observation-watch-schedule";

export type ObservationWatchPanelCopy = WatchScheduleFieldsCopy & {
  title: string;
  intro: string;
  save: string;
  webhookLabel: string;
  webhookHint: string;
  webhookPlaceholder: string;
  shareButton: string;
  shareCopied: string;
  shareFailed: string;
  csvExportButton: string;
  csvExportPending: string;
  csvAuditCheckbox: string;
  csvModeStandard: string;
  csvModeAudit: string;
};

type Props = {
  url: string;
  regionValue: string;
  regionLabel: string;
  observationId: string;
  initialEnabled: boolean;
  initialFrequency: WatchFrequency;
  initialRepeat: number;
  initialNotify: WatchNotifyMode;
  copy: ObservationWatchPanelCopy;
  initialWebhookUrl?: string | null;
  /** 保存後の遷移（未指定かつ observationId あり→詳細へ） */
  redirectAfter?: "auto-observations" | "observations";
  showShare?: boolean;
  showCsvExport?: boolean;
};

export function ObservationWatchPanel({
  url,
  regionValue,
  regionLabel,
  observationId,
  initialEnabled,
  initialFrequency,
  initialRepeat,
  initialNotify,
  copy,
  initialWebhookUrl,
  redirectAfter,
  showShare = false,
  showCsvExport = false,
}: Props) {
  const scheduleCopy: WatchScheduleFieldsCopy = copy;

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4 sm:col-span-2">
      <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.title}</dt>
      <dd className="mt-2 space-y-4 text-sm text-ink">
        <p className="text-ink-muted">{copy.intro.replace("{region}", regionLabel)}</p>
        {showShare || showCsvExport ? (
          <div className="flex flex-wrap items-center gap-2">
            {showShare ? (
              <ObservationRecordShareButton
                observationId={observationId}
                label={copy.shareButton}
                copiedLabel={copy.shareCopied}
                failedLabel={copy.shareFailed}
              />
            ) : null}
            {showCsvExport ? (
              <ObservationWatchCsvExport
                url={url}
                region={regionValue}
                label={copy.csvExportButton}
                pendingLabel={copy.csvExportPending}
                auditCheckbox={copy.csvAuditCheckbox}
                modeStandard={copy.csvModeStandard}
                modeAudit={copy.csvModeAudit}
              />
            ) : null}
          </div>
        ) : null}
        <form action={saveObservationWatchAction} className="space-y-4">
          <input type="hidden" name="observationId" value={observationId} />
          <input type="hidden" name="url" value={url} />
          <input type="hidden" name="region" value={regionValue} />
          {redirectAfter ? <input type="hidden" name="redirect_after" value={redirectAfter} /> : null}

          <WatchScheduleFields
            copy={scheduleCopy}
            initialEnabled={initialEnabled}
            initialFrequency={initialFrequency}
            initialRepeat={initialRepeat}
            initialNotify={initialNotify}
          />

          <WatchWebhookField
            label={copy.webhookLabel}
            hint={copy.webhookHint}
            placeholder={copy.webhookPlaceholder}
            initialValue={initialWebhookUrl}
          />

          <button
            type="submit"
            className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            {copy.save}
          </button>
        </form>
      </dd>
    </div>
  );
}
