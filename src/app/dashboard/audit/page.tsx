import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";

export const metadata: Metadata = {
  title: "監査ログ | Viewtrace",
  robots: { index: false, follow: false },
};

type AuditRow = {
  id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  meta: Record<string, unknown> | null;
  chain_hash: string;
  created_at: string;
};

export default async function DashboardAuditPage() {
  const locale = await getRequestLocale();
  const t = copy[locale].dashboardAudit;

  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_events")
    .select("id,action,resource_type,resource_id,meta,chain_hash,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows: AuditRow[] = (data ?? []).filter(Boolean) as AuditRow[];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href="/dashboard"
          className="font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
        >
          ← {t.back}
        </Link>
      </div>
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{t.subtitle}</p>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {t.loadError}
        </p>
      ) : null}

      {!error && rows.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-muted)]">{t.empty}</p>
      ) : null}

      {!error && rows.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
              <tr>
                <th className="px-4 py-3">{t.colAt}</th>
                <th className="px-4 py-3">{t.colAction}</th>
                <th className="px-4 py-3">{t.colResource}</th>
                <th className="px-4 py-3">{t.colMeta}</th>
                <th className="px-4 py-3">{t.colChain}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {rows.map((r) => (
                <tr key={r.id} className="bg-[var(--color-surface)]">
                  <td className="whitespace-nowrap px-4 py-3 align-top text-[var(--color-ink)]">
                    <span className="block">{formatJaDateTime(r.created_at)}</span>
                    <span className="text-xs text-[var(--color-ink-muted)]">{formatUtcLabel(r.created_at)}</span>
                  </td>
                  <td className="px-4 py-3 align-top font-mono text-xs text-[var(--color-ink)]">{r.action}</td>
                  <td className="px-4 py-3 align-top text-xs text-[var(--color-ink-muted)]">
                    {r.resource_type ? (
                      <span className="font-mono">
                        {r.resource_type}
                        {r.resource_id ? ` · ${r.resource_id.slice(0, 8)}…` : ""}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="max-w-xs px-4 py-3 align-top">
                    <pre className="whitespace-pre-wrap break-all font-mono text-[10px] leading-snug text-[var(--color-ink-muted)]">
                      {r.meta && Object.keys(r.meta).length > 0
                        ? JSON.stringify(r.meta, null, 0).slice(0, 400)
                        : "—"}
                      {r.meta && JSON.stringify(r.meta).length > 400 ? "…" : ""}
                    </pre>
                  </td>
                  <td className="px-4 py-3 align-top font-mono text-[10px] text-[var(--color-ink-muted)]">
                    {r.chain_hash.slice(0, 12)}…
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
