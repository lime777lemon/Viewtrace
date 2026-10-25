import Link from "next/link";
import { journeyStatusLabel } from "@/lib/journey-definition";
import type { Locale } from "@/lib/i18n";
import { presentInteractionHealth } from "@/lib/interaction-health-presentation";
import type { PageSeoDerivedV1 } from "@/lib/measurement-record";
import { monitoringReviewStatus, type MonitoringAlert } from "@/lib/monitoring-run-diff";
import { firstScreenshotCompareNote, monitoringJourneyFact, type MonitoringPageFact } from "@/lib/monitoring-run";
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
    signals: "{n} signals",
    measuredCount: "測定 {n}",
    reasonScreenshot: "前回の{region}の記録とスクリーンショットが違います。",
    reasonNotComparable: "前回の{region}の記録とは比較できません。",
    reasonNoPrevious: "前回の記録には{region}のページがありません。",
    area: {
      Header: "ヘッダー",
      Navigation: "ナビゲーション",
      Main: "本文",
      Form: "フォーム",
      Sidebar: "サイドバー",
      Footer: "フッター",
      Motion: "動き",
      Page: "ページ",
    },
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
    signals: "{n} signals",
    measuredCount: "{n} measured",
    reasonScreenshot: "Screenshot differs from the previous {region} check.",
    reasonNotComparable: "This screenshot cannot be compared with the previous {region} check.",
    reasonNoPrevious: "No previous {region} page is on record.",
    area: {
      Header: "Header",
      Navigation: "Navigation",
      Main: "Main",
      Form: "Form",
      Sidebar: "Sidebar",
      Footer: "Footer",
      Motion: "Motion",
      Page: "Page",
    },
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

function renderedChip(status: string): string {
  if (status === "working") return "bg-emerald-50 text-emerald-950 ring-emerald-200";
  if (status === "failed") return "bg-rose-50 text-rose-950 ring-rose-200";
  return "bg-surface text-ink-muted ring-border";
}

function reviewChip(status: "incomplete" | "attention_needed" | "blocked" | "healthy"): string {
  if (status === "attention_needed") return "bg-amber-50 text-amber-950 ring-amber-200";
  if (status === "healthy") return "bg-emerald-50 text-emerald-950 ring-emerald-200";
  if (status === "blocked") return "bg-stone-100 text-stone-800 ring-stone-300";
  return "bg-surface text-ink ring-border";
}

function pageAlertText(
  copy: (typeof COPY)["en"],
  alert: Extract<MonitoringAlert, { layer: "page" }>,
  region: string,
): string {
  if (alert.code === "screenshot_differs") return copy.reasonScreenshot.replace("{region}", region);
  if (!alert.paired) return copy.reasonNoPrevious.replace("{region}", region);
  return copy.reasonNotComparable.replace("{region}", region);
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
  publicView = false,
}: {
  loaded: MonitoringRunLoaded;
  observationId: string;
  locale: Locale;
  seo?: PageSeoDerivedV1 | null;
  check?: RegionalInteractionCheckV1 | null;
  behaviorDiff?: BehaviorDiffV1 | null;
  /** 公開 Evidence Report。他の記録へのダッシュボード導線は出さない。 */
  publicView?: boolean;
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
  const pageAlerts = loaded.alerts.filter((alert): alert is Extract<MonitoringAlert, { layer: "page" }> => alert.layer === "page");
  const pageAlert = pageAlerts.find((alert) => !here || alert.region === here.region || alert.region === here.label) ?? pageAlerts[0] ?? null;
  const reason = pageAlert
    ? pageAlert.code === "screenshot_not_comparable" && !pageAlert.paired
      ? firstScreenshotCompareNote({
          locale,
          regionLabel: here?.label || pageAlert.region,
          device: here?.device ?? null,
          previousPages: loaded.previousPages.filter((page) => !here || page.region !== here.region),
        })
      : pageAlertText(copy, pageAlert, here?.label || pageAlert.region)
    : null;
  const deviceLabel = here?.device === "mobile" ? "Mobile" : here?.device === "desktop" ? "Desktop" : "";
  const session = check?.discovery?.session ?? null;
  const workingCount = rendered.filter((row) => row.status === "working").length;
  const stillCount = rendered.filter((row) => row.status === "no_change_observed").length;
  const sessionStats = session
    ? [
        { label: "HTTP", value: session.http.timed_out ? "timeout" : String(session.http.status ?? "—") },
        { label: "JS", value: String(session.resources.script) },
        { label: "CSS", value: String(session.resources.stylesheet) },
        { label: "img", value: String(session.resources.image) },
        { label: "failed", value: String(session.resources.failed) },
        { label: "console", value: String(session.errors.console_error) },
        { label: "pageerror", value: String(session.errors.pageerror) },
        ...(session.performance.fcp_ms != null ? [{ label: "FCP", value: `${session.performance.fcp_ms}ms` }] : []),
        ...(session.performance.lcp_ms != null ? [{ label: "LCP", value: `${session.performance.lcp_ms}ms` }] : []),
        ...(session.performance.cls != null ? [{ label: "CLS", value: String(session.performance.cls) }] : []),
      ]
    : [];
  const behaviorNote = !loaded.diff.behavior.measured
    ? copy.notMeasured
    : behaviorLines.length === 0 && review.areas.length === 0
      ? (loaded.diff.behavior.compared ? copy.behaviorUnchanged : copy.behaviorNoPrevious)
      : null;

  return (
    <section
      aria-labelledby="observation-check-summary"
      className="rounded-xl border border-border bg-surface-elevated p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="observation-check-summary" className="font-display text-lg font-semibold text-ink">
          {copy.title}
        </h2>
        <p className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${reviewChip(status)}`}>
          {copy.status[status]}
        </p>
      </div>
      {reason ? <p className="mt-2 text-sm leading-relaxed text-ink-muted">{reason}</p> : null}

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface px-3 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{copy.page}</dt>
          <dd className={`mt-1 text-sm font-semibold ${here?.fact === "not_comparable" || here?.fact === "changed" ? "text-amber-950" : "text-ink"}`}>
            {here ? copy.pageFact[here.fact] : "—"}
          </dd>
          <dd className="mt-1 text-xs text-ink-muted">
            {[deviceLabel, here && here.fact !== "incomplete" ? copy.measured : copy.notMeasured].filter(Boolean).join(" · ")}
          </dd>
        </div>
        <div className="rounded-lg border border-border bg-surface px-3 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{copy.seo}</dt>
          <dd className="mt-1 text-sm font-semibold text-ink">
            {seo?.score == null ? "—" : seo.score}
            {seo?.score == null ? null : <span className="text-xs font-medium text-ink-muted"> / 100</span>}
          </dd>
          {seo?.score != null ? (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border" aria-hidden>
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(0, Math.min(100, seo.score))}%` }} />
            </div>
          ) : null}
          <dd className="mt-1 text-xs text-ink-muted">
            {seo ? copy.signals.replace("{n}", String(seo.measured_signals)) : copy.notMeasured}
          </dd>
        </div>
        <div className="rounded-lg border border-border bg-surface px-3 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{copy.behaviors}</dt>
          <dd className="mt-1 text-sm font-semibold text-ink">{healthLabel}</dd>
          <dd className="mt-1 text-xs text-ink-muted">
            {check ? copy.measuredCount.replace("{n}", String(behaviorCount)) : copy.notMeasured}
          </dd>
        </div>
        <div className="rounded-lg border border-border bg-surface px-3 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{copy.journeys}</dt>
          <dd className="mt-1 text-sm font-semibold text-ink">{journeySummary}</dd>
          <dd className="mt-1 text-xs text-ink-muted">{journeyHere.length ? copy.measured : "\u00a0"}</dd>
        </div>
      </dl>

      {rendered.length ? (
        <div className="mt-4">
          <p className="text-xs text-ink-muted">
            {[
              workingCount ? `Working ${workingCount}` : "",
              stillCount ? `${renderedStatus("no_change_observed", locale)} ${stillCount}` : "",
            ].filter(Boolean).join(" · ")}
          </p>
          <ul className="mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {rendered.map((row) => (
              <li key={row.type} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-sm text-ink">{RENDERED_LABEL[row.type]?.[locale] ?? row.type}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${renderedChip(row.status)}`}>
                  {renderedStatus(row.status, locale)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {health && health.areas.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {health.areas.map((area) => (
            <li key={area.id} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-950 ring-1 ring-amber-200">
              {copy.area[area.id]} · {area.count}
            </li>
          ))}
        </ul>
      ) : null}

      {sessionStats.length ? (
        <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-5">
          {sessionStats.map((stat) => (
            <div key={stat.label} className="bg-surface-elevated px-2.5 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{stat.label}</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums text-ink">{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-4 space-y-2 text-sm text-ink">
        {pages.length > 1 ? (
          <ul className="space-y-1">
            {pages.map((row) => {
              const current = row.id === observationId;
              const device = row.device === "mobile" ? "Mobile" : row.device === "desktop" ? "Desktop" : "";
              const text = `${row.label}${device ? ` · ${device}` : ""} · ${copy.pageFact[row.fact]}${current ? ` · ${copy.thisRecord}` : ""}`;
              return (
                <li key={row.id}>
                  {!current && row.id && !publicView ? (
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
        ) : here ? (
          <p className="text-xs text-ink-muted">
            {here.label}{deviceLabel ? ` · ${deviceLabel}` : ""} · {copy.pageFact[here.fact]} · {copy.thisRecord}
          </p>
        ) : null}

        {behaviorNote ? <p className="text-xs text-ink-muted">{behaviorNote}</p> : null}
        {review.areas.length || behaviorLines.length ? (
          <ul className="space-y-1">
            {review.areas.map((area) => (
              <li key={area.id}>{area.title} · {area.count}</li>
            ))}
            {behaviorLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}

        {journeyRows.length ? (
          <ul className="space-y-1 text-xs text-ink-muted">
            {journeyRows.map((row) => (
              <li key={`${row.region}-${row.device}`}>
                {loaded.journeyName ?? "Journey"}
                {pages.length > 1 ? ` · ${row.label}` : ""}
                {` · ${row.device === "mobile" ? "Mobile" : "Desktop"} · `}
                {journeyStatusLabel(row.status === "incomplete" ? "incomplete" : row.status, locale)}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
