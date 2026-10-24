import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AttentionHourBoard } from "@/components/dashboard/AttentionHourBoard";
import {
  attentionFactFromObservation,
  buildAttentionHour,
  type AttentionAlertFact,
} from "@/lib/attention-hour";
import { getSession } from "@/lib/auth/session";
import { getMergedObservationsForPlan } from "@/lib/demo/user-observations";
import { formatJaDateTime } from "@/lib/format";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { parseMonitoringAlerts } from "@/lib/monitoring-run-diff";
import { observationHttpStatus } from "@/lib/observation-measurements";
import { loadObservationScrollInteractionsByIds } from "@/lib/observation-optional-metrics-store";
import type { RegionalInteractionCheckV1 } from "@/lib/observation-regional-interaction";
import type { PlanId } from "@/lib/plans";
import { getRegionLabelForLocale, getRegionOptions } from "@/lib/regions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: `${copy[locale].dashboardAttention.title} | Viewtrace`,
    robots: { index: false, follow: false },
  };
}

function regionLabel(value: string, locale: "ja" | "en", planId: PlanId): string {
  const option = getRegionOptions(planId).find((row) => row.value === value);
  return option ? getRegionLabelForLocale(option, locale) : value;
}

export default async function AttentionHourPage() {
  const locale = await getRequestLocale();
  const session = await getSession();
  if (!session) redirect("/login");

  const now = new Date();
  const since = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const all = await getMergedObservationsForPlan(session.plan);
  const observations = all.filter((row) => row.capturedAt >= since);
  const history = all.map((row) => ({ capturedAt: row.capturedAt, httpStatus: observationHttpStatus(row) }));
  const supabase = await createSupabaseServerClient();
  const checks = new Map<string, RegionalInteractionCheckV1>();
  const ids = observations.map((row) => row.id).slice(0, 36);
  for (let index = 0; index < ids.length; index += 12) {
    const part = await loadObservationScrollInteractionsByIds(supabase, session.userId, ids.slice(index, index + 12));
    for (const [id, check] of part) checks.set(id, check);
  }

  const facts = observations.map((row) => {
    const check = checks.get(row.id) ?? null;
    const executionErrors = (check?.types ?? []).filter((type) => type.status === "failed").map((type) => type.type);
    return attentionFactFromObservation(row, check?.discovery?.session ?? null, executionErrors);
  });

  const alerts: AttentionAlertFact[] = [];
  const { data: runs, error } = await supabase
    .from("monitoring_runs")
    .select("id,target_url,started_at,alerts")
    .eq("user_id", session.userId)
    .gte("started_at", since)
    .order("started_at", { ascending: false })
    .limit(40);
  if (!error) {
    for (const raw of runs ?? []) {
      const run = raw as { id?: unknown; target_url?: unknown; started_at?: unknown; alerts?: unknown };
      if (typeof run.id !== "string" || typeof run.started_at !== "string") continue;
      const url = typeof run.target_url === "string" ? run.target_url : "";
      const parsed = parseMonitoringAlerts(run.alerts) ?? [];
      for (const alert of parsed) {
        if (alert.layer === "behavior" && (alert.code === "behavior_regression" || alert.code === "behavior_missing")) {
          alerts.push({
            id: alert.id,
            at: run.started_at,
            url,
            regionLabel: regionLabel(alert.region, locale, session.plan),
            href: `/dashboard/monitoring-runs/${run.id}`,
            reason: alert.code,
            detail: `${alert.label} ${alert.previous ?? "—"} → ${alert.current}`,
          });
        }
        if (alert.layer === "journey" && alert.code === "journey_failed") {
          alerts.push({
            id: alert.id,
            at: run.started_at,
            url,
            regionLabel: regionLabel(alert.region, locale, session.plan),
            href: `/dashboard/monitoring-runs/${run.id}`,
            reason: "journey_failed",
            detail: `${alert.name} ${alert.previous ?? "—"} → ${alert.current}`,
          });
        }
      }
    }
  }

  const board = buildAttentionHour({ now, observations: facts, alerts, history });
  const text = copy[locale].dashboardAttention;
  return (
    <AttentionHourBoard
      board={board}
      copy={text}
      locale={locale}
      windowLabel={`${formatJaDateTime(board.windowStart, locale)} – ${formatJaDateTime(board.windowEnd, locale)}`}
      capturedLabel={(iso) => formatJaDateTime(iso, locale)}
    />
  );
}
