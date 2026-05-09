import { ObservationSnapshotVisuals } from "@/components/dashboard/ObservationSnapshotVisuals";
import type { Observation, ObservationHistoryEvent } from "@/lib/demo/observations";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import {
  localizeObservationEventDetail,
  localizeObservationEventLabel,
} from "@/lib/i18n/observation-persisted-copy";

function defaultHistory(obs: Observation, locale: Locale): ObservationHistoryEvent[] {
  const t = copy[locale].observationDetail;
  return [
    {
      at: obs.capturedAt,
      kind: "capture",
      label: locale === "ja" ? "記録" : "Record",
      detail:
        obs.status === "success"
          ? locale === "ja"
            ? "スナップショットを保存"
            : "Saved snapshot"
          : obs.status === "failure"
            ? locale === "ja"
              ? "取得に失敗"
              : "Capture failed"
            : t.statusPending,
    },
  ];
}

function kindLabel(kind: ObservationHistoryEvent["kind"], locale: Locale): string {
  const ja = { capture: "キャプチャ", status: "ステータス", processing: "処理" } as const;
  const en = { capture: "Capture", status: "Status", processing: "Processing" } as const;
  return (locale === "ja" ? ja : en)[kind];
}

type Props = {
  obs: Observation;
  displayTitle: string | null;
  displayImageUrl: string | null;
  resolvedCanonical: string | null;
  locale: Locale;
};

export function ObservationDetailSnapshotSection({
  obs,
  displayTitle,
  displayImageUrl,
  resolvedCanonical,
  locale,
}: Props) {
  const history = obs.events?.length ? obs.events : defaultHistory(obs, locale);
  const openUrl = resolvedCanonical ?? obs.url;
  const metaLine = `snapshot · ${obs.regionLabel} · ${formatUtcLabel(obs.capturedAt)}`;
  const fetchSnapshot = obs.status === "success";
  const captureEventDetailRaw = obs.events?.find((e) => e.kind === "capture")?.detail;
  const captureEventDetail = captureEventDetailRaw
    ? localizeObservationEventDetail(captureEventDetailRaw, locale)
    : undefined;
  const showPersistedSnapshotWarning = !obs.snapshotImageUrl && Boolean(captureEventDetailRaw?.trim());
  const t = copy[locale].snapshotVisuals;

  return (
    <div className="space-y-10">
      {showPersistedSnapshotWarning ? (
        <div
          role="status"
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-[var(--color-ink)]"
        >
          <p className="font-semibold text-amber-900 dark:text-amber-100">
            {locale === "ja"
              ? "保存されたスナップショット画像（snapshot_image_url）がありません"
              : "No persisted snapshot image (snapshot_image_url) was saved"}
          </p>
          <p className="mt-1 text-[var(--color-ink-muted)]">{captureEventDetail ?? ""}</p>
        </div>
      ) : null}
      <ObservationSnapshotVisuals
        observationUrl={obs.url}
        serverImageUrl={displayImageUrl}
        openUrl={openUrl}
        fetchSnapshot={fetchSnapshot}
        displayTitle={displayTitle}
        metaLine={metaLine}
        locale={locale}
      />

      <section>
        <h2 className="font-display text-lg font-semibold text-[var(--color-ink)]">
          {locale === "ja" ? "履歴" : "History"}
        </h2>
        <ol className="mt-4 space-y-0 border-l-2 border-[var(--color-accent)]/35 pl-4">
          {[...history].reverse().map((ev, i) => (
            <li key={`${ev.at}-${i}`} className="relative pb-6 last:pb-0">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-accent)]" />
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  {kindLabel(ev.kind, locale)}
                </span>
                <span className="text-sm font-medium text-[var(--color-ink)]">
                  {localizeObservationEventLabel(ev.label, locale)}
                </span>
              </div>
              {ev.detail ? (
                <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                  {localizeObservationEventDetail(ev.detail, locale)}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                {formatJaDateTime(ev.at)} · {formatUtcLabel(ev.at)}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
