import { LOGIN_FIELD_CLASS } from "@/components/auth/login-field-class";

type LoginNativeFieldProps = {
  id: string;
  name: string;
  form: string;
  label: string;
  placeholder: string;
  type?: "text" | "email" | "tel";
  autoComplete?: string;
  required?: boolean;
  maxLength?: number;
  autoCapitalize?: "none";
  autoCorrect?: "off";
  spellCheck?: boolean;
};

/** Native field. Keep this a Server Component so typing is not hydrated. */
export function LoginNativeField({
  id,
  name,
  form,
  label,
  placeholder,
  type = "text",
  autoComplete,
  required = false,
  maxLength,
  autoCapitalize,
  autoCorrect,
  spellCheck,
}: LoginNativeFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        name={name}
        form={form}
        type={type}
        autoComplete={autoComplete}
        required={required}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        spellCheck={spellCheck}
        defaultValue=""
        placeholder={placeholder}
        className={LOGIN_FIELD_CLASS}
      />
    </div>
  );
}
