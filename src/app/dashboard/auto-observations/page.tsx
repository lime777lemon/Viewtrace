import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AutoObservationsClient } from "@/components/dashboard/AutoObservationsClient";
import { getSession } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plans";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { getRegionLabelForLocale, getRegionOptions } from "@/lib/regions";
import { getScheduledObservationEnvStatus } from "@/lib/scheduled-observation-env";
import type { ObservationWatchPanelCopy } from "@/components/dashboard/ObservationWatchPanel";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: copy[locale].dashboardAutoObs.metaTitle,
    robots: { index: false, follow: false },
  };
}

export default async function AutoObservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const locale = await getRequestLocale();
  const sp = await searchParams;
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const plan = getPlan(session.plan);
  const t = copy[locale].dashboardAutoObs;
  const tDetail = copy[locale].observationDetail;

  const panelCopy: ObservationWatchPanelCopy = {
    title: tDetail.watchTitle,
    intro: tDetail.watchIntro,
    frequencyLabel: tDetail.watchFrequencyLabel,
    frequencyDaily: tDetail.watchFrequencyDaily,
    frequencyWeekly: tDetail.watchFrequencyWeekly,
    frequencyMonthly: tDetail.watchFrequencyMonthly,
    repeatLabel: tDetail.watchRepeatLabel,
    notifyLabel: tDetail.watchNotifyLabel,
    notifyAlways: tDetail.watchNotifyAlways,
    notifyChangeOnly: tDetail.watchNotifyChangeOnly,
    monitoringOn: tDetail.watchMonitoringOn,
    monitoringOff: tDetail.watchMonitoringOff,
    monitoringStateLabel: tDetail.watchMonitoringStateLabel,
    save: tDetail.watchSave,
  };

  const scheduleCopy = {
    frequencyLabel: panelCopy.frequencyLabel,
    frequencyDaily: panelCopy.frequencyDaily,
    frequencyWeekly: panelCopy.frequencyWeekly,
    frequencyMonthly: panelCopy.frequencyMonthly,
    repeatLabel: panelCopy.repeatLabel,
    notifyLabel: panelCopy.notifyLabel,
    notifyAlways: panelCopy.notifyAlways,
    notifyChangeOnly: panelCopy.notifyChangeOnly,
    monitoringOn: panelCopy.monitoringOn,
    monitoringOff: panelCopy.monitoringOff,
    monitoringStateLabel: panelCopy.monitoringStateLabel,
  };

  if (!plan.autoObservationWatch) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-sm text-ink-muted">{t.upgradeHint}</p>
        <p className="text-sm">
          <Link href="/dashboard/settings" className="font-medium text-accent hover:text-accent-hover">
            {locale === "ja" ? "設定へ" : "Settings"}
          </Link>
          {" · "}
          <Link href="/checkout?plan=starter" className="font-medium text-accent hover:text-accent-hover">
            Starter
          </Link>
          {" · "}
          <Link href="/checkout?plan=pro" className="font-medium text-accent hover:text-accent-hover">
            Pro
          </Link>
        </p>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    redirect("/login");
  }

  const { data: watchRows } = await supabase
    .from("observation_watches")
    .select("id,url,region,enabled,schedule_frequency,repeat_count,notify_mode,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const watches = (watchRows ?? []).map((r) => ({
    id: String(r.id),
    url: String(r.url ?? ""),
    region: String(r.region ?? ""),
    enabled: Boolean(r.enabled),
    schedule_frequency: r.schedule_frequency as string | null,
    repeat_count: typeof r.repeat_count === "number" ? r.repeat_count : null,
    notify_mode: r.notify_mode as string | null,
  }));

  const regionOpts = getRegionOptions(session.plan).map((o) => ({
    value: o.value,
    label: getRegionLabelForLocale(o, locale),
  }));

  const envStatus = getScheduledObservationEnvStatus();

  return (
    <AutoObservationsClient
      watches={watches}
      regions={regionOpts}
      copy={t}
      scheduleCopy={scheduleCopy}
      showInvalidBanner={sp.error === "invalid"}
      showInvalidUrlBanner={sp.error === "invalid_url"}
      showInvalidRegionBanner={sp.error === "invalid_region"}
      showSaveErrorBanner={sp.error === "save"}
      showSavedRowBanner={sp.saved === "row"}
      envStatus={envStatus}
      accountEmailConfigured={Boolean(session.email?.trim())}
    />
  );
}
