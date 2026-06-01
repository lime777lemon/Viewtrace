"use client";

import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = {
  label: string;
  pendingLabel: string;
  className?: string;
  /** Extra classes applied only while pending (e.g. disabled:hover overrides). */
  pendingClassName?: string;
  /** Override the parent form action for this submit button. */
  formAction?: (formData: FormData) => void | Promise<void>;
};

export function PendingSubmitButton({
  label,
  pendingLabel,
  className = "",
  pendingClassName = "",
  formAction,
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      formAction={formAction}
      disabled={pending}
      aria-disabled={pending}
      aria-busy={pending}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 transition disabled:cursor-not-allowed disabled:opacity-80 ${className} ${
        pending ? pendingClassName : ""
      }`}
    >
      {pending ? (
        <>
          <span
            aria-hidden
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current/35 border-t-current"
          />
          <span>{pendingLabel}</span>
        </>
      ) : (
        label
      )}
    </button>
  );
}
