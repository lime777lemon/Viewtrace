import { LOGIN_FIELD_CLASS } from "@/components/auth/login-field-class";
import { LoginPasswordVisibilityToggle } from "@/components/auth/LoginPasswordVisibilityToggle";
import type { LoginFormStrings } from "@/lib/auth/login-copy";

export function LoginPasswordFields({
  mode,
  t,
  form,
}: {
  mode: "signin" | "signup";
  t: LoginFormStrings;
  form: string;
}) {
  const passwordId = mode === "signup" ? "signup-password" : "signin-password";
  const confirmId = "signup-password-confirm";
  const toggleIds = mode === "signup" ? [passwordId, confirmId] : [passwordId];

  return (
    <>
      <div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={passwordId} className="block text-sm font-medium text-ink">
            {t.password}
          </label>
          <LoginPasswordVisibilityToggle
            inputIds={toggleIds}
            showLabel={t.showPassword}
            hideLabel={t.hidePassword}
          />
        </div>
        <input
          id={passwordId}
          name="password"
          form={form}
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={mode === "signup" ? 8 : undefined}
          placeholder={mode === "signup" ? t.passwordPlaceholderSignup : t.passwordPlaceholderSignin}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          defaultValue=""
          className={LOGIN_FIELD_CLASS}
        />
      </div>
      {mode === "signup" ? (
        <div>
          <label htmlFor={confirmId} className="block text-sm font-medium text-ink">
            {t.confirmPassword}
          </label>
          <input
            id={confirmId}
            name="passwordConfirm"
            form={form}
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder={t.confirmPasswordPlaceholder}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            defaultValue=""
            className={LOGIN_FIELD_CLASS}
          />
        </div>
      ) : null}
    </>
  );
}
