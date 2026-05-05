"use client";

import { logoutAction } from "@/app/actions/auth";

export function LogoutButton({ label = "ログアウト" }: { label?: string }) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:border-[var(--color-ink-muted)]/40"
      >
        {label}
      </button>
    </form>
  );
}
