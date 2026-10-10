"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  createShareCollectionAction,
  revokeShareCollectionAction,
} from "@/app/actions/share-collection";
import { isObservationUuid } from "@/lib/observation-route-id";
import { formatJaDateTime } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import {
  SHARE_COLLECTION_MAX_ITEMS,
  SHARE_COLLECTION_MIN_ITEMS,
  type OwnerShareCollectionSummary,
} from "@/lib/observation-share-collection-shared";

export function ShareCollectionPanel({
  selectedIds,
  locale,
  existing,
}: {
  selectedIds: string[];
  locale: Locale;
  existing: OwnerShareCollectionSummary[];
}) {
  const t = copy[locale].observationsListPage;
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const selectableCount = useMemo(
    () => selectedIds.filter((id) => isObservationUuid(id)).length,
    [selectedIds],
  );

  async function create() {
    setMessage(null);
    setCreatedUrl(null);
    if (selectableCount < SHARE_COLLECTION_MIN_ITEMS) {
      setMessage(t.shareCollectionNeedTwo);
      return;
    }
    if (selectableCount > SHARE_COLLECTION_MAX_ITEMS) {
      setMessage(t.shareCollectionMax.replace("{max}", String(SHARE_COLLECTION_MAX_ITEMS)));
      return;
    }
    setPending(true);
    const result = await createShareCollectionAction(selectedIds);
    setPending(false);
    if (!result.ok) {
      setMessage(errorMessage(locale, result.error));
      return;
    }
    const url = `${window.location.origin}/share/${result.token}`;
    setCreatedUrl(url);
    setMessage(t.shareCollectionCreated);
    router.refresh();
  }

  async function copyUrl(url: string) {
    setCopyFeedback(null);
    try {
      await navigator.clipboard.writeText(url);
      setCopyFeedback(t.shareCollectionCopied);
    } catch {
      setCopyFeedback(t.shareCollectionCopyFailed);
    }
    window.setTimeout(() => setCopyFeedback(null), 2400);
  }

  async function revoke(id: string) {
    setRevokingId(id);
    setMessage(null);
    const result = await revokeShareCollectionAction(id);
    setRevokingId(null);
    if (!result.ok) {
      setMessage(t.shareCollectionRevokeFailed);
      return;
    }
    router.refresh();
  }

  return (
    <div
      data-tour="share"
      className="space-y-4 rounded-xl border border-border bg-surface-elevated p-4 sm:p-5"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {t.shareCollectionTitle}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t.shareCollectionHint}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink">
          {t.shareCollectionSelected.replace("{n}", String(selectableCount))}
        </p>
        <button
          type="button"
          onClick={() => void create()}
          disabled={pending}
          className="inline-flex h-10 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? t.shareCollectionCreating : t.shareCollectionCreate}
        </button>
      </div>

      {message ? <p className="text-sm text-ink">{message}</p> : null}

      {createdUrl ? (
        <div className="rounded-lg border border-border bg-surface px-3 py-3">
          <p className="break-all font-mono text-xs text-ink">{createdUrl}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyUrl(createdUrl)}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent/40"
            >
              {copyFeedback ?? t.shareCollectionCopy}
            </button>
            <Link
              href={createdUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-accent hover:border-accent/40"
            >
              {t.shareCollectionOpen}
            </Link>
          </div>
        </div>
      ) : null}

      {existing.length > 0 ? (
        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {t.shareCollectionListTitle}
          </p>
          <ul className="mt-2 space-y-2">
            {existing.map((row) => {
              const href = `/share/${row.token}`;
              return (
                <li
                  key={row.id}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-surface px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-ink">{formatJaDateTime(row.createdAt, locale)}</p>
                    <p className="text-xs text-ink-muted">
                      {t.shareCollectionCount.replace("{n}", String(row.itemCount))}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void copyUrl(`${window.location.origin}${href}`)}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent/40"
                    >
                      {copyFeedback ?? t.shareCollectionCopy}
                    </button>
                    <Link
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-accent hover:border-accent/40"
                    >
                      {t.shareCollectionOpen}
                    </Link>
                    <button
                      type="button"
                      onClick={() => void revoke(row.id)}
                      disabled={revokingId === row.id}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink disabled:opacity-50"
                    >
                      {revokingId === row.id ? t.shareCollectionRevoking : t.shareCollectionRevoke}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function errorMessage(locale: Locale, error: string): string {
  const t = copy[locale].observationsListPage;
  if (error === "need_two") return t.shareCollectionNeedTwo;
  if (error === "too_many") return t.shareCollectionMax.replace("{max}", String(SHARE_COLLECTION_MAX_ITEMS));
  if (error === "limit") return t.shareCollectionLimit;
  if (error === "not_found") return t.shareCollectionNotFound;
  if (error === "auth") return t.shareCollectionAuth;
  return t.shareCollectionFailed;
}
