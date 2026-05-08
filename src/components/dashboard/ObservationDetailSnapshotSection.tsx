import { ObservationSnapshotVisuals } from "@/components/dashboard/ObservationSnapshotVisuals";
import type { Observation, ObservationHistoryEvent } from "@/lib/demo/observations";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";

function defaultHistory(obs: Observation): ObservationHistoryEvent[] {
  return [
    {
      at: obs.capturedAt,
      kind: "capture",
      label: "記録",
      detail:
        obs.status === "success"
          ? "スナップショットを保存"
          : obs.status === "failure"
            ? "取得に失敗"
            : "処理中",
    },
  ];
}

function kindLabel(kind: ObservationHistoryEvent["kind"]): string {
  const map = { capture: "キャプチャ", status: "ステータス", processing: "処理" } as const;
  return map[kind];
}

type Props = {
  obs: Observation;
  displayTitle: string | null;
  displayImageUrl: string | null;
  resolvedCanonical: string | null;
};

export function ObservationDetailSnapshotSection({
  obs,
  displayTitle,
  displayImageUrl,
  resolvedCanonical,
}: Props) {
  const history = obs.events?.length ? obs.events : defaultHistory(obs);
  const openUrl = resolvedCanonical ?? obs.url;
  const metaLine = `snapshot · ${obs.regionLabel} · ${formatUtcLabel(obs.capturedAt)}`;
  const fetchSnapshot = obs.status === "success";
  const captureEventDetail = obs.events?.find((e) => e.kind === "capture")?.detail;
  const showPersistedSnapshotWarning = !obs.snapshotImageUrl && Boolean(captureEventDetail?.trim());

  return (
    <div className="space-y-10">
      {showPersistedSnapshotWarning ? (
        <div
          role="status"
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-[var(--color-ink)]"
        >
          <p className="font-semibold text-amber-900 dark:text-amber-100">保存されたスナップショット画像（snapshot_image_url）がありません</p>
          <p className="mt-1 text-[var(--color-ink-muted)]">{captureEventDetail}</p>
        </div>
      ) : null}
      <ObservationSnapshotVisuals
        observationUrl={obs.url}
        serverImageUrl={displayImageUrl}
        openUrl={openUrl}
        fetchSnapshot={fetchSnapshot}
        displayTitle={displayTitle}
        metaLine={metaLine}
      />

      <section>
        <h2 className="font-display text-lg font-semibold text-[var(--color-ink)]">履歴</h2>
        <ol className="mt-4 space-y-0 border-l-2 border-[var(--color-accent)]/35 pl-4">
          {[...history].reverse().map((ev, i) => (
            <li key={`${ev.at}-${i}`} className="relative pb-6 last:pb-0">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-accent)]" />
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  {kindLabel(ev.kind)}
                </span>
                <span className="text-sm font-medium text-[var(--color-ink)]">{ev.label}</span>
              </div>
              {ev.detail ? (
                <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{ev.detail}</p>
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
