import type { RegionEnvironmentMatrix, RegionMatrixCell } from "@/lib/region-environment-matrix";

function mark(cell: RegionMatrixCell): string {
  if (cell === "pass") return "✓";
  if (cell === "fail") return "✕";
  return "—";
}

function markClass(cell: RegionMatrixCell): string {
  if (cell === "pass") return "text-emerald-800";
  if (cell === "fail") return "font-semibold text-red-800";
  return "text-ink-muted";
}

export function RegionEnvironmentMatrixView({ matrix }: { matrix: RegionEnvironmentMatrix }) {
  if (!matrix.columns.length || !matrix.rows.length) return null;
  return (
    <section className="space-y-3">
      {matrix.findings.map((line) => (
        <p key={line} className="text-sm font-semibold text-ink">{line}</p>
      ))}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-left text-xs text-ink">
          <thead>
            <tr className="border-b border-border align-top">
              <th className="sticky left-0 bg-surface px-3 py-3" />
              {matrix.columns.map((column) => (
                <th key={column.id} className="min-w-40 px-3 py-3 font-semibold">
                  {column.label}
                  <ul className="mt-2 space-y-0.5 font-normal text-ink-muted">
                    {column.facts.map((fact) => (
                      <li key={`${column.id}-${fact.label}`} className="break-all">
                        <span className="font-semibold">{fact.label}</span> {fact.value}
                      </li>
                    ))}
                  </ul>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <th className="sticky left-0 bg-surface px-3 py-2 text-left font-semibold">{row.label}</th>
                {row.cells.map((cell, index) => (
                  <td key={`${row.id}-${matrix.columns[index]?.id ?? index}`} className={`px-3 py-2 ${markClass(cell)}`}>
                    {mark(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
