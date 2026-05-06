"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";

type Props = {
  locale: Locale;
  hasCustomer: boolean;
  hasSubscription: boolean;
};

export function BillingActions({ locale, hasCustomer, hasSubscription }: Props) {
  const t = copy[locale].dashboardBilling;
  const [loading, setLoading] = useState<"portal" | "cancel" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSubscription) return;
    // Best-effort backfill for purchase history
    void fetch("/api/stripe/sync-subscription", { method: "POST" });
  }, [hasSubscription]);

  async function openPortal() {
    setMessage(null);
    setLoading("portal");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const json = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !json.ok || !json.url) {
        setMessage(json.error ?? "failed");
        return;
      }
      window.location.href = json.url;
    } finally {
      setLoading(null);
    }
  }

  async function cancelAtPeriodEnd() {
    setMessage(null);
    const ok = window.confirm(t.cancelConfirm);
    if (!ok) return;

    setLoading("cancel");
    try {
      const res = await fetch("/api/stripe/cancel", { method: "POST" });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setMessage(json.error ?? "failed");
        return;
      }
      setMessage(t.cancelScheduled);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="text-sm font-medium text-[var(--color-ink)]">{t.title}</p>
      <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{t.subtitle}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={openPortal}
          disabled={!hasCustomer || loading !== null}
          className="inline-flex rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent)]/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "portal" ? t.openPortalLoading : t.openPortal}
        </button>

        <button
          type="button"
          onClick={cancelAtPeriodEnd}
          disabled={!hasSubscription || loading !== null}
          className="inline-flex rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "cancel" ? t.cancelLoading : t.cancel}
        </button>
      </div>

      {!hasCustomer ? (
        <p className="mt-2 text-xs text-[var(--color-ink-muted)]">{t.missingCustomer}</p>
      ) : null}
      {!hasSubscription ? (
        <p className="mt-2 text-xs text-[var(--color-ink-muted)]">{t.missingSubscription}</p>
      ) : null}
      {message ? <p className="mt-2 text-xs text-[var(--color-ink-muted)]">{message}</p> : null}
    </div>
  );
}

