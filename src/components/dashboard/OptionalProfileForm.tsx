"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId } from "react";
import { saveOptionalProfileAction } from "@/app/actions/auth";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";

type Props = {
  locale: Locale;
  initialFullName: string | null;
  initialPhone: string | null;
  initialCompanyName: string | null;
  initialUseCase: string | null;
};

export function OptionalProfileForm({
  locale,
  initialFullName,
  initialPhone,
  initialCompanyName,
  initialUseCase,
}: Props) {
  const [state, formAction, pending] = useActionState(saveOptionalProfileAction, null);
  const router = useRouter();
  const fullNameId = useId();
  const phoneId = useId();
  const companyId = useId();
  const useCaseId = useId();
  const t = copy[locale].dashboardSettings;

  useEffect(() => {
    if (state?.message) router.refresh();
  }, [state?.message, router]);

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <p className="text-xs text-ink-muted">
        {t.profileHint}
      </p>
      <div>
        <label htmlFor={fullNameId} className="block text-sm font-medium text-ink">
          {t.fullNameLabel}
        </label>
        <input
          id={fullNameId}
          name="fullName"
          type="text"
          autoComplete="name"
          defaultValue={initialFullName ?? ""}
          placeholder={t.fullNamePlaceholder}
          maxLength={200}
          className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none ring-accent/25 focus:border-accent/40 focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor={companyId} className="block text-sm font-medium text-ink">
          {t.companyLabel}
        </label>
        <input
          id={companyId}
          name="companyName"
          type="text"
          autoComplete="organization"
          defaultValue={initialCompanyName ?? ""}
          placeholder={t.companyPlaceholder}
          maxLength={200}
          className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none ring-accent/25 focus:border-accent/40 focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor={phoneId} className="block text-sm font-medium text-ink">
          {t.phoneLabel}
        </label>
        <input
          id={phoneId}
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={initialPhone ?? ""}
          placeholder={t.phonePlaceholder}
          maxLength={40}
          className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none ring-accent/25 focus:border-accent/40 focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor={useCaseId} className="block text-sm font-medium text-ink">
          {t.useCaseLabel}
        </label>
        <textarea
          id={useCaseId}
          name="useCase"
          rows={3}
          defaultValue={initialUseCase ?? ""}
          placeholder={t.useCasePlaceholder}
          maxLength={500}
          className="mt-1.5 w-full resize-y rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none ring-accent/25 focus:border-accent/40 focus:ring-2"
        />
      </div>
      {state?.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state?.message ? (
        <p role="status" className="text-sm text-emerald-800">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? t.saving : t.save}
      </button>
    </form>
  );
}
