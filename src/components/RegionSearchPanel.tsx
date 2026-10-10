"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useId, useMemo, useState } from "react";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import { recordWebVerifiedObservationAction } from "@/app/actions/observations";
import {
  REGION_SEARCH_FIELD_CLASS,
  type RegionSearchLabels,
} from "@/components/RegionSearchQueryField";

export type { RegionSearchLabels };
import type { Locale } from "@/lib/i18n";
import type { PlanId } from "@/lib/plans";
import { getRegionLabelForLocale, getRegionOptions } from "@/lib/regions";
import { normalizeUserUrlInput } from "@/lib/url-preview";

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
  /** Server-rendered URL field. Keep it out of this client island for INP. */
  queryField: ReactNode;
  /** ダッシュボード: 契約プランを初期タブに */
  defaultPlanId?: PlanId;
  /** 設定時はカバレッジを契約プランに固定（記録と整合） */
  lockedPlanId?: PlanId;
};

export function RegionSearchPanel({
  locale,
  labels,
  mode,
  queryField,
  defaultPlanId,
  lockedPlanId,
}: RegionSearchPanelProps) {
  const uid = useId();
  const regionFieldId = `${uid}-region`;

  const [planTab, setPlanTab] = useState<PlanId>(() => lockedPlanId ?? defaultPlanId ?? "pro");
  const [region, setRegion] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPreviewOn(true);
    const q = String(new FormData(e.currentTarget).get("query") ?? "").trim();
    setSubmittedQuery(q);
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

  return (
    <div className="space-y-8">
      <form
        action={mode === "dashboard" ? recordWebVerifiedObservationAction : undefined}
        onSubmit={mode === "marketing" ? handleSubmit : undefined}
        className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-8"
      >
        {mode === "dashboard" ? (
          <>
            <input type="hidden" name="regionLabel" value={selectedLabel} />
            <input type="hidden" name="verifiedTitle" value="" />
            <input type="hidden" name="verifiedImageUrl" value="" />
          </>
        ) : null}
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
              {mode === "dashboard" ? labels.dashboardRegionLabel : labels.regionLabel}
            </label>
            <select
              id={regionFieldId}
              name={mode === "dashboard" ? "region" : undefined}
              aria-label={mode === "dashboard" ? labels.dashboardRegionAria : labels.regionAria}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className={REGION_SEARCH_FIELD_CLASS}
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
          {queryField}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {mode === "dashboard" ? (
            <PendingSubmitButton
              label={labels.dashboardSubmit}
              pendingLabel={labels.dashboardSubmitPending}
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover hover:shadow-md active:translate-y-px disabled:hover:shadow-sm"
              pendingClassName="hover:bg-accent"
            />
          ) : (
            <>
              <button
                type="submit"
                className="inline-flex cursor-pointer rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover hover:shadow-md active:translate-y-px"
              >
                {labels.submit}
              </button>
              <Link
                href="/login?mode=signup"
                className="text-sm font-semibold text-accent hover:text-accent-hover"
              >
                {locale === "ja" ? "無料で始める →" : "Start for free →"}
              </Link>
            </>
          )}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-muted">{hintText}</p>
      </form>

      {mode === "marketing" && previewOn ? (
        <div className="rounded-2xl border border-accent/25 bg-accent-soft/30 p-6 sm:p-8">
          <h3 className="font-display text-sm font-semibold text-ink">{labels.mockTitle}</h3>
          <div className="mt-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-ink-muted">
              <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden />
              <span>
                {labels.mockSnapshot} · {labels.previewDirectAccess} · {labels.previewSampleNote}
              </span>
            </div>
            <p className="mt-3 break-all text-sm font-medium text-ink">
              {submittedQuery ? submittedQuery : labels.mockEmptyQuery}
            </p>

            {submittedQuery ? (
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
                        className="max-h-[min(55vh,420px)] w-full max-w-lg rounded-lg border border-border object-contain object-top"
                        loading="lazy"
                        unoptimized
                      />
                    ) : null}
                    <p className="text-xs leading-relaxed text-ink-muted">
                      {labels.previewLiveNoteMarketing}
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
