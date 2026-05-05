export default function Loading() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16 text-center">
      <h1 className="font-display text-xl font-semibold text-[var(--color-ink)]">
        認証を完了しています…
      </h1>
      <p className="mt-3 text-sm text-[var(--color-ink-muted)]">この画面は自動的に遷移します。</p>
    </div>
  );
}

