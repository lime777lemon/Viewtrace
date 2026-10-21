import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { journeyStatusLabel, journeyStepReport } from "@/lib/journey-definition";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import {
  monitoringJourneyFact,
  monitoringParentStatus,
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
    openPage: "ページの記録を開く",
    openJourney: "手順の記録を開く",
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
    openPage: "Open page evidence",
    openJourney: "Open journey evidence",
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

function formatWhen(iso: string, locale: "ja" | "en"): string {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return iso;
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
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
  const status = monitoringParentStatus({
    pages: pages.map((row) => row.fact),
    journeys: journeyRows.map((row) => row.status),
    newUnknown: pages.some((row) => row.newUnknown),
  });
  const showBehaviors = pages.some((row) => row.working != null);
  const issues = journeyRows.flatMap((row) => {
    if (row.status !== "failed" || !row.run) return [];
    return row.run.steps.flatMap((step, index) => {
      if (step.status !== "fail") return [];
      const defined = loaded.journeySteps.find((item) => item.id === step.id) ?? loaded.journeySteps[index] ?? null;
      const report = journeyStepReport(step, defined, index, locale);
      const expected = report.lines.find((line) => line.label === "Expected" || line.label === "期待")?.value ?? "";
      const observed = report.lines.find((line) => line.label === "Evidence")?.value
        ?? report.lines.find((line) => line.label === "Current URL" || line.label === "現在の URL")?.value
        ?? step.detail
        ?? "";
      return [{
        key: `${row.run?.id ?? row.region}-${step.id}`,
        title: `${loaded.journeyName ?? "Journey"} → ${report.title}`,
        expected,
        observed,
      }];
    });
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-ink">Monitoring Run — {copy.status[status]}</p>
        <p className="mt-2 text-sm text-ink">{run.targetUrl}</p>
        <p className="mt-1 text-xs text-ink-muted">{when}</p>
      </div>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.page}</h2>
        <ul className="mt-2 space-y-1 text-sm text-ink">
          {pages.map((row) => (
            <li key={row.region}>
              {row.label} · {copy.pageFact[row.fact]}
              {row.id ? (
                <>
                  {" · "}
                  <Link href={`/dashboard/observations/${row.id}`} className="underline">{copy.openPage}</Link>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {showBehaviors ? (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.behaviors}</h2>
          <ul className="mt-2 space-y-1 text-sm text-ink">
            {pages.filter((row) => row.working != null).map((row) => (
              <li key={row.region}>{row.label} · {row.working} {copy.working}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {journeyRows.length ? (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.journeys}</h2>
          <ul className="mt-2 space-y-1 text-sm text-ink">
            {journeyRows.map((row) => (
              <li key={`${row.region}-${row.device}`}>
                {loaded.journeyName ?? "Journey"} · {row.label} · {row.device === "mobile" ? "Mobile" : "Desktop"} · {journeyStatusLabel(row.status === "incomplete" ? "incomplete" : row.status, locale)}
              </li>
            ))}
          </ul>
          {run.journeyId ? (
            <p className="mt-2 text-sm">
              <Link href={`/dashboard/journeys/${run.journeyId}`} className="font-semibold text-ink underline">{copy.openJourney}</Link>
            </p>
          ) : null}
        </section>
      ) : null}

      {issues.length ? (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.issue}</h2>
          <ul className="mt-2 space-y-3">
            {issues.map((issue) => (
              <li key={issue.key} className="text-sm text-ink">
                <p className="font-semibold">{issue.title}</p>
                {issue.expected ? <p className="text-ink-muted">{copy.expected} {issue.expected}</p> : null}
                {issue.observed ? <p className="text-ink-muted">{copy.observed} {issue.observed}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Link href="/dashboard/region-search" className="text-sm font-semibold text-ink underline">{copy.back}</Link>
    </div>
  );
}
