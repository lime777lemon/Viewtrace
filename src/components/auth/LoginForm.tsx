"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { authFormAction, signupFormAction } from "@/app/actions/auth";
import { loginPageCopy } from "@/lib/auth/login-copy";
import type { LoginLocale } from "@/lib/auth/login-copy";

type Mode = "signin" | "signup";

export function LoginForm({
  nextPath,
  initialMode = "signup",
  locale,
}: {
  nextPath?: string;
  initialMode?: Mode;
  locale: LoginLocale;
}) {
  const t = loginPageCopy[locale].form;
  const [signInState, signInAction, signInPending] = useActionState(authFormAction, null);
  const [signupState, signupAction, signupPending] = useActionState(signupFormAction, null);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<Mode>(initialMode);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);
  const passwordId = useId();
  const passwordConfirmId = useId();
  const fullNameId = useId();
  const companyNameId = useId();
  const phoneId = useId();
  const safeNext =
    nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "";

  return (
    <form
      action={mode === "signin" ? signInAction : signupAction}
      className="mt-8 space-y-5"
    >
      <input type="hidden" name="_locale" value={locale} />
      {safeNext ? <input type="hidden" name="next" value={safeNext} /> : null}

      <div className="flex rounded-xl border border-border p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-lg py-2 transition ${
            mode === "signup"
              ? "bg-accent text-white shadow-sm"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          {t.getStartedTab}
        </button>
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`flex-1 rounded-lg py-2 transition ${
            mode === "signin"
              ? "bg-accent text-white shadow-sm"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          {t.signInTab}
        </button>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-ink">
          {t.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={t.emailPlaceholder}
          className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none ring-accent/25 transition placeholder:text-ink-muted/60 focus:border-accent/40 focus:ring-2"
        />
      </div>
      {mode === "signup" ? (
        <>
          <div>
            <label htmlFor={fullNameId} className="block text-sm font-medium text-ink">
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
              className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none ring-accent/25 transition placeholder:text-ink-muted/60 focus:border-accent/40 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor={companyNameId} className="block text-sm font-medium text-ink">
              {t.company}
            </label>
            <input
              id={companyNameId}
              name="companyName"
              type="text"
              autoComplete="organization"
              maxLength={200}
              placeholder={t.companyPlaceholder}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none ring-accent/25 transition placeholder:text-ink-muted/60 focus:border-accent/40 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor={phoneId} className="block text-sm font-medium text-ink">
              {t.phone}
            </label>
            <input
              id={phoneId}
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={40}
              placeholder={t.phonePlaceholder}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none ring-accent/25 transition placeholder:text-ink-muted/60 focus:border-accent/40 focus:ring-2"
            />
          </div>
        </>
      ) : null}
      <div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={passwordId} className="block text-sm font-medium text-ink">
            {t.password}
          </label>
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="text-xs font-medium text-accent hover:text-accent-hover"
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
          className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none ring-accent/25 transition placeholder:text-ink-muted/60 focus:border-accent/40 focus:ring-2"
        />
      </div>
      {mode === "signup" ? (
        <div>
          <label
            htmlFor={passwordConfirmId}
            className="block text-sm font-medium text-ink"
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
            className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none ring-accent/25 transition placeholder:text-ink-muted/60 focus:border-accent/40 focus:ring-2"
          />
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
      {mode === "signup" && signupState?.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200/80 bg-red-50 px-3 py-2.5 text-sm text-red-900"
        >
          {signupState.error}
        </p>
      ) : null}
      {mode === "signup" && signupState?.message ? (
        <p
          role="status"
          className="whitespace-pre-line rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2.5 text-sm leading-relaxed text-emerald-900"
        >
          {signupState.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={mode === "signin" ? signInPending : signupPending}
        className="w-full rounded-full bg-accent py-3.5 text-sm font-semibold text-white shadow-md shadow-accent/20 transition hover:bg-accent-hover disabled:opacity-60"
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
