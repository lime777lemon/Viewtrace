import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { journeyStatusLabel, journeyStepReport } from "@/lib/journey-definition";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { monitoringReviewStatus, type MonitoringAlert } from "@/lib/monitoring-run-diff";
import { presentMonitoringReview } from "@/lib/monitoring-run-summary";
import {
  monitoringJourneyFact,
  type MonitoringPageFact,
  type MonitoringParentStatus,
} from "@/lib/monitoring-run";
import { loadMonitoringRun } from "@/lib/monitoring-run-store";
import { getRegionLabelForLocale, getRegionOptions } from "@/lib/regions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Monitoring Run",
  robots: { index: false, follow: false },
};

const COPY = {
  ja: {
    notExecuted: "未実行",
    capacity: "今月の残量が足りないため、測定は開始していません。",
    required: "必要",
    available: "残量",
    page: "Page",
    behaviors: "Behaviors",
    journeys: "Journeys",
    issue: "Issue",
    expected: "Expected",
    observed: "Observed",
    working: "Working",
    openPage: "ページの記録を見る",
    openBehavior: "挙動の記録を見る",
    openJourney: "手順の記録を見る",
    notMeasured: "未測定",
    unknownChanges: "{n} 件の未知の変化",
    verified: "{n} 件を確認",
    protectedActions: "{n} 件は安全のため未クリック",
    reasonScreenshot: "前回の{region}の記録とスクリーンショットが違います。",
    reasonNotComparable: "前回の{region}の記録とは比較できません。",
    reasonNoPrevious: "前回の Monitoring Run には{region}のページ記録がありません。",
    reviewOne: "確認が必要な変化が 1件あります。",
    reviewMany: "確認が必要な変化が {n}件あります。",
    areaOne: "確認が必要な範囲が 1件あります。",
    areaMany: "確認が必要な範囲が {n}件あります。",
    reviewMixed: "{changes}と{areas}の確認が必要です。",
    changeUnitOne: "変化 1件",
    changeUnitMany: "変化 {n}件",
    areaUnitOne: "範囲 1件",
    areaUnitMany: "範囲 {n}件",
    behaviorNoPrevious: "前回の挙動記録はありません。",
    behaviorUnchanged: "変化なし",
    regressionOne: "回帰 1件",
    regressionMany: "回帰 {n}件",
    newUnknownOne: "未知の変化 1件",
    newUnknownMany: "未知の変化 {n}件",
    blockedOne: "安全境界 1件",
    blockedMany: "安全境界 {n}件",
    missingLine: "{label} は検出されなくなりました。",
    newUnknownLine: "{label} で未分類の変化を検出しました。",
    regressionLine: "{label} · {previous} → {current}",
    journeyTransition: "{name} · {previous} → {current}",
    stepLine: "{label} の期待は {expected}。前回 {previous}。今回 {current}。",
    reasonPageIncomplete: "{region}のページは記録されていません。",
    reasonBehaviorNew: "新しい挙動が検出されました。",
    reasonJourneyFailed: "{name} は通過しませんでした。",
    reasonJourneyIncomplete: "{name} は完了していません。",
    reasonJourneyBlocked: "{name} は安全境界で止まっています。",
    relatedOne: "関連する変化 1件",
    relatedMany: "関連する変化 {n}件",
    layoutVisibility: "レイアウトと表示の変化を検出しました",
    viewEvidenceOne: "根拠を1件見る",
    viewEvidenceMany: "根拠を{n}件見る",
    protectedHeading: "安全のため未クリック",
    detectedOne: "1件を検出",
    detectedMany: "{n}件を検出",
    addToJourney: "Journey に追加",
    back: "確認にもどる",
    status: {
      incomplete: "Incomplete",
      attention_needed: "Attention needed",
      blocked: "Blocked",
      healthy: "Healthy",
    } as Record<MonitoringParentStatus, string>,
    pageFact: {
      same: "Same",
      changed: "Changed",
      not_comparable: "Not comparable",
      incomplete: "Incomplete",
    } as Record<MonitoringPageFact, string>,
  },
  en: {
    notExecuted: "Not executed",
    capacity: "Insufficient monthly capacity.",
    required: "Required",
    available: "Available",
    page: "Page",
    behaviors: "Behaviors",
    journeys: "Journeys",
    issue: "Issue",
    expected: "Expected",
    observed: "Observed",
    working: "Working",
    openPage: "View page evidence",
    openBehavior: "View behavior evidence",
    openJourney: "View journey evidence",
    notMeasured: "Not measured",
    unknownChanges: "{n} unknown changes detected",
    verified: "{n} verified",
    protectedActions: "{n} protected actions",
    reasonScreenshot: "Screenshot differs from the previous {region} check.",
    reasonNotComparable: "This screenshot cannot be compared with the previous {region} check.",
    reasonNoPrevious: "No previous {region} page is recorded on a monitoring run.",
    reviewOne: "1 change needs review.",
    reviewMany: "{n} changes need review.",
    areaOne: "1 area needs review.",
    areaMany: "{n} areas need review.",
    reviewMixed: "{changes} and {areas} need review.",
    changeUnitOne: "1 change",
    changeUnitMany: "{n} changes",
    areaUnitOne: "1 area",
    areaUnitMany: "{n} areas",
    behaviorNoPrevious: "No previous behavior check.",
    behaviorUnchanged: "Unchanged",
    regressionOne: "1 regression",
    regressionMany: "{n} regressions",
    newUnknownOne: "1 new unknown",
    newUnknownMany: "{n} new unknown",
    blockedOne: "1 blocked",
    blockedMany: "{n} blocked",
    missingLine: "{label} is no longer detected.",
    newUnknownLine: "New unclassified change detected in {label}.",
    regressionLine: "{label} · {previous} → {current}",
    journeyTransition: "{name} · {previous} → {current}",
    stepLine: "{label} expected {expected}, previous {previous}, current {current}.",
    reasonPageIncomplete: "The {region} page was not recorded.",
    reasonBehaviorNew: "A new behavior was detected.",
    reasonJourneyFailed: "{name} did not pass.",
    reasonJourneyIncomplete: "{name} did not complete.",
    reasonJourneyBlocked: "{name} stayed inside the safety boundary.",
    relatedOne: "1 related change",
    relatedMany: "{n} related changes",
    layoutVisibility: "Layout and visibility changes detected",
    viewEvidenceOne: "View 1 evidence",
    viewEvidenceMany: "View {n} evidence",
    protectedHeading: "Protected actions",
    detectedOne: "1 detected",
    detectedMany: "{n} detected",
    addToJourney: "Add to Journey",
    back: "Back to the check",
    status: {
      incomplete: "Incomplete",
      attention_needed: "Attention needed",
      blocked: "Blocked",
      healthy: "Healthy",
    } as Record<MonitoringParentStatus, string>,
    pageFact: {
      same: "Same",
      changed: "Changed",
      not_comparable: "Not comparable",
      incomplete: "Incomplete",
    } as Record<MonitoringPageFact, string>,
  },
};

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function countCopy(one: string, many: string, n: number): string {
  return n === 1 ? one : many.replace("{n}", String(n));
}

function reviewHeadline(
  copy: (typeof COPY)["en"],
  changeCount: number,
  areaCount: number,
): string | null {
  if (changeCount === 0 && areaCount === 0) return null;
  if (areaCount === 0) return countCopy(copy.reviewOne, copy.reviewMany, changeCount);
  if (changeCount === 0) return countCopy(copy.areaOne, copy.areaMany, areaCount);
  return copy.reviewMixed
    .replace("{changes}", countCopy(copy.changeUnitOne, copy.changeUnitMany, changeCount))
    .replace("{areas}", countCopy(copy.areaUnitOne, copy.areaUnitMany, areaCount));
}

function areaAnchor(id: string): string {
  return `review-${id.replace(/:/g, "-")}`;
}

function pageAlertText(copy: (typeof COPY)["en"], alert: Extract<MonitoringAlert, { layer: "page" }>): string {
  if (alert.code === "screenshot_differs") return copy.reasonScreenshot.replace("{region}", alert.region);
  if (!alert.paired) return copy.reasonNoPrevious.replace("{region}", alert.region);
  return copy.reasonNotComparable.replace("{region}", alert.region);
}

function behaviorLine(copy: (typeof COPY)["en"], alert: Extract<MonitoringAlert, { layer: "behavior" }>): string {
  if (alert.code === "behavior_missing") return copy.missingLine.replace("{label}", alert.label);
  if (alert.code === "behavior_new_unknown") return copy.newUnknownLine.replace("{label}", alert.label);
  return copy.regressionLine
    .replace("{label}", alert.label)
    .replace("{previous}", alert.previous ?? "—")
    .replace("{current}", alert.current);
}

function formatWhen(iso: string, locale: "ja" | "en"): string {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return iso;
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(time);
}

export default async function MonitoringRunPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const locale = await getRequestLocale();
  const copy = COPY[locale];
  const supabase = await createSupabaseServerClient();
  const loaded = await loadMonitoringRun(supabase, session.userId, id);
  if (!loaded) notFound();

  const labels = new Map(
    getRegionOptions(session.plan).map((option) => [option.value, getRegionLabelForLocale(option, locale)]),
  );
  const regionName = (region: string, fallback?: string) => labels.get(region) ?? fallback ?? region;
  const { run } = loaded;
  const when = formatWhen(run.startedAt, locale);

  if (run.execution === "not_executed") {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-sm font-semibold text-ink">Monitoring Run — {copy.notExecuted}</p>
        <p className="text-sm text-ink-muted">{run.targetUrl}</p>
        <p className="text-sm text-ink-muted">{when}</p>
        <p className="text-sm text-ink">{copy.capacity}</p>
        <p className="text-sm text-ink">
          {copy.required}: {run.requiredChecks} · {copy.available}: {run.availableChecks ?? "—"}
        </p>
        <Link href="/dashboard/region-search" className="text-sm font-semibold text-ink underline">{copy.back}</Link>
      </div>
    );
  }

  const pages = run.plan.regions.map((region) => {
    const found = loaded.observations.find((row) => row.region === region);
    return {
      region,
      label: regionName(region, found?.regionLabel),
      fact: found?.page ?? "incomplete",
      id: found?.id ?? null,
      working: found?.working ?? null,
      newUnknown: found?.newUnknown ?? false,
      behavior: found?.behavior ?? null,
    };
  });
  const journeyRows = run.plan.workflowSteps > 0
    ? run.plan.regions.flatMap((region) => run.plan.environments.map((device) => {
        const found = loaded.journeyRuns.find((row) => row.region === region && row.deviceClass === device);
        return {
          region,
          label: regionName(region),
          device,
          status: monitoringJourneyFact(found?.status ?? null),
          run: found ?? null,
        };
      }))
    : [];
  const incomplete = pages.some((row) => row.fact === "incomplete") || journeyRows.some((row) => row.status === "incomplete");
  const status = monitoringReviewStatus({ incomplete, alerts: loaded.alerts });
  const review = presentMonitoringReview(loaded.alerts, loaded.diff.behavior.rows);
  const journeyAlerts = loaded.alerts.filter((alert) => alert.layer === "journey");
  const journeyRegressions = journeyAlerts.filter((alert) => alert.code === "journey_failed").length;
  const journeyBlocked = journeyAlerts.filter((alert) => alert.code === "journey_blocked").length;
  const headline = reviewHeadline(copy, review.changeCount, review.areas.length);
  const regionLine = [...new Set(pages.map((row) => row.label))].join(", ");
  const behaviorRows = pages.filter((row) => row.behavior);
  const pageEvidenceId = pages.find((row) => row.id)?.id ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Monitoring Run</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">{hostLabel(run.targetUrl)}</h1>
        <p className="mt-3 text-sm text-ink">{regionLine}</p>
        <p className="mt-1 text-sm text-ink-muted">{when}</p>
        <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-ink">{copy.status[status]}</p>
        {headline ? <p className="mt-2 text-sm text-ink">{headline}</p> : null}
        {incomplete ? (
          <div className="mt-2 space-y-1">
            {pages.filter((row) => row.fact === "incomplete").map((row) => (
              <p key={row.region} className="text-sm text-ink">{copy.reasonPageIncomplete.replace("{region}", row.label)}</p>
            ))}
            {journeyRows.filter((row) => row.status === "incomplete").map((row) => (
              <p key={`${row.region}-${row.device}`} className="text-sm text-ink">{copy.reasonJourneyIncomplete.replace("{name}", loaded.journeyName ?? "Journey")}</p>
            ))}
          </div>
        ) : null}
      </header>

      <section className="space-y-4 text-sm text-ink">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.page}</h2>
          <ul className="mt-1 space-y-2">
            {loaded.diff.pages.map((row) => {
              const alert = loaded.alerts.find((item): item is Extract<MonitoringAlert, { layer: "page" }> => item.layer === "page" && item.region === (row.regionLabel || row.region));
              const fact = row.captured ? row.verdict : "incomplete";
              return (
                <li key={row.region}>
                  <p>{pages.length > 1 ? `${row.regionLabel} · ` : ""}{copy.pageFact[fact]}</p>
                  {alert && alert.layer === "page" ? <p>{pageAlertText(copy, alert)}</p> : null}
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.behaviors}</h2>
          {!loaded.diff.behavior.measured ? (
            <p className="mt-1">{copy.notMeasured}</p>
          ) : (
            <div className="mt-1 space-y-3">
              {review.areas.map((area) => (
                <div key={area.id}>
                  <p className="font-semibold">{area.title}</p>
                  <p>{countCopy(copy.relatedOne, copy.relatedMany, area.count)}</p>
                  <p>{copy.layoutVisibility}</p>
                  <a href={`#${areaAnchor(area.id)}`} className="font-semibold underline">{countCopy(copy.viewEvidenceOne, copy.viewEvidenceMany, area.count)}</a>
                </div>
              ))}
              {review.behaviorSingles.map((alert) => (
                <p key={alert.id}>{behaviorLine(copy, alert)}</p>
              ))}
              {review.areas.length === 0 && review.behaviorSingles.length === 0 ? (
                <p>{loaded.diff.behavior.compared ? copy.behaviorUnchanged : copy.behaviorNoPrevious}</p>
              ) : null}
            </div>
          )}
        </div>
        {journeyRows.length ? (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.journeys}</h2>
            <div className="mt-1 space-y-2">
              {journeyRegressions || journeyBlocked ? (
                <p>
                  {[
                    journeyRegressions ? countCopy(copy.regressionOne, copy.regressionMany, journeyRegressions) : "",
                    journeyBlocked ? countCopy(copy.blockedOne, copy.blockedMany, journeyBlocked) : "",
                  ].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              {journeyAlerts.map((alert) => alert.layer === "journey" ? (
                <div key={alert.id}>
                  <p>
                    {alert.previous
                      ? copy.journeyTransition
                        .replace("{name}", alert.name)
                        .replace("{previous}", journeyStatusLabel(alert.previous, locale))
                        .replace("{current}", journeyStatusLabel(alert.current, locale))
                      : `${alert.name} · ${journeyStatusLabel(alert.current, locale)}`}
                  </p>
                  {alert.steps.map((step) => (
                    <p key={`${alert.id}-${step.label}`}>
                      {copy.stepLine
                        .replace("{label}", step.label)
                        .replace("{expected}", step.expected || "—")
                        .replace("{previous}", step.previous || "—")
                        .replace("{current}", step.current || "—")}
                    </p>
                  ))}
                </div>
              ) : null)}
              {journeyAlerts.length === 0 ? journeyRows.map((row) => (
                <p key={`${row.region}-${row.device}`}>
                  {loaded.journeyName ?? "Journey"}
                  {journeyRows.length > 1 ? ` · ${row.device === "mobile" ? "Mobile" : "Desktop"}` : ""}
                  {" · "}
                  {journeyStatusLabel(row.status === "incomplete" ? "incomplete" : row.status, locale)}
                </p>
              )) : null}
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-2">
          {pageEvidenceId ? (
            <a href="#page-evidence" className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink">{copy.openPage}</a>
          ) : null}
          <a href="#behavior-evidence" className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink">{copy.openBehavior}</a>
          {journeyRows.length ? (
            <a href="#journey-evidence" className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink">{copy.openJourney}</a>
          ) : null}
        </div>
      </section>

      <section id="page-evidence" className="scroll-mt-6 space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.page}</h2>
        <ul className="space-y-2 text-sm text-ink">
          {loaded.diff.pages.map((row) => {
            const fact = row.captured ? row.verdict : "incomplete";
            return (
              <li key={row.region}>
                {row.regionLabel} · {copy.pageFact[fact]}
                {row.currentObservationId ? (
                  <Link href={`/dashboard/observations/${row.currentObservationId}`} className="ml-2 underline">{copy.openPage}</Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section id="behavior-evidence" className="scroll-mt-6 space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.behaviors}</h2>
        {review.areas.map((area) => (
          <details key={area.id} id={areaAnchor(area.id)} className="scroll-mt-6 text-sm text-ink">
            <summary className="cursor-pointer font-semibold">{area.title} · {countCopy(copy.viewEvidenceOne, copy.viewEvidenceMany, area.count)}</summary>
            <ul className="mt-2 space-y-1 text-xs text-ink-muted">
              {area.evidence.map((item, index) => (
                <li key={`${area.id}-${index}`}>{item.selector}{item.changes.length ? ` · ${item.changes.join(", ")}` : ""}</li>
              ))}
            </ul>
          </details>
        ))}
        {behaviorRows.length === 0 && review.areas.length === 0 ? <p className="text-sm text-ink">{copy.notMeasured}</p> : behaviorRows.length === 0 ? null : (
          <div className="space-y-4 text-sm text-ink">
            {behaviorRows.map((row) => {
              const findings = row.behavior?.findings;
              return (
                <div key={row.region} className="space-y-3">
                  {behaviorRows.length > 1 ? <p>{row.label}</p> : null}
                  {findings?.layout.map((finding) => (
                    <details key={finding.id} id={finding.id} className="scroll-mt-6">
                      <summary className="cursor-pointer font-semibold">{finding.title} · {countCopy(copy.viewEvidenceOne, copy.viewEvidenceMany, finding.count)}</summary>
                      <ul className="mt-2 space-y-1 text-xs text-ink-muted">
                        {finding.evidence.map((item, index) => (
                          <li key={`${finding.id}-${index}`}>{item.selector}{item.changes.length ? ` · ${item.changes.join(", ")}` : ""}</li>
                        ))}
                      </ul>
                    </details>
                  ))}
                  {findings?.protected.map((finding) => (
                    <details key={finding.id} id={finding.id} className="scroll-mt-6">
                      <summary className="cursor-pointer font-semibold">{finding.label} · {countCopy(copy.viewEvidenceOne, copy.viewEvidenceMany, finding.count)}</summary>
                      <ul className="mt-2 space-y-1 text-xs text-ink-muted">
                        {finding.evidence.map((item, index) => (
                          <li key={`${finding.id}-${index}`}>{item.text}{item.selector ? ` · ${item.selector}` : ""}</li>
                        ))}
                      </ul>
                    </details>
                  ))}
                  {findings && findings.ungrouped.length > 0 ? (
                    <ul className="space-y-1 text-xs text-ink-muted">
                      {findings.ungrouped.map((item, index) => (
                        <li key={`ungrouped-${index}`}>{item.selector}{item.changes.length ? ` · ${item.changes.join(", ")}` : ""}</li>
                      ))}
                    </ul>
                  ) : null}
                  {row.id ? (
                    <Link href={`/dashboard/observations/${row.id}#observation-interaction-check`} className="inline-block font-semibold underline">{copy.openBehavior}</Link>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {journeyRows.length ? (
        <section id="journey-evidence" className="scroll-mt-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.journeys}</h2>
          {journeyRows.map((row) => (
            <article key={`${row.region}-${row.device}`} className="space-y-3">
              <p className="text-sm font-semibold text-ink">
                {loaded.journeyName ?? "Journey"} · {row.label} · {row.device === "mobile" ? "Mobile" : "Desktop"} · {journeyStatusLabel(row.status === "incomplete" ? "incomplete" : row.status, locale)}
              </p>
              <ol className="space-y-3">
                {(row.run?.steps ?? []).map((step, index) => {
                  const defined = loaded.journeySteps.find((item) => item.id === step.id) ?? loaded.journeySteps[index] ?? null;
                  const report = journeyStepReport(step, defined, index, locale);
                  return (
                    <li key={`${row.run?.id ?? row.region}-${step.id}`} className="text-sm text-ink">
                      <p className="font-semibold">{report.title}</p>
                      <dl className="mt-1 space-y-0.5 text-xs text-ink-muted">
                        {report.lines.map((line, lineIndex) => (
                          <div key={`${line.label}-${lineIndex}`} className="flex gap-2">
                            <dt>{line.label}</dt>
                            <dd className="min-w-0 break-all">{line.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </li>
                  );
                })}
              </ol>
            </article>
          ))}
          {run.journeyId ? (
            <Link href={`/dashboard/journeys/${run.journeyId}`} className="text-sm font-semibold text-ink underline">{copy.openJourney}</Link>
          ) : null}
        </section>
      ) : null}

      <Link href="/dashboard/region-search" className="text-sm font-semibold text-ink underline">{copy.back}</Link>
    </div>
  );
}
