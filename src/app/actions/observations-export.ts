"use server";

import { getSession } from "@/lib/auth/session";
import { appendAuditEvent, AUDIT_ACTION } from "@/lib/audit-log";
import { getMergedObservationsForPlan } from "@/lib/demo/user-observations";
import { observationsToCsv } from "@/lib/observations-csv-format";
import { getPlan } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function exportObservationsCsvAction(): Promise<
  { ok: true; csv: string; filename: string } | { ok: false; error: string }
> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  const plan = getPlan(session.plan);
  if (!plan.csvExport) return { ok: false, error: "pro_only" };

  const supabase = await createSupabaseServerClient();
  const rows = await getMergedObservationsForPlan(session.plan);
  const csv = observationsToCsv(rows);

  await appendAuditEvent(supabase, {
    action: AUDIT_ACTION.OBSERVATIONS_EXPORT_CSV,
    resourceType: "observations",
    meta: { rowCount: rows.length, plan: session.plan },
  });

  return {
    ok: true,
    csv,
    filename: `viewtrace-observations-${new Date().toISOString().slice(0, 10)}.csv`,
  };
}
