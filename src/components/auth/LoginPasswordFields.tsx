"use client";

import { useId, useState } from "react";
import { LOGIN_FIELD_CLASS } from "@/components/auth/login-field-class";
import type { LoginFormStrings } from "@/lib/auth/login-copy";

export function LoginPasswordFields({
  mode,
  t,
}: {
  mode: "signin" | "signup";
  t: LoginFormStrings;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const passwordId = useId();
  const passwordConfirmId = useId();

  return (
    <>
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
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={LOGIN_FIELD_CLASS}
        />
      </div>
      {mode === "signup" ? (
        <div>
          <label htmlFor={passwordConfirmId} className="block text-sm font-medium text-ink">
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
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className={LOGIN_FIELD_CLASS}
          />
        </div>
      ) : null}
    </>
  );
}
