"use client";

import Link from "next/link";
import { useState } from "react";
import {
  emailVerifiedCopy,
  type EmailVerifiedLocale,
  POST_EMAIL_VERIFY_PATH,
} from "@/lib/auth/email-verified-copy";

export function EmailVerifiedView({ hasSession }: { hasSession: boolean }) {
  const [locale, setLocale] = useState<EmailVerifiedLocale>("ja");
  const t = emailVerifiedCopy[locale];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-surface)] text-[var(--color-ink)]">
      <div
        className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-[var(--color-accent-soft)] opacity-70 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[var(--color-accent-soft)] opacity-50 blur-3xl"
        aria-hidden
      />

      <header className="relative z-10 border-b border-[var(--color-border)]/80 bg-[var(--color-surface-elevated)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="font-display text-lg font-semibold tracking-tight">
            Viewtrace
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm sm:gap-4">
            <div
              className="flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5 text-xs"
              role="group"
              aria-label={t.langAria}
            >
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={`rounded-full px-3 py-1.5 font-medium transition ${
                  locale === "en"
                    ? "bg-[var(--color-accent)] text-white"
                    : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                }`}
              >
                {t.english}
              </button>
              <button
                type="button"
                onClick={() => setLocale("ja")}
                className={`rounded-full px-3 py-1.5 font-medium transition ${
                  locale === "ja"
                    ? "bg-[var(--color-accent)] text-white"
                    : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                }`}
              >
                {t.japanese}
              </button>
            </div>
            <Link
              href="/"
              className="font-medium text-[var(--color-accent)] transition hover:text-[var(--color-accent-hover)]"
            >
              {t.backToSite}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-4.25rem)] max-w-lg flex-col justify-center px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/95 p-8 text-center shadow-sm sm:p-10">
          <p className="font-display text-2xl font-semibold tracking-tight text-emerald-950">{t.title}</p>
          <p className="mt-4 text-sm leading-relaxed text-emerald-900/95">{t.body}</p>
          {hasSession ? (
            <p className="mt-3 text-sm leading-relaxed text-emerald-900/90">
              {t.alreadySignedInHint}{" "}
              <Link
                href="/dashboard"
                className="font-semibold text-emerald-950 underline decoration-emerald-700/40 underline-offset-2 hover:text-emerald-900"
              >
                {t.dashboardCta}
              </Link>
            </p>
          ) : null}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={`/login?mode=signin&from=${encodeURIComponent(POST_EMAIL_VERIFY_PATH)}`}
              className="inline-flex justify-center rounded-full bg-[var(--color-accent)] px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-[var(--color-accent)]/20 transition hover:bg-[var(--color-accent-hover)]"
            >
              {t.loginCta}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
