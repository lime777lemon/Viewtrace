import {
  monitoringAlertSeverity,
  type MonitoringAlert,
  type MonitoringAlertSeverity,
  type MonitoringBehaviorDiffRow,
} from "@/lib/monitoring-run-diff";
import { presentMonitoringReview } from "@/lib/monitoring-run-summary";

/** Outbound filter only. Alerts are saved before this runs. */
export type MonitoringNotificationPolicy = "critical_only" | "critical_and_warning" | "all";

export const DEFAULT_MONITORING_NOTIFICATION_POLICY: MonitoringNotificationPolicy = "critical_and_warning";

export function alertIncludedByPolicy(
  severity: MonitoringAlertSeverity,
  policy: MonitoringNotificationPolicy,
): boolean {
  if (policy === "all") return true;
  if (policy === "critical_only") return severity === "critical";
  return severity === "critical" || severity === "warning";
}

export type MonitoringNotificationDraft = {
  send: boolean;
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type NoticeBlock = {
  severity: "critical" | "warning";
  title: string;
  lines: string[];
};

function pageAside(alert: Extract<MonitoringAlert, { layer: "page" }>): string {
  if (alert.code === "screenshot_differs") return "Page screenshot also changed.";
  return "Page screenshot could not be compared with the previous check.";
}

/**
 * One email for one Monitoring Run. Grouping matches the Summary.
 * Info does not open the email under the default policy. It can still be named when a higher alert is sent.
 */
export function buildMonitoringNotification(input: {
  alerts: readonly MonitoringAlert[];
  rows: readonly MonitoringBehaviorDiffRow[];
  policy?: MonitoringNotificationPolicy;
  runUrl: string;
}): MonitoringNotificationDraft {
  const policy = input.policy ?? DEFAULT_MONITORING_NOTIFICATION_POLICY;
  const review = presentMonitoringReview(input.alerts, input.rows);
  const severityOf = (alert: MonitoringAlert) => monitoringAlertSeverity(alert);
  const include = (alert: MonitoringAlert) => alertIncludedByPolicy(severityOf(alert), policy);
  const blocks: NoticeBlock[] = [];

  for (const alert of input.alerts) {
    if (alert.layer !== "journey" || !include(alert)) continue;
    const severity = severityOf(alert);
    if (severity === "info") continue;
    const outcome = alert.code === "journey_blocked" ? "blocked" : "failed";
    const lines = alert.steps.length
      ? alert.steps.flatMap((step) => [
          `${step.label} ${outcome}`,
          `Expected ${step.previous || "—"} · Observed ${step.current || "—"}`,
        ])
      : [`${alert.previous ?? "—"} → ${alert.current}`];
    blocks.push({ severity, title: alert.name, lines });
  }
  blocks.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1));

  const warningBlocks: NoticeBlock[] = [];
  for (const area of review.areas) {
    const sample = input.alerts.find((alert) => alert.layer === "behavior" && alert.code === "behavior_new_unknown" && alert.label === area.section);
    if (sample && !include(sample)) continue;
    if (!sample && !alertIncludedByPolicy("warning", policy)) continue;
    warningBlocks.push({
      severity: "warning",
      title: area.section,
      lines: [`${area.count} related changes detected`],
    });
  }
  for (const alert of review.behaviorSingles) {
    if (!include(alert)) continue;
    const line = alert.code === "behavior_missing"
      ? `${alert.label} is no longer detected.`
      : `${alert.label} · ${alert.previous ?? "—"} → ${alert.current}`;
    warningBlocks.push({ severity: "warning", title: alert.label, lines: [line] });
  }
  blocks.push(...warningBlocks);

  const pageLines = input.alerts.flatMap((alert) => (alert.layer === "page" ? [pageAside(alert)] : []));
  const send = blocks.length > 0 || (policy === "all" && pageLines.length > 0);
  if (!send) return { send: false, subject: "", text: "", html: "" };

  const count = blocks.length;
  const subject = count === 0
    ? "ViewTrace recorded a monitoring change"
    : count === 1
      ? "ViewTrace detected 1 area that needs attention"
      : `ViewTrace detected ${count} areas that need attention`;
  const textLines = [subject, ""];
  for (const block of blocks) {
    textLines.push(`${block.severity === "critical" ? "Critical" : "Warning"} — ${block.title}`, ...block.lines, "");
  }
  if (blocks.length > 0) textLines.push(...pageLines, "");
  else textLines.push(...pageLines, "");
  textLines.push("View monitoring run", input.runUrl);
  const text = textLines.filter((line, index, all) => line !== "" || all[index - 1] !== "").join("\n");
  const html = [
    `<p>${escapeHtml(subject)}</p>`,
    ...blocks.flatMap((block) => [
      `<p><strong>${block.severity === "critical" ? "Critical" : "Warning"} — ${escapeHtml(block.title)}</strong><br/>${block.lines.map((line) => escapeHtml(line)).join("<br/>")}</p>`,
    ]),
    ...pageLines.map((line) => `<p>${escapeHtml(line)}</p>`),
    `<p><a href="${escapeHtml(input.runUrl)}">View monitoring run</a></p>`,
  ].join("");
  return { send: true, subject, text, html };
}
