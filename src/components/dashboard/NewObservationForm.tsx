"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import {
  recordObservationForRegionAction,
  recordWebVerifiedObservationAction,
} from "@/app/actions/observations";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import type { Locale } from "@/lib/i18n";
import { observationCompareHref } from "@/lib/observation-compare";
import {
  clampRegionSelection,
  MULTI_REGION_RUN_MAX,
  suggestedRegionsForPlan,
} from "@/lib/observation-multi-region";
import { getRegionLabelForLocale, type RegionOption } from "@/lib/regions";

type FormLabels = {
  observationSubmit: string;
  observationSubmitPending: string;
  observationCancel: string;
  regionLabel: string;
  regionsHint: string;
  regionsCost: string;
  regionsMax: string;
  regionsQuota: string;
  regionsProgress: string;
  observeN: string;
  remainingHint: string;
  suggestedLabel: string;
  runError: string;
};

type Props = {
  regions: RegionOption[];
  labels: FormLabels;
  locale: Locale;
  remainingSlots: number;
  defaultUrl?: string;
  defaultRegion?: string;
};

export function NewObservationForm({
  regions,
  labels,
  locale,
  remainingSlots,
  defaultUrl = "",
  defaultRegion,
}: Props) {
  const router = useRouter();
  const allowed = useMemo(() => new Set(regions.map((r) => r.value)), [regions]);
  const suggested = useMemo(() => suggestedRegionsForPlan(allowed), [allowed]);
  const initialRegion = defaultRegion ?? regions[0]?.value ?? "";
  const [selected, setSelected] = useState<string[]>(
    initialRegion ? clampRegionSelection([initialRegion], allowed) : [],
  );
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const regionLabel = useMemo(() => {
    const first = selected[0];
    if (!first) return "";
    const option = regions.find((r) => r.value === first);
    return option ? getRegionLabelForLocale(option, locale) : first;
  }, [locale, regions, selected]);

  const overQuota = selected.length > remainingSlots;
  const canSubmit = selected.length >= 1 && !overQuota && !busy;

  function toggleRegion(value: string) {
    setSelected((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value);
      return clampRegionSelection([...prev, value], allowed);
    });
  }

  async function runMultiRegion(form: HTMLFormElement) {
    const url = String(new FormData(form).get("url") ?? "").trim();
    const ids: string[] = [];
    for (let i = 0; i < selected.length; i += 1) {
      const value = selected[i]!;
      const option = regions.find((r) => r.value === value);
      const label = option ? getRegionLabelForLocale(option, locale) : value;
      setProgress(
        labels.regionsProgress
          .replace("{current}", String(i + 1))
          .replace("{total}", String(selected.length))
          .replace("{region}", label),
      );
      const fd = new FormData();
      fd.set("url", url);
      fd.set("region", value);
      fd.set("regionLabel", option?.label ?? label);
      fd.set("verifiedTitle", "");
      fd.set("verifiedImageUrl", "");
      const result = await recordObservationForRegionAction(fd);
      if (!result.ok) {
        if (result.code === "unauthenticated") {
          router.push("/login?next=/dashboard/observations/new");
          return;
        }
        if (result.code === "trial_expired") {
          router.push("/checkout?plan=starter&reason=trial_expired");
          return;
        }
        if (result.code === "trial_limit") {
          router.push("/checkout?plan=starter&reason=trial_observation_limit");
          return;
        }
        if (result.code === "monthly_limit") {
          router.push("/dashboard/observations/new?error=limit");
          return;
        }
        setError(labels.runError);
        if (ids.length === 1) {
          router.push(`/dashboard/observations/${ids[0]}`);
          return;
        }
        if (ids.length >= 2) {
          router.push(observationCompareHref(ids[0]!, ids[1]!));
          return;
        }
        return;
      }
      ids.push(result.id);
    }
    if (ids.length >= 2) {
      router.push(observationCompareHref(ids[0]!, ids[1]!));
      return;
    }
    if (ids.length === 1) {
      router.push(`/dashboard/observations/${ids[0]}`);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (selected.length <= 1) return;
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await runMultiRegion(event.currentTarget);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const submitLabel =
    selected.length > 1 ? labels.observeN.replace("{n}", String(selected.length)) : labels.observationSubmit;

  return (
    <form
      action={recordWebVerifiedObservationAction}
      onSubmit={(event) => void onSubmit(event)}
      className="space-y-5 rounded-2xl border border-border bg-surface-elevated p-6"
    >
      <input type="hidden" name="region" value={selected[0] ?? ""} />
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
      <fieldset disabled={busy}>
        <legend className="text-sm font-medium text-ink">{labels.regionLabel}</legend>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">{labels.regionsHint}</p>
        {suggested.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="w-full text-xs font-semibold uppercase tracking-wider text-ink-muted">
              {labels.suggestedLabel}
            </span>
            {suggested.map((value) => {
              const option = regions.find((r) => r.value === value);
              if (!option) return null;
              const on = selected.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleRegion(value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    on
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-surface text-ink hover:border-accent/40"
                  }`}
                >
                  {getRegionLabelForLocale(option, locale)}
                </button>
              );
            })}
          </div>
        ) : null}
        <div className="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border bg-surface p-3">
          {regions.map((r) => {
            const on = selected.includes(r.value);
            return (
              <label key={r.value} className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleRegion(r.value)}
                  className="rounded border-border text-accent focus:ring-accent"
                />
                <span className="text-ink">{getRegionLabelForLocale(r, locale)}</span>
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          {labels.regionsCost.replaceAll("{n}", String(Math.max(selected.length, 1)))}
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          {labels.remainingHint.replace("{n}", String(remainingSlots))}
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          {labels.regionsMax.replace("{max}", String(MULTI_REGION_RUN_MAX))}
        </p>
        {overQuota ? (
          <p className="mt-1 text-xs font-medium text-red-700" role="alert">
            {labels.regionsQuota.replace("{n}", String(remainingSlots))}
          </p>
        ) : null}
      </fieldset>
      {progress ? <p className="text-sm text-ink-muted">{progress}</p> : null}
      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <PendingSubmitButton
          label={submitLabel}
          pendingLabel={progress ?? labels.observationSubmitPending}
          waiting={busy}
          disabled={selected.length < 1 || overQuota}
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
