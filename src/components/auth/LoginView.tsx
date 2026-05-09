"use client";

import Link from "next/link";
import { useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { ResendConfirmationForm } from "@/components/auth/ResendConfirmationForm";
import type { LoginLocale } from "@/lib/auth/login-copy";
import { loginPageCopy } from "@/lib/auth/login-copy";

type Mode = "signin" | "signup";

export function LoginView({
  callbackUrl,
  nextPath,
  initialMode,
  verified,
  showVerifiedSuccess,
}: {
  callbackUrl: string;
  nextPath?: string;
  initialMode: Mode;
  verified: boolean;
  /** メール確認後にセッションがあるとき true（認証完了 UI のみ表示） */
  showVerifiedSuccess: boolean;
}) {
  const [locale, setLocale] = useState<LoginLocale>("en");
  const t = loginPageCopy[locale];
  const continueHref =
    nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard";

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
              href="/contact"
              className="hidden font-medium text-[var(--color-ink-muted)] transition hover:text-[var(--color-ink)] sm:inline"
            >
              {t.contact}
            </Link>
            <Link
              href="/"
              className="font-medium text-[var(--color-accent)] transition hover:text-[var(--color-accent-hover)]"
            >
              {t.backToSite}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-4.25rem)] max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-16">
        <section className="order-2 lg:order-1">
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1 text-xs font-medium text-[var(--color-ink-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
            {t.productPill}
          </p>
          <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t.heroTitle}
          </h1>
          <ul className="mt-8 space-y-3 text-sm text-[var(--color-ink-muted)]">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
              {t.bullet1}
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
              {t.bullet2}
            </li>
          </ul>
        </section>

        <section className="order-1 lg:order-2">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 shadow-lg shadow-[var(--color-ink)]/5 sm:p-8">
            <div className="text-center">
              <p className="font-display text-lg font-semibold">Viewtrace</p>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{t.cardSubtitle}</p>
            </div>

            {showVerifiedSuccess ? (
              <div className="mt-6 rounded-2xl border border-emerald-200/90 bg-emerald-50/95 px-5 py-8 text-center shadow-sm">
                <p className="font-display text-xl font-semibold tracking-tight text-emerald-950">
                  {t.emailVerifiedSuccessTitle}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-emerald-900/95">
                  {t.emailVerifiedSuccessBody}
                </p>
                <Link
                  href={continueHref}
                  className="mt-8 inline-flex w-full justify-center rounded-full bg-[var(--color-accent)] px-5 py-3.5 text-sm font-semibold text-white shadow-md shadow-[var(--color-accent)]/20 transition hover:bg-[var(--color-accent-hover)]"
                >
                  {t.emailVerifiedDashboardCta}
                </Link>
              </div>
            ) : (
              <>
                <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left text-sm text-[var(--color-ink-muted)]">
                  <p className="font-medium text-[var(--color-ink)]">{t.emailSignInTitle}</p>
                  <p className="mt-2 leading-relaxed">
                    {t.signInHelpPart1}
                    <strong className="font-semibold text-[var(--color-ink)]">{t.getStarted}</strong>
                    {t.signInHelpPart2}
                    <strong className="font-semibold text-[var(--color-ink)]">{t.signIn}</strong>
                    {t.signInHelpPart3}
                    <strong className="font-semibold text-[var(--color-ink)]">{t.signInHelpStrong}</strong>
                    {t.signInHelpPart4}
                  </p>
                  {verified ? (
                    <p className="mt-3 rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-xs leading-relaxed text-emerald-950">
                      {t.verifiedNote}
                    </p>
                  ) : null}
                  <p className="mt-2">
                    {t.needHelpPrefix}
                    <Link
                      href="/contact"
                      className="font-medium text-[var(--color-accent)] underline underline-offset-2"
                    >
                      {t.contactLinkLabel}
                    </Link>
                    {t.needHelpSuffix}
                  </p>
                </div>

                <LoginForm
                  nextPath={nextPath}
                  initialMode={initialMode}
                  authCallbackUrl={callbackUrl}
                  locale={locale}
                />

                <ResendConfirmationForm authCallbackUrl={callbackUrl} locale={locale} />
              </>
            )}

            <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 border-t border-[var(--color-border)] pt-6 text-center text-xs text-[var(--color-ink-muted)]">
              <Link href="/terms" className="hover:text-[var(--color-ink)]">
                {t.terms}
              </Link>
              <span aria-hidden className="text-[var(--color-border)]">
                ·
              </span>
              <Link href="/privacy" className="hover:text-[var(--color-ink)]">
                {t.privacy}
              </Link>
              <span aria-hidden className="text-[var(--color-border)]">
                ·
              </span>
              <Link href="/acceptable-use" className="hover:text-[var(--color-ink)]">
                {t.acceptableUse}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
