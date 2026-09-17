import type { LpVerdictCode } from "@/lib/observation-evidence-json";

type Copy = {
  title: string;
  hint: string;
  codeLpRendered: string;
  codeLpNoSnapshot: string;
  codeLpCaptureFailed: string;
  codeLpPending: string;
  snapshotLabel: string;
  snapshotYes: string;
  snapshotNo: string;
  httpStatus: string;
  captureScope: string;
  scopeFullPage: string;
  scopeViewport: string;
  scopeUnknown: string;
};

type Props = {
  copy: Copy;
  code: LpVerdictCode;
  snapshotPresent: boolean;
  httpStatus: number | null;
  captureScope: "full_page" | "viewport" | "unknown";
};

const CODE_TONE: Record<LpVerdictCode, string> = {
  lp_rendered: "border-accent/30 bg-accent-soft/40 text-accent",
  lp_no_snapshot: "border-amber-300/80 bg-amber-50 text-amber-950",
  lp_capture_failed: "border-rose-300/80 bg-rose-50 text-rose-950",
  lp_pending: "border-border bg-surface text-ink-muted",
};

export function ObservationLpVerdictCard({
  copy,
  code,
  snapshotPresent,
  httpStatus,
  captureScope,
}: Props) {
  const label =
    code === "lp_rendered"
      ? copy.codeLpRendered
      : code === "lp_no_snapshot"
        ? copy.codeLpNoSnapshot
        : code === "lp_capture_failed"
          ? copy.codeLpCaptureFailed
          : copy.codeLpPending;

  const scopeLabel =
    captureScope === "full_page"
      ? copy.scopeFullPage
      : captureScope === "viewport"
        ? copy.scopeViewport
        : copy.scopeUnknown;

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4 sm:col-span-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">{copy.hint}</p>
      <p className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${CODE_TONE[code]}`}>
        {label}
      </p>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-ink-muted">{copy.httpStatus}</dt>
          <dd className="font-mono text-ink">{httpStatus ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{copy.captureScope}</dt>
          <dd className="text-ink">{scopeLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{copy.snapshotLabel}</dt>
          <dd className="text-ink">{snapshotPresent ? copy.snapshotYes : copy.snapshotNo}</dd>
        </div>
      </dl>
    </div>
  );
}
