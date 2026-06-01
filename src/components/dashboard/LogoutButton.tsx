"use client";

import { logoutAction } from "@/app/actions/auth";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";

export function LogoutButton({
  label = "ログアウト",
  pendingLabel = "処理中…",
}: {
  label?: string;
  pendingLabel?: string;
}) {
  return (
    <form action={logoutAction}>
      <PendingSubmitButton
        label={label}
        pendingLabel={pendingLabel}
        className="rounded-full border border-border bg-surface-elevated px-4 py-2 text-sm font-medium text-ink shadow-sm hover:border-ink-muted/50 hover:bg-surface hover:shadow-md active:translate-y-px disabled:hover:shadow-sm"
        pendingClassName="hover:bg-surface-elevated"
      />
    </form>
  );
}
