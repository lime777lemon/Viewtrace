import { formatJaDate, formatJaDateTime, formatUtcLabel } from "@/lib/format";
import { copy, type Locale } from "@/lib/i18n";
import type { StripeMonthlyInvoice } from "@/lib/stripe";

function formatMoney(amountCents: number, currency: string, locale: Locale): string {
  try {
    return new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function StatusBadge({ status }: { status: string | null }) {
  const s = (status ?? "").toLowerCase();
  const map: Record<string, { label: string; className: string }> = {
    paid: { label: "paid", className: "bg-emerald-100 text-emerald-900" },
    open: { label: "open", className: "bg-amber-100 text-amber-900" },
    uncollectible: { label: "uncollectible", className: "bg-red-100 text-red-900" },
    void: { label: "void", className: "bg-zinc-200 text-zinc-900" },
  };
  const v = map[s] ?? { label: status ?? "-", className: "bg-zinc-200 text-zinc-900" };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${v.className}`}>
      {v.label}
    </span>
  );
}

function periodLabel(row: StripeMonthlyInvoice, locale: Locale): string {
  if (row.periodStart && row.periodEnd) {
    return `${formatJaDate(row.periodStart, locale)} – ${formatJaDate(row.periodEnd, locale)}`;
  }
  return "—";
}

export function PurchaseHistoryTable({
  invoices,
  locale,
  emptyMessage,
}: {
  invoices: StripeMonthlyInvoice[];
  locale: Locale;
  emptyMessage?: string;
}) {
  const th = copy[locale].dashboardHome;

  if (invoices.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface-elevated px-4 py-8 text-center text-sm text-ink-muted">
        {emptyMessage ?? (locale === "ja" ? "月次の請求はまだありません。" : "No monthly invoices yet.")}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-elevated">
      <div className="overflow-x-auto">
        <table className="w-full min-w-200 text-left text-sm">
          <thead className="border-b border-border bg-surface text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3">{th.purchaseTablePeriod}</th>
              <th className="px-4 py-3">{th.purchaseTablePaidAt}</th>
              <th className="px-4 py-3">{th.purchaseTableAmount}</th>
              <th className="px-4 py-3">{locale === "ja" ? "ステータス" : "Status"}</th>
              <th className="px-4 py-3">{th.purchaseTableInvoice}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.map((row) => (
              <tr key={row.id} className="hover:bg-surface/80">
                <td className="px-4 py-3 align-top text-ink">{periodLabel(row, locale)}</td>
                <td className="px-4 py-3 align-top text-ink-muted">
                  <span className="text-ink">{formatJaDateTime(row.paidAt, locale)}</span>
                  <span className="mt-0.5 block text-[11px] text-ink-muted">
                    {formatUtcLabel(row.paidAt)}
                  </span>
                </td>
                <td className="px-4 py-3 align-top font-medium text-ink">
                  {formatMoney(row.amountCents, row.currency, locale)}
                </td>
                <td className="px-4 py-3 align-top">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3 align-top">
                  {row.hostedInvoiceUrl ? (
                    <a
                      href={row.hostedInvoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-accent hover:text-accent-hover"
                    >
                      {th.purchaseTableInvoiceOpen}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
