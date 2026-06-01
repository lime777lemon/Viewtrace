"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { recordWebVerifiedObservationAction } from "@/app/actions/observations";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import type { RegionOption } from "@/lib/regions";

type FormLabels = {
  observationSubmit: string;
  observationSubmitPending: string;
  observationCancel: string;
};

type Props = {
  regions: RegionOption[];
  labels: FormLabels;
  defaultUrl?: string;
  defaultRegion?: string;
};

export function NewObservationForm({
  regions,
  labels,
  defaultUrl = "",
  defaultRegion,
}: Props) {
  const initialRegion = defaultRegion ?? regions[0]?.value ?? "";
  const [region, setRegion] = useState(initialRegion);

  const regionLabel = useMemo(
    () => regions.find((r) => r.value === region)?.label ?? "",
    [regions, region],
  );

  return (
    <form
      action={recordWebVerifiedObservationAction}
      className="space-y-5 rounded-2xl border border-border bg-surface-elevated p-6"
    >
      <input type="hidden" name="regionLabel" value={regionLabel} />
      <input type="hidden" name="verifiedTitle" value="" />
      <input type="hidden" name="verifiedImageUrl" value="" />
      <div>
        <label htmlFor="url" className="block text-sm font-medium text-ink">
          URL
        </label>
        <input
          id="url"
          name="url"
          type="text"
          required
          defaultValue={defaultUrl}
          placeholder="https://example.com/landing"
          className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none ring-accent/30 focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="region" className="block text-sm font-medium text-ink">
          地域
        </label>
        <select
          id="region"
          name="region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none ring-accent/30 focus:ring-2"
        >
          {regions.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div className="rounded-xl border border-border bg-surface p-4 text-sm text-ink-muted">
        Web で表示を確認したうえで「観測を実行」すると、確認内容に基づく記録が一覧に追加されます（フルキャプチャは本番API接続後）。
      </div>
      <div className="flex flex-wrap gap-3">
        <PendingSubmitButton
          label={labels.observationSubmit}
          pendingLabel={labels.observationSubmitPending}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover hover:shadow-md active:translate-y-px disabled:hover:shadow-sm"
          pendingClassName="hover:bg-accent"
        />
        <Link
          href="/dashboard/observations"
          className="inline-flex cursor-pointer items-center rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-ink-muted/50 hover:bg-surface hover:shadow-sm active:translate-y-px"
        >
          {labels.observationCancel}
        </Link>
      </div>
    </form>
  );
}
