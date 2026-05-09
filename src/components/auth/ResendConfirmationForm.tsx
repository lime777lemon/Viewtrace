"use client";

import { useId, useState } from "react";
import { isValidEmail, mapAuthErrorForLocale } from "@/lib/auth/form-helpers";
import { POST_EMAIL_VERIFY_PATH } from "@/lib/auth/email-verified-copy";
import type { LoginLocale } from "@/lib/auth/login-copy";
import { loginPageCopy } from "@/lib/auth/login-copy";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ResendConfirmationForm({
  authCallbackUrl,
  locale,
}: {
  authCallbackUrl: string;
  locale: LoginLocale;
}) {
  const t = loginPageCopy[locale];
  const [state, setState] = useState<{ error?: string; message?: string } | null>(null);
  const [pending, setPending] = useState(false);
  const emailId = useId();

  function buildEmailRedirectTo(): string {
    const u = new URL(authCallbackUrl);
    u.searchParams.set("next", POST_EMAIL_VERIFY_PATH);
    return u.toString();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    if (!email || !isValidEmail(email)) {
      setState({ error: t.form.errInvalidEmail });
      return;
    }

    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: buildEmailRedirectTo() },
      });
      if (error) {
        console.warn("[auth] resend confirmation failed", error.message, error);
        setState({ error: mapAuthErrorForLocale(error.message, locale) });
        return;
      }
      setState({ message: t.resendSuccess });
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left"
    >
      <p className="text-xs font-medium text-[var(--color-ink)]">{t.resendTitle}</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-muted)]">{t.resendHint}</p>
      <label htmlFor={emailId} className="mt-3 block text-xs font-medium text-[var(--color-ink)]">
        {t.form.email}
      </label>
      <input
        id={emailId}
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder={t.form.emailPlaceholder}
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
        {pending ? t.resendSending : t.resendSubmit}
      </button>
    </form>
  );
}
