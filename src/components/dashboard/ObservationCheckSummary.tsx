import Link from "next/link";
import { journeyStatusLabel } from "@/lib/journey-definition";
import type { Locale } from "@/lib/i18n";
import { presentInteractionHealth } from "@/lib/interaction-health-presentation";
import type { PageSeoDerivedV1 } from "@/lib/measurement-record";
import { monitoringReviewStatus, type MonitoringAlert } from "@/lib/monitoring-run-diff";
import { monitoringJourneyFact, type MonitoringPageFact } from "@/lib/monitoring-run";
import { presentMonitoringReview } from "@/lib/monitoring-run-summary";
import type { BehaviorDiffV1 } from "@/lib/observation-behavior-diff";
import type { InteractionCheckType, RegionalInteractionCheckV1 } from "@/lib/observation-regional-interaction";
import type { MonitoringRunLoaded } from "@/lib/monitoring-run-store";

const COPY = {
  ja: {
    title: "この確認",
    thisRecord: "この記録",
    page: "ページ",
    behaviors: "挙動",
    journeys: "手順",
    notMeasured: "未測定",
    measured: "測定済み",
    seo: "SEO",
    scope: "実測範囲",
    metadata: "Metadata",
    none: "なし",
    behaviorNoPrevious: "前回の挙動記録はありません。",
    behaviorUnchanged: "変化なし",
    missingLine: "{label} は検出されなくなりました。",
    newUnknownLine: "{label} で未分類の変化を検出しました。",
    regressionLine: "{label} · {previous} → {current}",
    pageFact: {
      same: "Same",
      changed: "Changed",
      not_comparable: "Not comparable",
      incomplete: "Incomplete",
    } as Record<MonitoringPageFact, string>,
    status: {
      incomplete: "Incomplete",
      attention_needed: "Attention needed",
      blocked: "Blocked",
      healthy: "Healthy",
    },
  },
  en: {
    title: "This check",
    thisRecord: "This record",
    page: "Page",
    behaviors: "Behaviors",
    journeys: "Journey",
    notMeasured: "Not measured",
    measured: "Measured",
    seo: "SEO",
    scope: "Scope",
    metadata: "Metadata",
    none: "None",
    behaviorNoPrevious: "No previous behavior check.",
    behaviorUnchanged: "Unchanged",
    missingLine: "{label} is no longer detected.",
    newUnknownLine: "New unclassified change detected in {label}.",
    regressionLine: "{label} · {previous} → {current}",
    pageFact: {
      same: "Same",
      changed: "Changed",
      not_comparable: "Not comparable",
      incomplete: "Incomplete",
    } as Record<MonitoringPageFact, string>,
    status: {
      incomplete: "Incomplete",
      attention_needed: "Attention needed",
      blocked: "Blocked",
      healthy: "Healthy",
    },
  },
};

const RENDERED_TYPES = new Set<InteractionCheckType>([
  "load_animation",
  "css_animation",
  "js_animation",
  "scroll_reveal",
  "carousel",
  "auto_carousel",
  "video",
  "embedded_video",
  "lottie",
  "svg_animation",
  "canvas",
  "webgl",
]);

const RENDERED_LABEL: Record<string, { ja: string; en: string }> = {
  load_animation: { ja: "読み込みアニメーション", en: "Load animation" },
  css_animation: { ja: "CSS アニメーション", en: "CSS animation" },
  js_animation: { ja: "JS アニメーション", en: "JS animation" },
  scroll_reveal: { ja: "スクロール表示", en: "Scroll reveal" },
  carousel: { ja: "カルーセル", en: "Carousel" },
  auto_carousel: { ja: "自動カルーセル", en: "Auto carousel" },
  video: { ja: "動画", en: "Video" },
  embedded_video: { ja: "埋め込み動画", en: "Embedded video" },
  lottie: { ja: "Lottie", en: "Lottie" },
  svg_animation: { ja: "SVG アニメーション", en: "SVG animation" },
  canvas: { ja: "Canvas", en: "Canvas" },
  webgl: { ja: "WebGL", en: "WebGL" },
};

function renderedStatus(status: string, locale: Locale): string {
  if (status === "working") return "Working";
  if (status === "no_change_observed") return locale === "ja" ? "描画の変化なし" : "No rendered motion observed";
  if (status === "failed") return "Problem";
  if (status === "playback_not_verifiable") return locale === "ja" ? "確認できない" : "Not verifiable";
  if (status === "blocked_for_safety") return locale === "ja" ? "安全のため未実行" : "Blocked for safety";
  return locale === "ja" ? "未測定" : "Not measured";
}

function behaviorLine(copy: (typeof COPY)["en"], alert: Extract<MonitoringAlert, { layer: "behavior" }>): string {
  if (alert.code === "behavior_missing") return copy.missingLine.replace("{label}", alert.label);
  if (alert.code === "behavior_new_unknown") return copy.newUnknownLine.replace("{label}", alert.label);
  return copy.regressionLine
    .replace("{label}", alert.label)
    .replace("{previous}", alert.previous ?? "—")
    .replace("{current}", alert.current);
}

export function ObservationCheckSummary({
  loaded,
  observationId,
  locale,
  seo = null,
  check = null,
  behaviorDiff = null,
}: {
  loaded: MonitoringRunLoaded;
  observationId: string;
  locale: Locale;
  seo?: PageSeoDerivedV1 | null;
  check?: RegionalInteractionCheckV1 | null;
  behaviorDiff?: BehaviorDiffV1 | null;
}) {
  if (loaded.run.execution !== "executed") return null;
  const copy = COPY[locale];
  const pages = (loaded.observations.length ? loaded.observations : []).map((row) => ({
    region: row.region,
    device: row.device,
    label: row.regionLabel,
    fact: row.page,
    id: row.id,
  }));
  const here = pages.find((row) => row.id === observationId) ?? null;
  const journeyRows = loaded.run.plan.workflowSteps > 0
    ? loaded.run.plan.regions.flatMap((region) => loaded.run.plan.environments.map((device) => {
        const found = loaded.journeyRuns.find((row) => row.region === region && row.deviceClass === device);
        return {
          region,
          device,
          label: pages.find((row) => row.region === region)?.label ?? region,
          status: monitoringJourneyFact(found?.status ?? null),
        };
      }))
    : [];
  const incomplete = pages.some((row) => row.fact === "incomplete") || journeyRows.some((row) => row.status === "incomplete");
  const status = monitoringReviewStatus({ incomplete, alerts: loaded.alerts });
  const review = presentMonitoringReview(loaded.alerts, loaded.diff.behavior.rows);
  const behaviorLines = review.behaviorSingles.slice(0, 8).map((alert) => behaviorLine(copy, alert));
  const health = presentInteractionHealth({ diff: behaviorDiff, check });
  const healthLabel = health
    ? health.signal === "problem"
      ? "Problem"
      : health.signal === "check"
        ? "Check"
        : "Good"
    : check
      ? copy.measured
      : copy.notMeasured;
  const rendered = (check?.types ?? []).filter((row) => row.detected && RENDERED_TYPES.has(row.type));
  const behaviorCount = (check?.types ?? []).filter((row) => row.status === "working" || row.status === "no_change_observed" || row.status === "failed" || row.status === "playback_not_verifiable" || row.status === "blocked_for_safety").length;
  const journeyHere = journeyRows.filter((row) => !here || (row.region === here.region && (!here.device || row.device === here.device)));
  const journeyPassed = journeyHere.filter((row) => row.status === "passed").length;
  const journeyFailed = journeyHere.filter((row) => row.status === "failed").length;
  const journeyBlocked = journeyHere.filter((row) => row.status === "blocked").length;
  const journeySummary = journeyHere.length
    ? [
        journeyPassed ? `${journeyPassed} Passed` : "",
        journeyFailed ? `${journeyFailed} Failed` : "",
        journeyBlocked ? `${journeyBlocked} Blocked` : "",
      ].filter(Boolean).join(" · ") || copy.none
    : copy.none;

  return (
    <section
      aria-labelledby="observation-check-summary"
      className="rounded-xl border border-border bg-surface-elevated p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="observation-check-summary" className="font-display text-lg font-semibold text-ink">
          {copy.title}
        </h2>
        <p className="text-sm font-semibold uppercase tracking-wide text-ink">{copy.status[status]}</p>
      </div>
      <dl className="mt-4 space-y-1 text-sm text-ink">
        <div>{copy.page} {here ? copy.pageFact[here.fact] : "—"}{here?.device ? ` · ${here.device === "mobile" ? "Mobile" : "Desktop"}` : ""}</div>
        <div>{copy.seo} {seo?.score == null ? "—" : `${seo.score} / 100`}</div>
        <div>{copy.behaviors} {healthLabel}</div>
        <div>{copy.journeys} {journeySummary}</div>
      </dl>
      {rendered.length ? (
        <ul className="mt-3 space-y-1 text-sm text-ink">
          {rendered.map((row) => (
            <li key={row.type}>
              {(RENDERED_LABEL[row.type]?.[locale] ?? row.type)} · {renderedStatus(row.status, locale)}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-4 text-sm text-ink">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.scope}</h3>
        <ul className="mt-1 space-y-1">
          <li>{copy.page} {here && here.fact !== "incomplete" ? copy.measured : copy.notMeasured}</li>
          <li>{copy.metadata} {seo ? `${seo.measured_signals} signals` : copy.notMeasured}</li>
          <li>{copy.behaviors} {check ? `${behaviorCount}` : copy.notMeasured}</li>
          <li>{copy.journeys} {journeyHere.length || copy.none}</li>
        </ul>
      </div>

      <div className="mt-4 space-y-4 text-sm text-ink">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.page}</h3>
          <ul className="mt-1 space-y-1">
            {pages.map((row) => {
              const current = row.id === observationId;
              const device = row.device === "mobile" ? "Mobile" : row.device === "desktop" ? "Desktop" : "";
              const text = `${row.label}${device ? ` · ${device}` : ""} · ${copy.pageFact[row.fact]}${current ? ` · ${copy.thisRecord}` : ""}`;
              return (
                <li key={row.id}>
                  {!current && row.id ? (
                    <Link href={`/dashboard/observations/${row.id}`} className="font-semibold underline">
                      {text}
                    </Link>
                  ) : (
                    text
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.behaviors}</h3>
          {!loaded.diff.behavior.measured ? (
            <p className="mt-1">{copy.notMeasured}</p>
          ) : behaviorLines.length === 0 && review.areas.length === 0 ? (
            <p className="mt-1">{loaded.diff.behavior.compared ? copy.behaviorUnchanged : copy.behaviorNoPrevious}</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {review.areas.map((area) => (
                <li key={area.id}>{area.title} · {area.count}</li>
              ))}
              {behaviorLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </div>

        {journeyRows.length ? (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.journeys}</h3>
            <ul className="mt-1 space-y-1">
              {journeyRows.map((row) => (
                <li key={`${row.region}-${row.device}`}>
                  {loaded.journeyName ?? "Journey"}
                  {pages.length > 1 ? ` · ${row.label}` : ""}
                  {` · ${row.device === "mobile" ? "Mobile" : "Desktop"} · `}
                  {journeyStatusLabel(row.status === "incomplete" ? "incomplete" : row.status, locale)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
