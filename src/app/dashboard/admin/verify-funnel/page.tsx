import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin";
import { getSession } from "@/lib/auth/session";
import { loadActivationFunnel, type ActivationFunnel } from "@/lib/observation-repeat";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  computeVerifyFunnel,
  loadRecentVerifyLoopChains,
  loadVerifyFunnelRows,
} from "@/lib/verify-loop/funnel";

export const metadata: Metadata = {
  title: "Usage (Admin) | Viewtrace",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function pct(value: number | null): string {
  if (value == null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function ActivationCards({ funnel }: { funnel: ActivationFunnel }) {
  return (
    <>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Registered", funnel.counts.registered],
            ["Email confirmed", funnel.counts.confirmed],
            ["First Observation", funnel.counts.withFirst],
            ["Second Observation", funnel.counts.withSecond],
          ] as const
        ).map(([label, n]) => (
          <li key={label} className="rounded-2xl border border-border bg-surface-elevated p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{n}</p>
          </li>
        ))}
      </ol>
      <div className="rounded-2xl border border-border bg-surface-elevated p-5">
        <dl className="grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-ink-muted">Registered → confirmed</dt>
            <dd className="font-mono text-sm">{pct(funnel.rates.confirmRate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Confirmed → first Observation</dt>
            <dd className="font-mono text-sm">{pct(funnel.rates.firstObservationRate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">First → second Observation</dt>
            <dd className="font-mono text-sm">{pct(funnel.rates.secondObservationRate)}</dd>
          </div>
        </dl>
      </div>
    </>
  );
}

export default async function AdminVerifyFunnelPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdminSession(session)) redirect("/dashboard");

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Usage</h1>
        <p className="text-sm text-ink-muted">Admin client is not configured.</p>
      </div>
    );
  }

  const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const activation = await loadActivationFunnel(admin);
  const rows = await loadVerifyFunnelRows(admin, sinceIso);
  const { counts, rates } = computeVerifyFunnel(rows);
  const chains = await loadRecentVerifyLoopChains(admin, 25);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Usage</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Activation first. Do not read signup → Observation as one funnel. Public share links (
          <code>/verify/[token]</code>) are secondary.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Activation</h2>
          <p className="mt-1 text-sm text-ink-muted">
            All-time. Registered and confirmed from <code>auth.users</code>. First and second Observation
            use confirmed users as the denominator.
          </p>
        </div>
        <ActivationCards funnel={activation.all} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Activation (external)</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Same steps, excluding <code>ACTIVATION_EXCLUDE_EMAILS</code>, <code>ADMIN_EMAILS</code>, and{" "}
            <code>@viewtrace.net</code>. {activation.all.counts.registered - activation.external.counts.registered}{" "}
            accounts excluded. Small n: one leftover test inbox moves the rate. Do not ship first-login UI from two
            drop-offs.
          </p>
        </div>
        <ActivationCards funnel={activation.external} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Public share link</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Last 30 days. Unique anonymous sessions in <code>verify_events</code>. Not the product north star.
          </p>
        </div>

        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["Share views", counts.verify_view],
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
          <h3 className="text-sm font-semibold text-ink">Share-link conversion</h3>
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
            <div className="sm:col-span-2">
              <dt className="text-xs text-ink-muted">Share view → next Observation (secondary)</dt>
              <dd className="font-mono text-sm">{pct(rates.loopConversionRate)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-border bg-surface-elevated p-5">
          <h3 className="text-sm font-semibold text-ink">Share → signup → Observation</h3>
          {chains.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">No completed share-link loops yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-160 text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-ink-muted">
                    <th className="py-2 pr-3 font-medium">Source obs A</th>
                    <th className="py-2 pr-3 font-medium">Share token</th>
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
      </section>
    </div>
  );
}
