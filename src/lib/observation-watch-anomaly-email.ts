import type { WatchAnomalyMetricV1, WatchAnomalyV1 } from "@/lib/observation-watch-anomaly";
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMetricValue(metric: WatchAnomalyMetricV1): string {
  if (metric.unit === "bytes") {
    const mb = metric.current / (1024 * 1024);
    const medMb = metric.median / (1024 * 1024);
    return `${mb.toFixed(2)} MB (baseline median ${medMb.toFixed(2)} MB)`;
  }
  return `${Math.round(metric.current)} ms (baseline median ${Math.round(metric.median)} ms)`;
}

export function watchAnomalyEmailCopy(input: {
  region: string;
  anomaly: WatchAnomalyV1;
  recordUrl: string;
}): { subject: string; text: string[]; html: string } | null {
  const flagged = input.anomaly.metrics.filter((m) => m.anomalous);
  if (input.anomaly.status !== "anomaly_detected" || !flagged.length) return null;

  const subject = "Viewtrace: Watch baseline anomaly detected";
  const text = [
    "Watch baseline anomaly detected (robust median + MAD on observed metrics).",
    "Watch ベースラインから観測メトリクスが通常範囲外です（中央値 + MAD。ML スコアではありません）。",
    "",
    `Region / 地域: ${input.region}`,
    ...flagged.map(
      (m) =>
        `• ${m.label}: ${formatMetricValue(m)} (modified z ≈ ${m.z_score})`,
    ),
    "",
    `Open record / 記録を開く: ${input.recordUrl}`,
  ];

  const html = [
    "<p><strong>Watch baseline anomaly detected</strong></p>",
    "<p>Robust statistical baseline (median + MAD) on <em>observed</em> Watch metrics — not a page-change verdict or compliance score.</p>",
    `<p><strong>Region</strong> / 地域<br/>${escapeHtml(input.region)}</p>`,
    "<ul>",
    ...flagged.map(
      (m) =>
        `<li><strong>${escapeHtml(m.label)}</strong>: ${escapeHtml(formatMetricValue(m))} (modified z ≈ ${escapeHtml(String(m.z_score))})</li>`,
    ),
    "</ul>",
    `<p><a href="${escapeHtml(input.recordUrl)}">Open record</a></p>`,
  ].join("");

  return { subject, text, html };
}
