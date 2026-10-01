import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NewObservationForm } from "@/components/dashboard/NewObservationForm";
import { getSession } from "@/lib/auth/session";
import {
  countObservationsSinceTrialStart,
  readUserObservations,
} from "@/lib/demo/user-observations";
import { getDemoUsageThisMonth } from "@/lib/demo/usage";
import { getPlan, TRIAL_CONFIG } from "@/lib/plans";
import { getSnapshotCapabilityCopy } from "@/lib/plans/snapshot-ui";
import { getRegionOptions } from "@/lib/regions";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";

export const metadata: Metadata = {
  title: "新規オブザベーション | Viewtrace",
  robots: { index: false, follow: false },
};

export default async function NewObservationPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; region?: string; error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/observations/new");

  let trialRemaining: number | null = null;
  if (session.trialEligible) {
    if (session.trialExpired) {
      redirect("/checkout?plan=starter&reason=trial_expired");
    }
    const existing = await readUserObservations();
    const trialUsed = session.trialStartedAt
      ? countObservationsSinceTrialStart(existing, session.trialStartedAt)
      : existing.length;
    if (trialUsed >= TRIAL_CONFIG.freeObservations) {
      redirect("/checkout?plan=starter&reason=trial_observation_limit");
    }
    trialRemaining = Math.max(0, TRIAL_CONFIG.freeObservations - trialUsed);
  }

  const plan = getPlan(session.plan);
  const locale = await getRequestLocale();
  const tSettings = copy[locale].dashboardSettings;
  const snap = getSnapshotCapabilityCopy(locale, session.plan);
  const intro = tSettings.observationNewIntro
    .replace("{marketing}", snap.marketing)
    .replace("{technical}", snap.technical);
  const regions = getRegionOptions(session.plan);
  const usage = await getDemoUsageThisMonth(session.plan);
  let remainingSlots = Math.max(0, usage.limit - usage.used);
  if (trialRemaining != null) {
    remainingSlots = Math.min(remainingSlots, trialRemaining);
  }
  const sp = await searchParams;
  const defaultUrl = sp.url ? decodeURIComponent(sp.url) : "";
  const defaultRegion = sp.region && regions.some((r) => r.value === sp.region) ? sp.region : undefined;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{tSettings.observationNewTitle}</h1>
        <p className="mt-1 text-sm text-ink-muted">{intro}</p>
        {sp.error ? (
          <p className="mt-2 text-sm font-medium text-red-700" role="alert">
            {sp.error === "limit" ? (
              <>
                {tSettings.observationMonthlyLimit.replace("{limit}", String(plan.monthlyObservations))}{" "}
                <Link href="/checkout?plan=starter" className="underline hover:text-red-900">
                  {locale === "ja" ? "アップグレード" : "Upgrade"}
                </Link>
              </>
            ) : (
              locale === "ja"
                ? "入力を確認してください（URL または地域が無効です）。"
                : "Check the URL or region and try again."
            )}
          </p>
        ) : null}
        <p className="mt-2 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs text-ink-muted">
          <span className="font-semibold text-ink">{plan.name}</span>
          {" · "}
          {plan.coverageLabel}
          {plan.allUsStates ? "（米国は全州から選択可能）" : "（米国は代表州のみ）"}
        </p>
        <p className="mt-2 text-xs text-ink-muted">
          スクリーンショット保存の目安: {plan.retentionDays} 日（{plan.name}）。
        </p>
      </div>

      <NewObservationForm
        regions={regions}
        defaultUrl={defaultUrl}
        defaultRegion={defaultRegion}
        locale={locale}
        remainingSlots={remainingSlots}
        labels={{
          observationSubmit: tSettings.observationSubmit,
          observationSubmitPending: tSettings.observationSubmitPending,
          observationCancel: tSettings.observationCancel,
          regionLabel: tSettings.observationRegionLabel,
          regionsHint: tSettings.observationRegionsHint,
          regionsCost: tSettings.observationRegionsCost,
          regionsMax: tSettings.observationRegionsMax,
          regionsQuota: tSettings.observationRegionsQuota,
          regionsProgress: tSettings.observationRegionsProgress,
          observeN: tSettings.observationObserveN,
          remainingHint: tSettings.observationRemainingHint,
          suggestedLabel: tSettings.observationSuggestedRegions,
          runError: tSettings.observationRunError,
        }}
      />
    </div>
  );
}
