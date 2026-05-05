"use client";

import { useActionState, useId, useState } from "react";
import { authFormAction } from "@/app/actions/auth";

type Mode = "signin" | "signup";

export function LoginForm({
  nextPath,
  initialMode = "signup",
}: {
  nextPath?: string;
  initialMode?: Mode;
}) {
  const [state, formAction, pending] = useActionState(authFormAction, null);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<Mode>(initialMode);
  const passwordId = useId();
  const passwordConfirmId = useId();
  const safeNext =
    nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "";

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <input type="hidden" name="intent" value={mode} />
      {safeNext ? <input type="hidden" name="next" value={safeNext} /> : null}

      <div className="flex rounded-xl border border-[var(--color-border)] p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-lg py-2 transition ${
            mode === "signup"
              ? "bg-[var(--color-accent)] text-white shadow-sm"
              : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          }`}
        >
          無料で始める
        </button>
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`flex-1 rounded-lg py-2 transition ${
            mode === "signin"
              ? "bg-[var(--color-accent)] text-white shadow-sm"
              : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          }`}
        >
          ログイン
        </button>
      </div>

      {mode === "signup" ? (
        <p className="text-xs leading-relaxed text-[var(--color-ink-muted)]">
          メールアドレスとパスワードだけで登録できます。パスワードは半角英字・数字のみ（8文字以上、記号は使えません）。
          <span className="font-medium text-[var(--color-ink)]">
            登録後に届くメールのリンクでアドレス確認が完了するまで、ログインはできません。
          </span>
          会社名などはログイン後に任意で入力できます。
        </p>
      ) : null}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-[var(--color-ink)]">
          メールアドレス
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm outline-none ring-[var(--color-accent)]/25 transition placeholder:text-[var(--color-ink-muted)]/60 focus:border-[var(--color-accent)]/40 focus:ring-2"
        />
      </div>
      <div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={passwordId} className="block text-sm font-medium text-[var(--color-ink)]">
            パスワード
          </label>
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="text-xs font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
          >
            {showPassword ? "隠す" : "表示"}
          </button>
        </div>
        <input
          id={passwordId}
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={mode === "signup" ? 8 : undefined}
          placeholder={mode === "signup" ? "半角英数字8文字以上" : "パスワード"}
          className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm outline-none ring-[var(--color-accent)]/25 transition placeholder:text-[var(--color-ink-muted)]/60 focus:border-[var(--color-accent)]/40 focus:ring-2"
        />
        {mode === "signup" ? (
          <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
            半角英字・数字のみ、8文字以上で設定してください。
          </p>
        ) : null}
      </div>
      {mode === "signup" ? (
        <div>
          <label
            htmlFor={passwordConfirmId}
            className="block text-sm font-medium text-[var(--color-ink)]"
          >
            パスワード（確認）
          </label>
          <input
            id={passwordConfirmId}
            name="passwordConfirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="もう一度入力"
            className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm outline-none ring-[var(--color-accent)]/25 transition placeholder:text-[var(--color-ink-muted)]/60 focus:border-[var(--color-accent)]/40 focus:ring-2"
          />
          <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
            上と同じパスワードを入力してください。
          </p>
        </div>
      ) : null}
      {state?.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200/80 bg-red-50 px-3 py-2.5 text-sm text-red-900"
        >
          {state.error}
        </p>
      ) : null}
      {state?.message ? (
        <p
          role="status"
          className="whitespace-pre-line rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2.5 text-sm leading-relaxed text-emerald-900"
        >
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-[var(--color-accent)] py-3.5 text-sm font-semibold text-white shadow-md shadow-[var(--color-accent)]/20 transition hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
      >
        {pending
          ? mode === "signup"
            ? "登録中…"
            : "ログイン中…"
          : mode === "signup"
            ? "無料で始める"
            : "ログイン"}
      </button>
    </form>
  );
}
