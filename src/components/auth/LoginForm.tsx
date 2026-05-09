"use client";

import { useActionState, useId, useState } from "react";
import { authFormAction } from "@/app/actions/auth";
import {
  isSignupPasswordOk,
  isValidEmail,
  mapAuthErrorForLocale,
} from "@/lib/auth/form-helpers";
import type { LoginLocale } from "@/lib/auth/login-copy";
import { loginPageCopy } from "@/lib/auth/login-copy";
import { TRIAL_CONFIG } from "@/lib/plans";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export function LoginForm({
  nextPath,
  initialMode = "signup",
  authCallbackUrl,
  locale,
}: {
  nextPath?: string;
  initialMode?: Mode;
  /** Absolute `/auth/callback` URL for email confirmation & PKCE (origin must match). */
  authCallbackUrl: string;
  locale: LoginLocale;
}) {
  const t = loginPageCopy[locale].form;
  const [signInState, signInAction, signInPending] = useActionState(authFormAction, null);
  const [signupFeedback, setSignupFeedback] = useState<{ error?: string; message?: string } | null>(
    null,
  );
  const [signupPending, setSignupPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<Mode>(initialMode);
  const passwordId = useId();
  const passwordConfirmId = useId();
  const fullNameId = useId();
  const companyNameId = useId();
  const phoneId = useId();
  const safeNext =
    nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "";

  function buildEmailRedirectTo(): string {
    const u = new URL(authCallbackUrl);
    u.searchParams.set("next", "/login?mode=signin&verified=1");
    return u.toString();
  }

  async function submitSignup(fd: FormData) {
    setSignupFeedback(null);
    const email = String(fd.get("email") ?? "").trim();
    const fullName = String(fd.get("fullName") ?? "").trim().slice(0, 200);
    const companyName = String(fd.get("companyName") ?? "").trim().slice(0, 200);
    const phone = String(fd.get("phone") ?? "").trim().slice(0, 40);
    const password = String(fd.get("password") ?? "");
    const passwordConfirm = String(fd.get("passwordConfirm") ?? "");

    if (!email || !isValidEmail(email)) {
      setSignupFeedback({ error: t.errInvalidEmail });
      return;
    }
    if (!fullName) {
      setSignupFeedback({ error: t.errNameRequired });
      return;
    }
    if (!isSignupPasswordOk(password)) {
      setSignupFeedback({
        error: t.errPasswordRules,
      });
      return;
    }
    if (password !== passwordConfirm) {
      setSignupFeedback({ error: t.errPasswordMismatch });
      return;
    }

    setSignupPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const trialStartedAt = new Date().toISOString();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: buildEmailRedirectTo(),
          data: {
            plan: "freeplan" as const,
            trial_active: true,
            trial_started_at: trialStartedAt,
            trial_free_observations: TRIAL_CONFIG.freeObservations,
            trial_days: TRIAL_CONFIG.trialDays,
            full_name: fullName,
            company_name: companyName.length > 0 ? companyName : null,
            phone: phone.length > 0 ? phone : null,
          },
        },
      });

      if (error) {
        console.warn("[auth] signUp failed", error.message, error);
        setSignupFeedback({ error: mapAuthErrorForLocale(error.message, locale) });
        return;
      }

      if (!data.user) {
        setSignupFeedback({
          error: t.errSignupIncomplete,
        });
        return;
      }

      if (data.session) {
        window.location.assign(safeNext || "/dashboard");
        return;
      }

      const emailDomain = email.includes("@") ? email.split("@")[1] : "";
      console.info("[auth] signup confirmation email requested (browser)", {
        userId: data.user.id,
        emailDomain,
        redirectUrl: authCallbackUrl,
      });

      setSignupFeedback({
        message: t.signupSuccessMessage,
      });
    } finally {
      setSignupPending(false);
    }
  }

  return (
    <form
      action={mode === "signin" ? signInAction : undefined}
      onSubmit={(e) => {
        if (mode === "signup") {
          e.preventDefault();
          void submitSignup(new FormData(e.currentTarget));
        }
      }}
      className="mt-8 space-y-5"
    >
      <input type="hidden" name="_locale" value={locale} />
      {safeNext ? <input type="hidden" name="next" value={safeNext} /> : null}

      <div className="flex rounded-xl border border-[var(--color-border)] p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setSignupFeedback(null);
          }}
          className={`flex-1 rounded-lg py-2 transition ${
            mode === "signup"
              ? "bg-[var(--color-accent)] text-white shadow-sm"
              : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          }`}
        >
          {t.getStartedTab}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setSignupFeedback(null);
          }}
          className={`flex-1 rounded-lg py-2 transition ${
            mode === "signin"
              ? "bg-[var(--color-accent)] text-white shadow-sm"
              : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          }`}
        >
          {t.signInTab}
        </button>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-[var(--color-ink)]">
          {t.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={t.emailPlaceholder}
          className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm outline-none ring-[var(--color-accent)]/25 transition placeholder:text-[var(--color-ink-muted)]/60 focus:border-[var(--color-accent)]/40 focus:ring-2"
        />
      </div>
      {mode === "signup" ? (
        <>
          <div>
            <label htmlFor={fullNameId} className="block text-sm font-medium text-[var(--color-ink)]">
              {t.fullName}
            </label>
            <input
              id={fullNameId}
              name="fullName"
              type="text"
              autoComplete="name"
              required
              maxLength={200}
              placeholder={t.fullNamePlaceholder}
              className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm outline-none ring-[var(--color-accent)]/25 transition placeholder:text-[var(--color-ink-muted)]/60 focus:border-[var(--color-accent)]/40 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor={companyNameId} className="block text-sm font-medium text-[var(--color-ink)]">
              {t.company}
            </label>
            <input
              id={companyNameId}
              name="companyName"
              type="text"
              autoComplete="organization"
              maxLength={200}
              placeholder={t.companyPlaceholder}
              className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm outline-none ring-[var(--color-accent)]/25 transition placeholder:text-[var(--color-ink-muted)]/60 focus:border-[var(--color-accent)]/40 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor={phoneId} className="block text-sm font-medium text-[var(--color-ink)]">
              {t.phone}
            </label>
            <input
              id={phoneId}
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={40}
              placeholder={t.phonePlaceholder}
              className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm outline-none ring-[var(--color-accent)]/25 transition placeholder:text-[var(--color-ink-muted)]/60 focus:border-[var(--color-accent)]/40 focus:ring-2"
            />
          </div>
        </>
      ) : null}
      <div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={passwordId} className="block text-sm font-medium text-[var(--color-ink)]">
            {t.password}
          </label>
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="text-xs font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
          >
            {showPassword ? t.hidePassword : t.showPassword}
          </button>
        </div>
        <input
          id={passwordId}
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={mode === "signup" ? 8 : undefined}
          placeholder={mode === "signup" ? t.passwordPlaceholderSignup : t.passwordPlaceholderSignin}
          className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm outline-none ring-[var(--color-accent)]/25 transition placeholder:text-[var(--color-ink-muted)]/60 focus:border-[var(--color-accent)]/40 focus:ring-2"
        />
        {mode === "signup" ? (
          <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{t.passwordHint}</p>
        ) : null}
      </div>
      {mode === "signup" ? (
        <div>
          <label
            htmlFor={passwordConfirmId}
            className="block text-sm font-medium text-[var(--color-ink)]"
          >
            {t.confirmPassword}
          </label>
          <input
            id={passwordConfirmId}
            name="passwordConfirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            placeholder={t.confirmPasswordPlaceholder}
            className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm outline-none ring-[var(--color-accent)]/25 transition placeholder:text-[var(--color-ink-muted)]/60 focus:border-[var(--color-accent)]/40 focus:ring-2"
          />
          <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{t.confirmPasswordHint}</p>
        </div>
      ) : null}
      {mode === "signin" && signInState?.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200/80 bg-red-50 px-3 py-2.5 text-sm text-red-900"
        >
          {signInState.error}
        </p>
      ) : null}
      {mode === "signin" && signInState?.message ? (
        <p
          role="status"
          className="whitespace-pre-line rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2.5 text-sm leading-relaxed text-emerald-900"
        >
          {signInState.message}
        </p>
      ) : null}
      {mode === "signup" && signupFeedback?.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200/80 bg-red-50 px-3 py-2.5 text-sm text-red-900"
        >
          {signupFeedback.error}
        </p>
      ) : null}
      {mode === "signup" && signupFeedback?.message ? (
        <p
          role="status"
          className="whitespace-pre-line rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2.5 text-sm leading-relaxed text-emerald-900"
        >
          {signupFeedback.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={mode === "signin" ? signInPending : signupPending}
        className="w-full rounded-full bg-[var(--color-accent)] py-3.5 text-sm font-semibold text-white shadow-md shadow-[var(--color-accent)]/20 transition hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
      >
        {mode === "signin"
          ? signInPending
            ? t.signingIn
            : t.signInSubmit
          : signupPending
            ? t.creatingAccount
            : t.getStartedSubmit}
      </button>
    </form>
  );
}
