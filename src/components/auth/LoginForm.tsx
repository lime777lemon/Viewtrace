import type { ReactNode } from "react";
import { authFormSubmit, signupFormSubmit } from "@/app/actions/auth";
import { LoginModeTabs } from "@/components/auth/LoginModeTabs";
import { LoginNativeField } from "@/components/auth/LoginNativeField";
import { LoginPasswordFields } from "@/components/auth/LoginPasswordFields";
import { LoginSignupTracker } from "@/components/auth/LoginSignupTracker";
import { LoginSubmitButton } from "@/components/auth/LoginSubmitButton";
import { loginPageCopy } from "@/lib/auth/login-copy";
import type { LoginLocale } from "@/lib/auth/login-copy";

type Mode = "signin" | "signup";

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

      <div
        id="login-signup-panel"
        hidden={initialMode !== "signup"}
        className="space-y-5"
      >
        <LoginNativeField
          id="email"
          name="email"
          form="login-signup-form"
          label={t.email}
          placeholder={t.emailPlaceholder}
          type="email"
          autoComplete="email"
          required
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <LoginNativeField
          id="fullName"
          name="fullName"
          form="login-signup-form"
          label={t.fullName}
          placeholder={t.fullNamePlaceholder}
          autoComplete="name"
          required
          maxLength={200}
        />
        <LoginNativeField
          id="companyName"
          name="companyName"
          form="login-signup-form"
          label={t.company}
          placeholder={t.companyPlaceholder}
          autoComplete="organization"
          maxLength={200}
        />
        <LoginNativeField
          id="phone"
          name="phone"
          form="login-signup-form"
          label={t.phone}
          placeholder={t.phonePlaceholder}
          type="tel"
          autoComplete="tel"
          maxLength={40}
        />
        <LoginPasswordFields mode="signup" t={t} form="login-signup-form" />
        {signupError ? <FormAlert tone="error">{signupError}</FormAlert> : null}
        {signupDone ? <FormAlert tone="success">{t.signupSuccessMessage}</FormAlert> : null}
        {!signupDone ? (
          <p className="text-center text-xs font-medium text-ink-muted">{t.signupReassure}</p>
        ) : null}
        <form id="login-signup-form" action={signupFormSubmit}>
          <input type="hidden" name="_locale" value={locale} />
          {safeNext ? <input type="hidden" name="next" value={safeNext} /> : null}
          <LoginSubmitButton idle={t.getStartedSubmit} pending={t.creatingAccount} />
        </form>
        {!signupDone ? (
          <p className="text-center text-xs leading-relaxed text-ink-muted">{t.signupEmailStepNote}</p>
        ) : null}
      </div>

      <div
        id="login-signin-panel"
        hidden={initialMode !== "signin"}
        className="space-y-5"
      >
        <LoginNativeField
          id="email-signin"
          name="email"
          form="login-signin-form"
          label={t.email}
          placeholder={t.emailPlaceholder}
          type="email"
          autoComplete="email"
          required
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <LoginPasswordFields mode="signin" t={t} form="login-signin-form" />
        {authError ? <FormAlert tone="error">{authError}</FormAlert> : null}
        {authMessage ? <FormAlert tone="success">{authMessage}</FormAlert> : null}
        <form id="login-signin-form" action={authFormSubmit}>
          <input type="hidden" name="_locale" value={locale} />
          {safeNext ? <input type="hidden" name="next" value={safeNext} /> : null}
          <LoginSubmitButton idle={t.signInSubmit} pending={t.signingIn} />
        </form>
      </div>

      {signupDone ? <LoginSignupTracker /> : null}
    </div>
  );
}
