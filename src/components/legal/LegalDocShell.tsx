import Link from "next/link";

type LegalDocShellProps = {
  title: string;
  updated?: string;
  children: React.ReactNode;
};

export function LegalDocShell({ title, updated, children }: LegalDocShellProps) {
  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-ink)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="font-display text-lg font-semibold tracking-tight">
            Viewtrace
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-[var(--color-ink-muted)] transition hover:text-[var(--color-ink)]"
          >
            トップへ戻る
          </Link>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
          {title}
        </h1>
        {updated ? (
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">最終更新：{updated}</p>
        ) : null}
        <div className="prose-custom mt-10 space-y-8 text-[var(--color-ink)]">{children}</div>
      </article>
    </div>
  );
}
