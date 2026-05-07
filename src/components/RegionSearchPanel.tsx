"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useId, useMemo, useState } from "react";
import { recordWebVerifiedObservationAction } from "@/app/actions/observations";
import type { Locale } from "@/lib/i18n";
import type { PlanId } from "@/lib/plans";
import { getRegionLabelForLocale, getRegionOptions } from "@/lib/regions";
import { normalizeUserUrlInput } from "@/lib/url-preview";

export type RegionSearchLabels = {
  title: string;
  subtitle: string;
  planLabel: string;
  planStarter: string;
  planPro: string;
  planStarterHint: string;
  planProHint: string;
  regionLabel: string;
  regionAria: string;
  queryLabel: string;
  queryPlaceholder: string;
  submit: string;
  hint: string;
  mockTitle: string;
  mockSnapshot: string;
  mockEmptyQuery: string;
  dashboardHint: string;
  dashboardCta: string;
  previewLiveNote: string;
  previewLoading: string;
  previewError: string;
  previewOpenLive: string;
  previewNotUrl: string;
  recordAsObservation: string;
  recordAsObservationHint: string;
  recordAsObservationLogin: string;
  recordAsObservationLoginSuffix: string;
};

type LivePreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "not_url" }
  | { status: "error"; openHref: string }
  | { status: "ok"; canonicalUrl: string; title: string | null; image: string | null };

type RegionSearchPanelProps = {
  locale: Locale;
  labels: RegionSearchLabels;
  mode: "marketing" | "dashboard";
  /** ダッシュボード: 契約プランを初期タブに */
  defaultPlanId?: PlanId;
  /** 設定時はカバレッジを契約プランに固定（記録と整合） */
  lockedPlanId?: PlanId;
};

export function RegionSearchPanel({
  locale,
  labels,
  mode,
  defaultPlanId,
  lockedPlanId,
}: RegionSearchPanelProps) {
  const uid = useId();
  const regionFieldId = `${uid}-region`;
  const queryFieldId = `${uid}-query`;

  const [planTab, setPlanTab] = useState<PlanId>(() => lockedPlanId ?? defaultPlanId ?? "pro");
  const [region, setRegion] = useState("");
  const [query, setQuery] = useState("");
  const [previewOn, setPreviewOn] = useState(false);
  const [livePreview, setLivePreview] = useState<LivePreviewState>({ status: "idle" });

  useEffect(() => {
    if (lockedPlanId) setPlanTab(lockedPlanId);
  }, [lockedPlanId]);

  const effectivePlan = lockedPlanId ?? planTab;

  const options = useMemo(() => {
    return getRegionOptions(effectivePlan).map((o) => ({
      value: o.value,
      label: getRegionLabelForLocale(o, locale),
    }));
  }, [effectivePlan, locale]);

  useEffect(() => {
    const first = getRegionOptions(effectivePlan)[0]?.value ?? "";
    setRegion(first);
  }, [effectivePlan]);

  const selectedLabel = options.find((o) => o.value === region)?.label ?? region;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPreviewOn(true);
    const q = query.trim();
    if (!q) {
      setLivePreview({ status: "idle" });
      return;
    }
    const normalized = normalizeUserUrlInput(q);
    if (!normalized) {
      setLivePreview({ status: "not_url" });
      return;
    }
    setLivePreview({ status: "loading" });
    try {
      const res = await fetch("/api/url-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: q }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        canonicalUrl?: string;
        title?: string | null;
        image?: string | null;
      };
      if (!data.ok || !data.canonicalUrl) {
        setLivePreview({ status: "error", openHref: normalized });
        return;
      }
      setLivePreview({
        status: "ok",
        canonicalUrl: data.canonicalUrl,
        title: data.title ?? null,
        image: data.image ?? null,
      });
    } catch {
      setLivePreview({ status: "error", openHref: normalized });
    }
  }

  const exampleTime =
    locale === "ja"
      ? "2026-05-04 14:32 UTC（例）"
      : "2026-05-04 14:32 UTC (example)";

  const hintText = mode === "marketing" ? labels.hint : labels.dashboardHint;

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm sm:p-8"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
          {labels.planLabel}
        </p>
        {lockedPlanId ? (
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            {lockedPlanId === "pro"
              ? `${labels.planPro} · ${labels.planProHint}`
              : `${labels.planStarter} · ${labels.planStarterHint}`}
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={labels.planLabel}>
            {(
              [
                { id: "starter" as const, title: labels.planStarter, hint: labels.planStarterHint },
                { id: "pro" as const, title: labels.planPro, hint: labels.planProHint },
              ] as const
            ).map((tab) => {
              const active = planTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPlanTab(tab.id)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                    active
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]/50 ring-2 ring-[var(--color-accent)]/20"
                      : "border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-ink-muted)]/35"
                  }`}
                  aria-pressed={active}
                >
                  <span className="font-semibold text-[var(--color-ink)]">{tab.title}</span>
                  <span className="mt-0.5 block text-xs text-[var(--color-ink-muted)]">{tab.hint}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:gap-8">
          <div>
            <label htmlFor={regionFieldId} className="block text-sm font-medium text-[var(--color-ink)]">
              {labels.regionLabel}
            </label>
            <select
              id={regionFieldId}
              aria-label={labels.regionAria}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-ink)] outline-none ring-[var(--color-accent)]/25 focus:border-[var(--color-accent)]/40 focus:ring-2"
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={queryFieldId} className="block text-sm font-medium text-[var(--color-ink)]">
              {labels.queryLabel}
            </label>
            <input
              id={queryFieldId}
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels.queryPlaceholder}
              className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-ink)] outline-none ring-[var(--color-accent)]/25 placeholder:text-[var(--color-ink-muted)]/65 focus:border-[var(--color-accent)]/40 focus:ring-2"
            />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="inline-flex rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
          >
            {labels.submit}
          </button>
          {mode === "marketing" ? (
            <Link
              href="/login"
              className="text-sm font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
            >
              {locale === "ja" ? "無料で始める →" : "Start for free →"}
            </Link>
          ) : (
            <Link
              href="/dashboard/observations/new"
              className="text-sm font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
            >
              {labels.dashboardCta}
            </Link>
          )}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-[var(--color-ink-muted)]">{hintText}</p>
      </form>

      {previewOn ? (
        <div className="rounded-2xl border border-[var(--color-accent)]/25 bg-[var(--color-accent-soft)]/30 p-6 sm:p-8">
          <h3 className="font-display text-sm font-semibold text-[var(--color-ink)]">{labels.mockTitle}</h3>
          <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-ink-muted)]">
              <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden />
              <span>
                {labels.mockSnapshot} · {selectedLabel} · {exampleTime}
              </span>
            </div>
            <p className="mt-3 break-all text-sm font-medium text-[var(--color-ink)]">
              {query.trim() ? query.trim() : labels.mockEmptyQuery}
            </p>

            {query.trim() ? (
              <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                {livePreview.status === "loading" ? (
                  <p className="text-sm text-[var(--color-ink-muted)]">{labels.previewLoading}</p>
                ) : null}
                {livePreview.status === "not_url" ? (
                  <p className="text-sm text-[var(--color-ink-muted)]">{labels.previewNotUrl}</p>
                ) : null}
                {livePreview.status === "error" ? (
                  <div className="space-y-3">
                    <p className="text-sm text-[var(--color-ink-muted)]">{labels.previewError}</p>
                    <a
                      href={livePreview.openHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex text-sm font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
                    >
                      {labels.previewOpenLive}
                    </a>
                  </div>
                ) : null}
                {livePreview.status === "ok" ? (
                  <div className="space-y-3">
                    {livePreview.title ? (
                      <p className="text-sm font-semibold text-[var(--color-ink)]">{livePreview.title}</p>
                    ) : null}
                    {livePreview.image ? (
                      <Image
                        src={livePreview.image}
                        alt=""
                        width={768}
                        height={384}
                        className="max-h-48 w-full max-w-lg rounded-lg border border-[var(--color-border)] object-cover object-top"
                        loading="lazy"
                        unoptimized
                      />
                    ) : null}
                    <p className="text-xs leading-relaxed text-[var(--color-ink-muted)]">{labels.previewLiveNote}</p>
                    <a
                      href={livePreview.canonicalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex text-sm font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
                    >
                      {labels.previewOpenLive}
                    </a>
                    {mode === "dashboard" ? (
                      <form action={recordWebVerifiedObservationAction} className="mt-4 space-y-2">
                        <input type="hidden" name="url" value={livePreview.canonicalUrl} />
                        <input type="hidden" name="region" value={region} />
                        <input type="hidden" name="regionLabel" value={selectedLabel} />
                        <input type="hidden" name="verifiedTitle" value={livePreview.title ?? ""} />
                        <input type="hidden" name="verifiedImageUrl" value={livePreview.image ?? ""} />
                        <button
                          type="submit"
                          className="inline-flex w-full justify-center rounded-full bg-[var(--color-ink)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-[1px] hover:bg-[color-mix(in_oklab,var(--color-ink)_92%,white)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] active:translate-y-0 active:shadow-sm sm:w-auto"
                        >
                          {labels.recordAsObservation}
                        </button>
                        <p className="text-xs leading-relaxed text-[var(--color-ink-muted)]">
                          {labels.recordAsObservationHint}
                        </p>
                      </form>
                    ) : (
                      <p className="mt-4 text-xs text-[var(--color-ink-muted)]">
                        <Link
                          href="/login?next=/dashboard/region-search"
                          className="font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
                        >
                          {labels.recordAsObservationLogin}
                        </Link>
                        <span className="text-[var(--color-ink-muted)]">{labels.recordAsObservationLoginSuffix}</span>
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
