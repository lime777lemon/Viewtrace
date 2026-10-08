import type { ReactNode } from "react";
import { authFormSubmit, signupFormSubmit } from "@/app/actions/auth";
import { LOGIN_FIELD_CLASS } from "@/components/auth/login-field-class";
import { LoginModeTabs } from "@/components/auth/LoginModeTabs";
import { LoginPasswordFields } from "@/components/auth/LoginPasswordFields";
import { LoginSignupTracker } from "@/components/auth/LoginSignupTracker";
import { LoginSubmitButton } from "@/components/auth/LoginSubmitButton";
import { loginPageCopy } from "@/lib/auth/login-copy";
import type { LoginFormStrings, LoginLocale } from "@/lib/auth/login-copy";

type Mode = "signin" | "signup";

function LoginEmailField({
  id,
  t,
}: {
  id: string;
  t: LoginFormStrings;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {t.email}
      </label>
      <input
        id={id}
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder={t.emailPlaceholder}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={LOGIN_FIELD_CLASS}
      />
    </div>
  );
}

function FormAlert({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: ReactNode;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "rounded-xl border border-red-200/80 bg-red-50 px-3 py-2.5 text-sm text-red-900"
          : "whitespace-pre-line rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2.5 text-sm leading-relaxed text-emerald-900"
      }
    >
      {children}
    </p>
  );
}

export function LoginForm({
  nextPath,
  initialMode = "signup",
  locale,
  signupError,
  signupDone,
  authError,
  authMessage,
}: {
  nextPath?: string;
  initialMode?: Mode;
  locale: LoginLocale;
  signupError?: string;
  signupDone?: boolean;
  authError?: string;
  authMessage?: string;
}) {
  const t = loginPageCopy[locale].form;
  const safeNext =
    nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "";

  return (
    <div className="mt-8 space-y-5">
      <LoginModeTabs
        initialMode={initialMode}
        signupLabel={t.getStartedTab}
        signinLabel={t.signInTab}
      />

      <form
        id="login-signup-form"
        hidden={initialMode !== "signup"}
        action={signupFormSubmit}
        className="space-y-5"
      >
        <input type="hidden" name="_locale" value={locale} />
        {safeNext ? <input type="hidden" name="next" value={safeNext} /> : null}
        <LoginEmailField id="email" t={t} />
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-ink">
            {t.fullName}
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            required
            maxLength={200}
            placeholder={t.fullNamePlaceholder}
            className={LOGIN_FIELD_CLASS}
          />
        </div>
        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-ink">
            {t.company}
          </label>
          <input
            id="companyName"
            name="companyName"
            type="text"
            autoComplete="organization"
            maxLength={200}
            placeholder={t.companyPlaceholder}
            className={LOGIN_FIELD_CLASS}
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-ink">
            {t.phone}
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={40}
            placeholder={t.phonePlaceholder}
            className={LOGIN_FIELD_CLASS}
          />
        </div>
        <LoginPasswordFields mode="signup" t={t} />
        {signupError ? <FormAlert tone="error">{signupError}</FormAlert> : null}
        {signupDone ? <FormAlert tone="success">{t.signupSuccessMessage}</FormAlert> : null}
        {!signupDone ? (
          <p className="text-center text-xs font-medium text-ink-muted">{t.signupReassure}</p>
        ) : null}
        <LoginSubmitButton idle={t.getStartedSubmit} pending={t.creatingAccount} />
        {!signupDone ? (
          <p className="text-center text-xs leading-relaxed text-ink-muted">{t.signupEmailStepNote}</p>
        ) : null}
      </form>

      <form
        id="login-signin-form"
        hidden={initialMode !== "signin"}
        action={authFormSubmit}
        className="space-y-5"
      >
        <input type="hidden" name="_locale" value={locale} />
        {safeNext ? <input type="hidden" name="next" value={safeNext} /> : null}
        <LoginEmailField id="email-signin" t={t} />
        <LoginPasswordFields mode="signin" t={t} />
        {authError ? <FormAlert tone="error">{authError}</FormAlert> : null}
        {authMessage ? <FormAlert tone="success">{authMessage}</FormAlert> : null}
        <LoginSubmitButton idle={t.signInSubmit} pending={t.signingIn} />
      </form>

      {signupDone ? <LoginSignupTracker /> : null}
    </div>
  );
}
