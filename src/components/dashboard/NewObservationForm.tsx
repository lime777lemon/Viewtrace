"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { recordWebVerifiedObservationAction } from "@/app/actions/observations";
import type { RegionOption } from "@/lib/regions";

type Props = {
  regions: RegionOption[];
  defaultUrl?: string;
  defaultRegion?: string;
};

export function NewObservationForm({ regions, defaultUrl = "", defaultRegion }: Props) {
  const initialRegion = defaultRegion ?? regions[0]?.value ?? "";
  const [region, setRegion] = useState(initialRegion);

  const regionLabel = useMemo(
    () => regions.find((r) => r.value === region)?.label ?? "",
    [regions, region],
  );

  return (
    <form action={recordWebVerifiedObservationAction} className="space-y-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
      <input type="hidden" name="regionLabel" value={regionLabel} />
      <input type="hidden" name="verifiedTitle" value="" />
      <input type="hidden" name="verifiedImageUrl" value="" />
      <div>
        <label htmlFor="url" className="block text-sm font-medium text-[var(--color-ink)]">
          URL
        </label>
        <input
          id="url"
          name="url"
          type="text"
          required
          defaultValue={defaultUrl}
          placeholder="https://example.com/landing"
          className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm outline-none ring-[var(--color-accent)]/30 focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="region" className="block text-sm font-medium text-[var(--color-ink)]">
          地域
        </label>
        <select
          id="region"
          name="region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm outline-none ring-[var(--color-accent)]/30 focus:ring-2"
        >
          {regions.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-ink-muted)]">
        Web で表示を確認したうえで「観測を実行」すると、確認内容に基づく記録が一覧に追加されます（フルキャプチャは本番API接続後）。
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
        >
          観測を実行
        </button>
        <Link
          href="/dashboard/observations"
          className="inline-flex items-center rounded-full border border-[var(--color-border)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-ink-muted)]/40"
        >
          キャンセル
        </Link>
      </div>
    </form>
  );
}
