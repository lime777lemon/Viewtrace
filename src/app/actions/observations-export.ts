"use server";

import { getSession } from "@/lib/auth/session";
import { appendAuditEvent, AUDIT_ACTION } from "@/lib/audit-log";
import { getMergedObservationsForPlan } from "@/lib/demo/user-observations";
import { observationsToCsv } from "@/lib/observations-csv-format";
import { getPlan } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function exportObservationsCsvAction(
  includeAuditJson = false,
): Promise<{ ok: true; csv: string; filename: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  const plan = getPlan(session.plan);
  if (!plan.csvExport) return { ok: false, error: "pro_only" };

  const supabase = await createSupabaseServerClient();
  const rows = await getMergedObservationsForPlan(session.plan);
  const mode = includeAuditJson ? "audit" : "standard";
  const csv = observationsToCsv(rows, mode);

  await appendAuditEvent(supabase, {
    scope: "system",
    action: AUDIT_ACTION.OBSERVATIONS_EXPORT_CSV,
    meta: { rowCount: rows.length, plan: session.plan, csvMode: mode },
  });

  const date = new Date().toISOString().slice(0, 10);
  return {
    ok: true,
    csv,
    filename: includeAuditJson
      ? `viewtrace-observations-audit-${date}.csv`
      : `viewtrace-observations-${date}.csv`,
  };
}

export async function exportObservationsCsvForWatchAction(
  url: string,
  region: string,
  includeAuditJson = false,
): Promise<{ ok: true; csv: string; filename: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  const plan = getPlan(session.plan);
  if (!plan.csvExport) return { ok: false, error: "pro_only" };

  const trimmedUrl = url.trim();
  const trimmedRegion = region.trim();
  if (!trimmedUrl || !trimmedRegion) return { ok: false, error: "invalid_watch" };

  const supabase = await createSupabaseServerClient();
  const all = await getMergedObservationsForPlan(session.plan);
  const rows = all.filter((r) => r.url === trimmedUrl && r.regionValue === trimmedRegion);
  const mode = includeAuditJson ? "audit" : "standard";
  const csv = observationsToCsv(rows, mode);

  await appendAuditEvent(supabase, {
    scope: "system",
    action: AUDIT_ACTION.OBSERVATIONS_EXPORT_CSV,
    meta: {
      rowCount: rows.length,
      plan: session.plan,
      watchUrl: trimmedUrl,
      watchRegion: trimmedRegion,
      csvMode: mode,
    },
  });

  const slug = trimmedRegion.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "region";
  const date = new Date().toISOString().slice(0, 10);
  return {
    ok: true,
    csv,
    filename: includeAuditJson
      ? `viewtrace-watch-${slug}-audit-${date}.csv`
      : `viewtrace-watch-${slug}-${date}.csv`,
  };
}
