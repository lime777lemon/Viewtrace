import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin";
import { getSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  computeVerifyFunnel,
  loadRecentVerifyLoopChains,
  loadVerifyFunnelRows,
} from "@/lib/verify-loop/funnel";

export const metadata: Metadata = {
  title: "Verify funnel (Admin) | Viewtrace",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function pct(value: number | null): string {
  if (value == null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export default async function AdminVerifyFunnelPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdminSession(session)) redirect("/dashboard");

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Verify funnel</h1>
        <p className="text-sm text-ink-muted">Admin client is not configured.</p>
      </div>
    );
  }

  const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const rows = await loadVerifyFunnelRows(admin, sinceIso);
  const { counts, rates } = computeVerifyFunnel(rows);
  const chains = await loadRecentVerifyLoopChains(admin, 25);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Verify funnel</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Last 30 days. Unique anonymous sessions. Source of truth is <code>verify_events</code>.
        </p>
      </div>

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(
          [
            ["Verify views", counts.verify_view],
            ["CTA clicks", counts.verify_cta_click],
            ["URL submitted", counts.url_submitted],
            ["Signups started", counts.signup_started],
            ["Signups completed", counts.signup_completed],
            ["First observations", counts.first_observation_created],
          ] as const
        ).map(([label, n]) => (
          <li key={label} className="rounded-2xl border border-border bg-surface-elevated p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{n}</p>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-border bg-surface-elevated p-5">
        <h2 className="text-sm font-semibold text-ink">Conversion</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-ink-muted">CTA click rate</dt>
            <dd className="font-mono text-sm">{pct(rates.ctaClickRate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">URL submission rate</dt>
            <dd className="font-mono text-sm">{pct(rates.urlSubmissionRate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Signup conversion (from URL)</dt>
            <dd className="font-mono text-sm">{pct(rates.signupConversionRate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">First-observation conversion (from URL)</dt>
            <dd className="font-mono text-sm">{pct(rates.firstObservationConversionRate)}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-border bg-surface-elevated p-5">
        <h2 className="text-sm font-semibold text-ink">
          Observation A → User B → Observation B
        </h2>
        {chains.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">No completed loops yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-160 text-left text-xs">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="py-2 pr-3 font-medium">Source obs A</th>
                  <th className="py-2 pr-3 font-medium">Verify token</th>
                  <th className="py-2 pr-3 font-medium">User B</th>
                  <th className="py-2 pr-3 font-medium">Obs B</th>
                  <th className="py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {chains.map((row) => (
                  <tr key={`${row.anonymousSessionId}-${row.resultObservationId}`} className="border-b border-border/70">
                    <td className="py-2 pr-3 font-mono">{row.sourceObservationId ?? "—"}</td>
                    <td className="py-2 pr-3 font-mono">{row.verifyToken.slice(0, 8)}…</td>
                    <td className="py-2 pr-3 font-mono">{row.userId ?? "—"}</td>
                    <td className="py-2 pr-3 font-mono">{row.resultObservationId ?? "—"}</td>
                    <td className="py-2 text-ink-muted">{row.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
