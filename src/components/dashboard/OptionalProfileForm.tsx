"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId } from "react";
import { saveOptionalProfileAction } from "@/app/actions/auth";

type Props = {
  initialCompanyName: string | null;
  initialUseCase: string | null;
};

export function OptionalProfileForm({ initialCompanyName, initialUseCase }: Props) {
  const [state, formAction, pending] = useActionState(saveOptionalProfileAction, null);
  const router = useRouter();
  const companyId = useId();
  const useCaseId = useId();

  useEffect(() => {
    if (state?.message) router.refresh();
  }, [state?.message, router]);

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <p className="text-xs text-[var(--color-ink-muted)]">
        登録時には聞いていません。必要なときだけ入力して保存してください。
      </p>
      <div>
        <label htmlFor={companyId} className="block text-sm font-medium text-[var(--color-ink)]">
          会社名（任意）
        </label>
        <input
          id={companyId}
          name="companyName"
          type="text"
          autoComplete="organization"
          defaultValue={initialCompanyName ?? ""}
          placeholder="例：株式会社〇〇"
          maxLength={200}
          className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm outline-none ring-[var(--color-accent)]/25 focus:border-[var(--color-accent)]/40 focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor={useCaseId} className="block text-sm font-medium text-[var(--color-ink)]">
          用途（任意）
        </label>
        <textarea
          id={useCaseId}
          name="useCase"
          rows={3}
          defaultValue={initialUseCase ?? ""}
          placeholder="例：広告キャンペーンの表示確認、監査用の記録…"
          maxLength={500}
          className="mt-1.5 w-full resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm outline-none ring-[var(--color-accent)]/25 focus:border-[var(--color-accent)]/40 focus:ring-2"
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
        className="rounded-full bg-[var(--color-ink)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "保存中…" : "保存する"}
      </button>
    </form>
  );
}
