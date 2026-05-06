import { formatJaDateTime, formatUtcLabel } from "@/lib/format";
import { copy, type Locale } from "@/lib/i18n";

export type PurchaseRecord = {
  stripe_subscription_id: string | null;
  plan_id: string | null;
  status: string | null;
  mode: "test" | "live" | null;
  /** Stripe Subscription.created を Webhook / sync で保存した購入日時 */
  created_at: string | null;
  updated_at: string | null;
};

function maskId(id: string | null): string {
  if (!id) return "-";
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function StatusBadge({ status }: { status: string | null }) {
  const s = (status ?? "").toLowerCase();
  const map: Record<string, { label: string; className: string }> = {
    active: { label: "active", className: "bg-emerald-100 text-emerald-900" },
    trialing: { label: "trialing", className: "bg-emerald-100 text-emerald-900" },
    past_due: { label: "past_due", className: "bg-amber-100 text-amber-900" },
    canceled: { label: "canceled", className: "bg-zinc-200 text-zinc-900" },
    unpaid: { label: "unpaid", className: "bg-red-100 text-red-900" },
    incomplete: { label: "incomplete", className: "bg-amber-100 text-amber-900" },
    incomplete_expired: {
      label: "incomplete_expired",
      className: "bg-zinc-200 text-zinc-900",
    },
  };
  const v = map[s] ?? { label: status ?? "-", className: "bg-zinc-200 text-zinc-900" };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${v.className}`}>
      {v.label}
    </span>
  );
}

function planLabel(planId: string | null, locale: Locale): string {
  if (!planId) return "-";
  if (planId === "starter") return "Starter";
  if (planId === "pro") return "Pro";
  return locale === "ja" ? `不明（${planId}）` : `Unknown (${planId})`;
}

export function PurchaseHistoryTable({
  rows,
  locale,
  emptyMessage,
}: {
  rows: PurchaseRecord[];
  locale: Locale;
  emptyMessage?: string;
}) {
  const th = copy[locale].dashboardHome;

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-8 text-center text-sm text-[var(--color-ink-muted)]">
        {emptyMessage ?? (locale === "ja" ? "購入履歴がありません。" : "No purchase history yet.")}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            <tr>
              <th className="px-4 py-3">{th.purchaseTablePurchaseDate}</th>
              <th className="px-4 py-3">{th.purchaseTableLastUpdated}</th>
              <th className="px-4 py-3">{locale === "ja" ? "プラン" : "Plan"}</th>
              <th className="px-4 py-3">{locale === "ja" ? "ステータス" : "Status"}</th>
              <th className="px-4 py-3">{locale === "ja" ? "モード" : "Mode"}</th>
              <th className="px-4 py-3">{locale === "ja" ? "サブスクID" : "Subscription ID"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {rows.map((row, i) => {
              const purchaseTs = row.created_at ?? row.updated_at;
              const purchaseIsFallback = !row.created_at && Boolean(row.updated_at);
              const updatedTs = row.updated_at;
              return (
                <tr
                  key={`${row.stripe_subscription_id ?? "no-sub"}-${i}`}
                  className="hover:bg-[var(--color-surface)]/80"
                >
                  <td className="px-4 py-3 align-top text-[var(--color-ink-muted)]">
                    {purchaseTs ? (
                      <>
                        <span className="text-[var(--color-ink)]">{formatJaDateTime(purchaseTs)}</span>
                        <span className="mt-0.5 block text-[11px] text-[var(--color-ink-muted)]">
                          {formatUtcLabel(purchaseTs)}
                        </span>
                        {purchaseIsFallback ? (
                          <span className="mt-1 block text-[10px] italic text-[var(--color-ink-muted)]">
                            {th.purchaseTablePurchaseDateFallbackHint}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-[var(--color-ink-muted)]">
                    {updatedTs ? (
                      <>
                        <span className="text-[var(--color-ink)]">{formatJaDateTime(updatedTs)}</span>
                        <span className="mt-0.5 block text-[11px] text-[var(--color-ink-muted)]">
                          {formatUtcLabel(updatedTs)}
                        </span>
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-[var(--color-ink)]">
                    {planLabel(row.plan_id, locale)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 align-top text-[var(--color-ink)]">{row.mode ?? "-"}</td>
                  <td className="px-4 py-3 align-top font-mono text-xs text-[var(--color-ink)]">
                    {maskId(row.stripe_subscription_id)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

