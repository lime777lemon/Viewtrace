"use client";

type Props = {
  label: string;
};

export function PrintReportButton({ label }: Props) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent)]/40"
    >
      {label}
    </button>
  );
}
