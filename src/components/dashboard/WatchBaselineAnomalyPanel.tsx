import type { Locale } from "@/lib/i18n";
import type { WatchAnomalyV1 } from "@/lib/observation-watch-anomaly";
import { WATCH_ANOMALY_MIN_SAMPLES } from "@/lib/observation-watch-anomaly";

const COPY = {
  ja: {
    title: "Watch ベースライン",
    subtitle:
      "同一 URL × 地域の過去 Watch 実行と比較した統計的逸脱（中央値 + MAD）。ページ変更の断定や ML スコアではありません。",
    insufficient: `ベースライン不足（同一条件の Watch が ${WATCH_ANOMALY_MIN_SAMPLES} 件未満）`,
    noAnomaly: "今回の観測メトリクスはベースライン内です",
    anomaly: "ベースラインから外れたメトリクスがあります",
    duration: "Interaction 実行時間",
    proxy: "Proxy 転送量",
    current: "今回",
    median: "中央値",
    z: "modified z",
    chartDuration: "実行時間の推移（Watch）",
  },
  en: {
    title: "Watch baseline",
    subtitle:
      "Statistical deviation vs prior Watch runs (median + MAD). Not a page-change verdict or ML score.",
    insufficient: `Insufficient baseline (fewer than ${WATCH_ANOMALY_MIN_SAMPLES} prior Watch runs)`,
    noAnomaly: "Observed metrics are within baseline",
    anomaly: "One or more metrics deviate from baseline",
    duration: "Interaction duration",
    proxy: "Proxy transfer",
    current: "Current",
    median: "Median",
    z: "modified z",
    chartDuration: "Interaction duration trend (Watch)",
  },
} as const;

function formatMs(ms: number): string {
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)} min`;
  return `${Math.round(ms / 1000)} s`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${Math.round(bytes)} B`;
}

function DurationSparkline(props: { series: WatchAnomalyV1["series"]; locale: Locale }) {
  const values = props.series
    .map((row) => row.interaction_duration_ms)
    .filter((v): v is number => typeof v === "number" && v > 0);
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(1, max - min);
  const c = COPY[props.locale];
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{c.chartDuration}</p>
      <div className="mt-2 flex h-16 items-end gap-0.5" role="img" aria-label={c.chartDuration}>
        {props.series.map((row, index) => {
          const v = row.interaction_duration_ms;
          if (v == null || v <= 0) {
            return <div key={`${row.measured_at}-${index}`} className="min-w-1 flex-1 bg-border/40" style={{ height: "4px" }} />;
          }
          const h = 12 + ((v - min) / range) * 52;
          const isLast = index === props.series.length - 1;
          return (
            <div
              key={`${row.measured_at}-${index}`}
              className={`min-w-1 flex-1 rounded-t ${isLast ? "bg-amber-500" : "bg-sky-400/80"}`}
              style={{ height: `${h}px` }}
              title={formatMs(v)}
            />
          );
        })}
      </div>
    </div>
  );
}

export function WatchBaselineAnomalyPanel(props: { anomaly: WatchAnomalyV1; locale: Locale }) {
  const c = COPY[props.locale];
  const statusTone =
    props.anomaly.status === "anomaly_detected"
      ? "border-amber-200 bg-amber-50/50"
      : "border-border bg-surface-elevated";

  return (
    <section className={`rounded-xl border p-4 ${statusTone}`}>
      <h3 className="font-display text-sm font-semibold text-ink">{c.title}</h3>
      <p className="mt-1 text-xs text-ink-muted">{c.subtitle}</p>
      <p className="mt-2 text-sm text-ink">
        {props.anomaly.status === "insufficient_baseline"
          ? c.insufficient
          : props.anomaly.status === "anomaly_detected"
            ? c.anomaly
            : c.noAnomaly}
      </p>
      {props.anomaly.metrics.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm">
          {props.anomaly.metrics.map((m) => (
            <li
              key={m.id}
              className={`rounded-lg border px-3 py-2 ${m.anomalous ? "border-amber-300 bg-white/80" : "border-border bg-surface"}`}
            >
              <p className="font-medium text-ink">
                {m.id === "interaction_duration_ms" ? c.duration : c.proxy}
                {m.anomalous ? " ⚠" : ""}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {c.current}: {m.unit === "ms" ? formatMs(m.current) : formatBytes(m.current)} · {c.median}:{" "}
                {m.unit === "ms" ? formatMs(m.median) : formatBytes(m.median)} · {c.z}: {m.z_score}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      <DurationSparkline series={props.anomaly.series} locale={props.locale} />
    </section>
  );
}
