"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";

export type TrialSignupCopy = {
  intro: string;
  emailLabel: string;
  placeholder: string;
  submit: string;
  success: string;
  error: string;
  submitting: string;
};

type Props = {
  locale: Locale;
  copy: TrialSignupCopy;
};

export function TrialSignupForm({ locale, copy: t }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/trial-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), locale }),
      });
      const data = (await res.json()) as { ok?: boolean };
      if (res.ok && data.ok) {
        setStatus("success");
        setEmail("");
        return;
      }
      setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      <p className="text-sm text-[var(--color-ink-muted)]">{t.intro}</p>
      <label className="block text-sm font-medium text-[var(--color-ink)]">
        {t.emailLabel}
        <input
          type="email"
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading"}
          autoComplete="email"
          placeholder={t.placeholder}
          className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm outline-none ring-[var(--color-accent)]/30 transition focus:ring-2 disabled:opacity-60"
        />
      </label>
      {status === "success" ? (
        <p role="status" className="text-sm font-medium text-emerald-800">
          {t.success}
        </p>
      ) : null}
      {status === "error" ? (
        <p role="alert" className="text-sm text-red-700">
          {t.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-full bg-[var(--color-accent)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
      >
        {status === "loading" ? t.submitting : t.submit}
      </button>
    </form>
  );
}
