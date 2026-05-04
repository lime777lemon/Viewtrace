"use client";

import { useMemo, useState } from "react";

type ApiOk = {
  ok: true;
  rowCount: number;
  fields: string[];
  rows: Record<string, unknown>[];
  truncated: boolean;
};

type ApiErr = { ok: false; error: string };

function formatCell(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function AdminSqlEditor() {
  const [query, setQuery] = useState<string>("select now() as now;");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiOk | null>(null);

  const canRun = useMemo(() => query.trim().length > 0 && !pending, [query, pending]);

  async function run() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sql", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const json = (await res.json()) as ApiOk | ApiErr;
      if (!res.ok || !json.ok) {
        setResult(null);
        setError(!json.ok ? json.error : "Request failed");
        return;
      }
      setResult(json);
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
        <label htmlFor="sql-query" className="text-sm font-semibold text-[var(--color-ink)]">
          SQL
        </label>
        <textarea
          id="sql-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={10}
          spellCheck={false}
          className="mt-2 w-full resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 font-mono text-sm text-[var(--color-ink)] outline-none ring-[var(--color-accent)]/25 transition focus:border-[var(--color-accent)]/40 focus:ring-2"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={run}
            disabled={!canRun}
            className="inline-flex rounded-full bg-[var(--color-ink)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "実行中…" : "実行"}
          </button>
          <p className="text-xs text-[var(--color-ink-muted)]">
            管理者のみ。結果は最大200行で切り捨てます。
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--color-ink)]">結果</p>
            <p className="text-xs text-[var(--color-ink-muted)]">
              rows: {result.rows.length}
              {result.truncated ? "（省略あり）" : ""} · rowCount: {result.rowCount}
            </p>
          </div>
          <div className="mt-3 overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <table className="min-w-full text-left text-xs">
              <thead className="sticky top-0 bg-[var(--color-surface-elevated)]">
                <tr>
                  {result.fields.map((f) => (
                    <th
                      key={f}
                      className="whitespace-nowrap border-b border-[var(--color-border)] px-3 py-2 font-semibold text-[var(--color-ink)]"
                    >
                      {f}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, idx) => (
                  <tr key={idx} className="border-b border-[var(--color-border)] last:border-b-0">
                    {result.fields.map((f) => (
                      <td key={f} className="whitespace-nowrap px-3 py-2 text-[var(--color-ink)]">
                        {formatCell(row[f])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

