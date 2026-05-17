import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ObservationDetailSnapshotSection } from "@/components/dashboard/ObservationDetailSnapshotSection";
import { ObservationDigitalSeal } from "@/components/dashboard/ObservationDigitalSeal";
import { ObservationNotVisible } from "@/components/dashboard/ObservationNotVisible";
import { ObservationSnapshotBinaryPanel } from "@/components/dashboard/ObservationSnapshotBinaryPanel";
import { getSession } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCachedUrlPreviewForObservation } from "@/lib/demo/observation-snapshot";
import { getObservationMergedForPlan } from "@/lib/demo/user-observations";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";
import { reconcileObservationContentHashIfNeeded } from "@/lib/observation-content-hash-repair";
import {
  OBSERVATION_CONTENT_HASH_VERSION,
  verifyObservationStoredHash,
} from "@/lib/observation-content-hash";
import { ObservationWatchPanel } from "@/components/dashboard/ObservationWatchPanel";
import { getPlan } from "@/lib/plans";
import {
  clampRepeatCount,
  parseWatchFrequency,
  parseWatchNotifyMode,
  type WatchFrequency,
  type WatchNotifyMode,
} from "@/lib/observation-watch-schedule";
import { copy } from "@/lib/i18n";
import { localizeObservationNote } from "@/lib/i18n/observation-persisted-copy";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { sanitizeObservationRouteId } from "@/lib/observation-route-id";

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { id: idRaw } = await params;
  const id = sanitizeObservationRouteId(idRaw);
  const locale = await getRequestLocale();
  if (!id) {
    return {
      title: locale === "ja" ? "記録 | Viewtrace" : "Record | Viewtrace",
      robots: { index: false, follow: false },
    };
  }
  const session = await getSession();
  const obs = session
    ? await getObservationMergedForPlan(id, session.plan)
    : undefined;
  return {
    title:
      locale === "ja"
        ? obs
          ? `記録 ${obs.id} | Viewtrace`
          : "記録 | Viewtrace"
        : obs
          ? `Record ${obs.id} | Viewtrace`
          : "Record | Viewtrace",
    robots: { index: false, follow: false },
  };
}

export default async function ObservationDetailPage({ params, searchParams }: PageProps) {
  const { id: idRaw } = await params;
  const id = sanitizeObservationRouteId(idRaw);
  if (!id) notFound();
  const sp = await searchParams;
  const locale = await getRequestLocale();
  const rt = copy[locale].observationReport;
  const t = copy[locale].observationDetail;
  const autoObsCopy = copy[locale].dashboardAutoObs;
  const session = await getSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/dashboard/observations/${id}`)}`);
  }
  let obs = await getObservationMergedForPlan(id, session.plan);
  if (!obs) {
    /**
     * 自動観測メールを「別アカウント」でログイン中の端末で開くと RLS で行が見えず、
     * 真っ白な 404 になっていた。ID 自体は本人のメールに既に届いているので、
     * どのアカウントで見ているかを案内してログアウト導線を出す。
     */
    return (
      <ObservationNotVisible
        signedInEmail={session.email}
        observationId={id}
        locale={locale}
      />
    );
  }

  const supabase = await createSupabaseServerClient();

  obs = await reconcileObservationContentHashIfNeeded(supabase, obs);

  const plan = getPlan(session.plan);
  const { data: watchRow } =
    plan.autoObservationWatch && obs.regionValue
      ? await supabase
          .from("observation_watches")
          .select(
            "enabled,schedule_frequency,repeat_count,notify_mode",
          )
          .eq("user_id", session.userId)
          .eq("url", obs.url)
          .eq("region", obs.regionValue)
          .maybeSingle()
      : { data: null as Record<string, unknown> | null };

  const watchEnabled = Boolean(watchRow?.enabled);
  const watchFrequency: WatchFrequency =
    parseWatchFrequency(String(watchRow?.schedule_frequency ?? "")) ?? "daily";
  const watchRepeat = clampRepeatCount(
    watchFrequency,
    typeof watchRow?.repeat_count === "number" ? watchRow.repeat_count : Number(watchRow?.repeat_count ?? 1),
  );
  const watchNotify: WatchNotifyMode =
    parseWatchNotifyMode(String(watchRow?.notify_mode ?? "")) ?? "always";

  const live =
    obs.status === "success" && (!obs.snapshotImageUrl || !obs.pageTitle)
      ? await getCachedUrlPreviewForObservation(obs.url, obs.regionValue)
      : null;

  const displayTitle = obs.pageTitle ?? live?.title ?? null;
  const displayImageUrl = obs.snapshotImageUrl ?? live?.image ?? null;
  const resolvedCanonical = live?.canonicalUrl ?? null;
  const contentIntegrity = verifyObservationStoredHash(obs);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href="/dashboard/observations"
          className="font-medium text-accent hover:text-accent-hover"
        >
          {t.backToList}
        </Link>
      </div>

      {sp.error === "save" ? (
        <div
          role="alert"
          className="rounded-lg border border-rose-300/90 bg-rose-50 px-4 py-3 text-sm text-rose-950"
        >
          <p className="font-semibold">{autoObsCopy.saveError}</p>
          <p className="mt-1 text-xs leading-relaxed text-rose-900/90">{autoObsCopy.saveErrorHint}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{t.title}</h1>
        <Link
          href={`/dashboard/observations/${obs.id}/report`}
          className="text-sm font-semibold text-accent hover:text-accent-hover"
        >
          {rt.openReport} →
        </Link>
      </div>

      <ObservationDigitalSeal obs={obs} locale={locale} />

      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {t.capturedAt}
          </dt>
          <dd className="mt-1 text-sm text-ink">{formatJaDateTime(obs.capturedAt)}</dd>
          <dd className="mt-0.5 text-xs text-ink-muted">
            {formatUtcLabel(obs.capturedAt)}
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {t.region}
          </dt>
          <dd className="mt-1 text-sm text-ink">{obs.regionLabel}</dd>
        </div>
        {displayTitle ? (
          <div className="rounded-xl border border-border bg-surface-elevated p-4 sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              {t.pageTitleCaptured}
            </dt>
            <dd className="mt-1 text-sm text-ink">{displayTitle}</dd>
          </div>
        ) : null}
        <div className="rounded-xl border border-border bg-surface-elevated p-4 sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {t.url}
          </dt>
          <dd className="mt-1 break-all font-mono text-sm text-ink">{obs.url}</dd>
        </div>
        <div className="rounded-xl border border-border bg-surface-elevated p-4 sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {t.status}
          </dt>
          <dd className="mt-1 text-sm text-ink">
            {obs.status === "success"
              ? t.statusSuccess
              : obs.status === "failure"
                ? t.statusFailure
                : t.statusPending}
            {obs.note ? ` — ${localizeObservationNote(obs.note, locale)}` : ""}
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-surface-elevated p-4 sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {t.integrityTitle}
          </dt>
          <dd className="mt-1 space-y-2 text-sm text-ink">
            {contentIntegrity === "ok" ? (
              <>
                <p>
                  {t.integrityOk.replace("{version}", String(OBSERVATION_CONTENT_HASH_VERSION))}
                </p>
                {obs.contentHash ? (
                  <p className="break-all font-mono text-xs text-ink-muted">
                    {obs.contentHash}
                  </p>
                ) : null}
              </>
            ) : contentIntegrity === "missing" ? (
              <p className="text-ink-muted">
                {t.integrityMissing}
              </p>
            ) : (
              <>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  {t.integrityMismatch}
                </p>
                {obs.contentHash ? (
                  <p className="break-all font-mono text-xs text-ink-muted">
                    {t.integrityStoredPrefix}
                    {obs.contentHash}
                  </p>
                ) : null}
              </>
            )}
          </dd>
        </div>
        <ObservationSnapshotBinaryPanel
          observationId={obs.id}
          locale={locale}
          snapshotSha256={obs.snapshotSha256}
          snapshotPhash={obs.snapshotPhash}
          snapshotBytes={obs.snapshotBytes}
          snapshotContentType={obs.snapshotContentType}
          snapshotImageUrl={obs.snapshotImageUrl}
        />
        {plan.autoObservationWatch && obs.regionValue ? (
          <ObservationWatchPanel
            url={obs.url}
            regionValue={obs.regionValue}
            regionLabel={obs.regionLabel}
            observationId={obs.id}
            initialEnabled={watchEnabled}
            initialFrequency={watchFrequency}
            initialRepeat={watchRepeat}
            initialNotify={watchNotify}
            copy={{
              title: t.watchTitle,
              intro: t.watchIntro,
              frequencyLabel: t.watchFrequencyLabel,
              frequencyDaily: t.watchFrequencyDaily,
              frequencyWeekly: t.watchFrequencyWeekly,
              frequencyMonthly: t.watchFrequencyMonthly,
              repeatLabel: t.watchRepeatLabel,
              notifyLabel: t.watchNotifyLabel,
              notifyAlways: t.watchNotifyAlways,
              notifyChangeOnly: t.watchNotifyChangeOnly,
              monitoringOn: t.watchMonitoringOn,
              monitoringOff: t.watchMonitoringOff,
              monitoringStateLabel: t.watchMonitoringStateLabel,
              save: t.watchSave,
            }}
          />
        ) : null}
      </dl>

      <ObservationDetailSnapshotSection
        obs={obs}
        displayTitle={displayTitle}
        displayImageUrl={displayImageUrl}
        resolvedCanonical={resolvedCanonical}
        locale={locale}
      />
    </div>
  );
}
