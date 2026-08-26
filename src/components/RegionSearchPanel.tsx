"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useId, useMemo, useState } from "react";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
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
  previewLiveNoteMarketing: string;
  previewDirectAccess: string;
  previewSampleNote: string;
  previewRegionCtaTitle: string;
  previewRegionCtaButton: string;
  regionMarketingHint: string;
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
        body: JSON.stringify({
          url: q,
          ...(mode === "marketing" ? { marketingPreview: true } : {}),
        }),
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
  const recordPendingText = locale === "ja" ? "処理中…" : "Processing…";

  function RecordAsObservationSubmitButton() {
    return (
      <PendingSubmitButton
        label={labels.recordAsObservation}
        pendingLabel={recordPendingText}
        className="w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-ink/92 hover:shadow-md active:translate-y-0 active:shadow-sm disabled:hover:shadow-sm sm:w-auto"
        pendingClassName="hover:bg-ink"
      />
    );
  }

  const previewRegionLabel =
    mode === "marketing" ? labels.previewDirectAccess : selectedLabel;

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-8"
      >
        {mode === "dashboard" && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              {labels.planLabel}
            </p>
            {lockedPlanId ? (
              <p className="mt-2 text-sm text-ink-muted">
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
                          ? "border-accent bg-accent-soft/50 ring-2 ring-accent/20"
                          : "border-border bg-surface-elevated hover:border-ink-muted/35"
                      }`}
                      aria-pressed={active}
                    >
                      <span className="font-semibold text-ink">{tab.title}</span>
                      <span className="mt-0.5 block text-xs text-ink-muted">{tab.hint}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        <div className={`grid gap-6 lg:grid-cols-2 lg:gap-8 ${mode === "dashboard" ? "mt-8" : ""}`}>
          <div>
            <label htmlFor={regionFieldId} className="block text-sm font-medium text-ink">
              {labels.regionLabel}
            </label>
            <select
              id={regionFieldId}
              aria-label={labels.regionAria}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm text-ink outline-none ring-accent/25 focus:border-accent/40 focus:ring-2"
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {mode === "marketing" ? (
              <p className="mt-2 rounded-lg bg-accent-soft/40 px-3 py-2 text-xs leading-relaxed text-ink-muted">
                {labels.regionMarketingHint}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor={queryFieldId} className="block text-sm font-medium text-ink">
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
              className="mt-2 w-full rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm text-ink outline-none ring-accent/25 placeholder:text-ink-muted/65 focus:border-accent/40 focus:ring-2"
            />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="inline-flex cursor-pointer rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover hover:shadow-md active:translate-y-px"
          >
            {labels.submit}
          </button>
          {mode === "marketing" ? (
            <Link
              href="/login?mode=signup"
              className="text-sm font-semibold text-accent hover:text-accent-hover"
            >
              {locale === "ja" ? "無料で始める →" : "Start for free →"}
            </Link>
          ) : (
            <Link
              href="/dashboard/observations/new"
              className="text-sm font-semibold text-accent hover:text-accent-hover"
            >
              {labels.dashboardCta}
            </Link>
          )}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-muted">{hintText}</p>
      </form>

      {previewOn ? (
        <div className="rounded-2xl border border-accent/25 bg-accent-soft/30 p-6 sm:p-8">
          <h3 className="font-display text-sm font-semibold text-ink">{labels.mockTitle}</h3>
          <div className="mt-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-ink-muted">
              <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden />
              <span>
                {labels.mockSnapshot} · {previewRegionLabel} ·{" "}
                {mode === "marketing" ? labels.previewSampleNote : exampleTime}
              </span>
            </div>
            <p className="mt-3 break-all text-sm font-medium text-ink">
              {query.trim() ? query.trim() : labels.mockEmptyQuery}
            </p>

            {query.trim() ? (
              <div className="mt-4 border-t border-border pt-4">
                {livePreview.status === "loading" ? (
                  <p className="text-sm text-ink-muted">{labels.previewLoading}</p>
                ) : null}
                {livePreview.status === "not_url" ? (
                  <p className="text-sm text-ink-muted">{labels.previewNotUrl}</p>
                ) : null}
                {livePreview.status === "error" ? (
                  <div className="space-y-3">
                    <p className="text-sm text-ink-muted">{labels.previewError}</p>
                    <a
                      href={livePreview.openHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex text-sm font-semibold text-accent hover:text-accent-hover"
                    >
                      {labels.previewOpenLive}
                    </a>
                  </div>
                ) : null}
                {livePreview.status === "ok" ? (
                  <div className="space-y-3">
                    {livePreview.title ? (
                      <p className="text-sm font-semibold text-ink">{livePreview.title}</p>
                    ) : null}
                    {livePreview.image ? (
                      <Image
                        src={livePreview.image}
                        alt=""
                        width={768}
                        height={480}
                        className={`w-full max-w-lg rounded-lg border border-border object-top ${
                          mode === "marketing"
                            ? "max-h-[min(55vh,420px)] object-contain"
                            : "max-h-48 object-cover"
                        }`}
                        loading="lazy"
                        unoptimized
                      />
                    ) : null}
                    <p className="text-xs leading-relaxed text-ink-muted">
                      {mode === "marketing" ? labels.previewLiveNoteMarketing : labels.previewLiveNote}
                    </p>
                    <a
                      href={livePreview.canonicalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex text-sm font-semibold text-accent hover:text-accent-hover"
                    >
                      {labels.previewOpenLive}
                    </a>
                    {mode === "marketing" ? (
                      <div className="mt-4 rounded-xl border border-accent/30 bg-accent-soft/40 p-4">
                        <p className="text-sm font-medium leading-relaxed text-ink">
                          {labels.previewRegionCtaTitle.replace("{region}", selectedLabel)}
                        </p>
                        <Link
                          href="/login?mode=signup"
                          className="mt-3 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover hover:shadow-md"
                        >
                          {labels.previewRegionCtaButton}
                        </Link>
                      </div>
                    ) : null}
                    {mode === "dashboard" ? (
                      <form action={recordWebVerifiedObservationAction} className="mt-4 space-y-2">
                        <input type="hidden" name="url" value={livePreview.canonicalUrl} />
                        <input type="hidden" name="region" value={region} />
                        <input type="hidden" name="regionLabel" value={selectedLabel} />
                        <input type="hidden" name="verifiedTitle" value={livePreview.title ?? ""} />
                        <input type="hidden" name="verifiedImageUrl" value={livePreview.image ?? ""} />
                        <RecordAsObservationSubmitButton />
                        <p className="text-xs leading-relaxed text-ink-muted">
                          {labels.recordAsObservationHint}
                        </p>
                      </form>
                    ) : null}
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
