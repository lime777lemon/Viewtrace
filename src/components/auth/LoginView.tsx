"use client";

import Link from "next/link";
import { useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import type { LoginLocale } from "@/lib/auth/login-copy";
import { loginPageCopy } from "@/lib/auth/login-copy";

type Mode = "signin" | "signup";

export function LoginView({
  callbackUrl,
  nextPath,
  initialMode,
  verified,
}: {
  callbackUrl: string;
  nextPath?: string;
  initialMode: Mode;
  verified: boolean;
}) {
  const [locale, setLocale] = useState<LoginLocale>("en");
  const t = loginPageCopy[locale];

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface text-ink">
      <div
        className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-accent-soft opacity-70 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-accent-soft opacity-50 blur-3xl"
        aria-hidden
      />

      <header className="relative z-10 border-b border-border/80 bg-surface-elevated/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="font-display text-xl font-semibold tracking-tight text-[#276248] transition hover:opacity-90"
          >
            Viewtrace
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm sm:gap-4">
            <div
              className="flex items-center rounded-full border border-border bg-surface p-0.5 text-xs"
              role="group"
              aria-label={t.langAria}
            >
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={`rounded-full px-3 py-1.5 font-medium transition ${
                  locale === "en"
                    ? "bg-accent text-white"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {t.english}
              </button>
              <button
                type="button"
                onClick={() => setLocale("ja")}
                className={`rounded-full px-3 py-1.5 font-medium transition ${
                  locale === "ja"
                    ? "bg-accent text-white"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {t.japanese}
              </button>
            </div>
            <Link
              href="/contact"
              className="hidden font-medium text-ink-muted transition hover:text-ink sm:inline"
            >
              {t.contact}
            </Link>
            <Link
              href="/"
              className="font-medium text-accent transition hover:text-accent-hover"
            >
              {t.backToSite}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-4.25rem)] max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-16">
        <section className="order-2 lg:order-1">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs font-medium text-ink-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {t.productPill}
          </p>
          <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t.heroTitle}
          </h1>
          <ul className="mt-8 space-y-3 text-sm text-ink-muted">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              {t.bullet1}
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              {t.bullet2}
            </li>
          </ul>
        </section>

        <section className="order-1 lg:order-2">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-surface-elevated p-6 shadow-lg shadow-ink/5 sm:p-8">
            <div className="text-center">
              <p className="font-display text-2xl font-semibold tracking-tight text-[#276248]">Viewtrace</p>
              <p className="mt-1 text-sm text-ink-muted">{t.cardSubtitle}</p>
            </div>

            <>
                <div className="mt-6 rounded-xl border border-border bg-surface p-4 text-left text-sm text-ink-muted">
                  <p className="font-medium text-ink">{t.emailSignInTitle}</p>
                  <p className="mt-2 leading-relaxed">
                    {t.signInHelpPart1}
                    <strong className="font-semibold text-ink">{t.getStarted}</strong>
                    {t.signInHelpPart2}
                    <strong className="font-semibold text-ink">{t.signIn}</strong>
                    {t.signInHelpPart3}
                    <strong className="font-semibold text-ink">{t.signInHelpStrong}</strong>
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
                      className="font-medium text-accent underline underline-offset-2"
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
            </>

            <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 border-t border-border pt-6 text-center text-xs text-ink-muted">
              <Link href="/terms" className="hover:text-ink">
                {t.terms}
              </Link>
              <span aria-hidden className="text-border">
                ·
              </span>
              <Link href="/privacy" className="hover:text-ink">
                {t.privacy}
              </Link>
              <span aria-hidden className="text-border">
                ·
              </span>
              <Link href="/acceptable-use" className="hover:text-ink">
                {t.acceptableUse}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
