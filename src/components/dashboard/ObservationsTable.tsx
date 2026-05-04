import Link from "next/link";
import type { Observation } from "@/lib/demo/observations";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";

function StatusBadge({ status }: { status: Observation["status"] }) {
  const map = {
    success: { label: "成功", className: "bg-emerald-100 text-emerald-900" },
    failure: { label: "失敗", className: "bg-red-100 text-red-900" },
    pending: { label: "処理中", className: "bg-amber-100 text-amber-900" },
  } as const;
  const s = map[status];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.className}`}>
      {s.label}
    </span>
  );
}

export function ObservationsTable({
  rows,
  emptyMessage,
}: {
  rows: Observation[];
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-8 text-center text-sm text-[var(--color-ink-muted)]">
        {emptyMessage ?? "オブザベーションがありません。"}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            <tr>
              <th className="px-4 py-3">取得日時（JST）</th>
              <th className="px-4 py-3">URL</th>
              <th className="px-4 py-3">地域</th>
              <th className="px-4 py-3">ステータス</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-[var(--color-surface)]/80">
                <td className="px-4 py-3 align-top text-[var(--color-ink-muted)]">
                  <span className="text-[var(--color-ink)]">{formatJaDateTime(row.capturedAt)}</span>
                  <span className="mt-0.5 block text-[11px] text-[var(--color-ink-muted)]">
                    {formatUtcLabel(row.capturedAt)}
                  </span>
                </td>
                <td className="max-w-[220px] truncate px-4 py-3 align-top font-mono text-xs text-[var(--color-ink)]">
                  {row.url}
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-top text-[var(--color-ink)]">
                  {row.regionLabel}
                </td>
                <td className="px-4 py-3 align-top">
                  <StatusBadge status={row.status} />
                  {row.note ? (
                    <span className="mt-1 block text-[11px] text-[var(--color-ink-muted)]">
                      {row.note}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-right align-top">
                  <Link
                    href={`/dashboard/observations/${row.id}`}
                    className="font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
                  >
                    詳細
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
