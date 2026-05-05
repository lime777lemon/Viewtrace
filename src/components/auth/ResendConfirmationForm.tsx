"use client";

import { useActionState, useId } from "react";
import { resendSignupConfirmationAction } from "@/app/actions/auth";

export function ResendConfirmationForm() {
  const [state, formAction, pending] = useActionState(resendSignupConfirmationAction, null);
  const emailId = useId();

  return (
    <form action={formAction} className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left">
      <p className="text-xs font-medium text-[var(--color-ink)]">確認メールが届かない場合</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-muted)]">
        登録したメールアドレスを入力して再送できます（短時間に繰り返すと制限されることがあります）。
      </p>
      <label htmlFor={emailId} className="mt-3 block text-xs font-medium text-[var(--color-ink)]">
        メールアドレス
      </label>
      <input
        id={emailId}
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@company.com"
        className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm outline-none ring-[var(--color-accent)]/25 focus:ring-2"
      />
      {state?.error ? (
        <p role="alert" className="mt-2 text-xs text-red-800">
          {state.error}
        </p>
      ) : null}
      {state?.message ? (
        <p role="status" className="mt-2 text-xs text-emerald-800">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-3 w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-border)]/30 disabled:opacity-60"
      >
        {pending ? "送信中…" : "確認メールを再送"}
      </button>
    </form>
  );
}
