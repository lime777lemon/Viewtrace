"use client";

import { useFormStatus } from "react-dom";

export function LoginSubmitButton({ idle, pending }: { idle: string; pending: string }) {
  const { pending: isPending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={isPending}
      className="w-full rounded-full bg-accent py-3.5 text-sm font-semibold text-white shadow-md shadow-accent/20 transition hover:bg-accent-hover disabled:opacity-60"
    >
      {isPending ? pending : idle}
    </button>
  );
}
