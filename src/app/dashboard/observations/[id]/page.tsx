import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ObservationDetailSnapshotSection } from "@/components/dashboard/ObservationDetailSnapshotSection";
import { ObservationDigitalSeal } from "@/components/dashboard/ObservationDigitalSeal";
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
import { setObservationWatchEnabledAction } from "@/app/actions/observation-watches";
import { copy } from "@/lib/i18n";
import { localizeObservationNote } from "@/lib/i18n/observation-persisted-copy";
import { getRequestLocale } from "@/lib/i18n/locale-server";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const locale = await getRequestLocale();
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

export default async function ObservationDetailPage({ params }: Props) {
  const { id } = await params;
  const locale = await getRequestLocale();
  const rt = copy[locale].observationReport;
  const t = copy[locale].observationDetail;
  const session = await getSession();
  if (!session) notFound();
  let obs = await getObservationMergedForPlan(id, session.plan);
  if (!obs) notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) notFound();

  obs = await reconcileObservationContentHashIfNeeded(supabase, obs);

  const { data: watchRow } =
    session.plan === "pro" && obs.regionValue
      ? await supabase
          .from("observation_watches")
          .select("enabled")
          .eq("user_id", user.id)
          .eq("url", obs.url)
          .eq("region", obs.regionValue)
          .maybeSingle()
      : { data: null as { enabled: boolean } | null };
  const watchEnabled = Boolean(watchRow?.enabled);

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
          className="font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
        >
          {t.backToList}
        </Link>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{t.title}</h1>
        <Link
          href={`/dashboard/observations/${obs.id}/report`}
          className="text-sm font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
        >
          {rt.openReport} →
        </Link>
      </div>

      <ObservationDigitalSeal obs={obs} locale={locale} />

      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
          <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            {t.capturedAt}
          </dt>
          <dd className="mt-1 text-sm text-[var(--color-ink)]">{formatJaDateTime(obs.capturedAt)}</dd>
          <dd className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
            {formatUtcLabel(obs.capturedAt)}
          </dd>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
          <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            {t.region}
          </dt>
          <dd className="mt-1 text-sm text-[var(--color-ink)]">{obs.regionLabel}</dd>
        </div>
        {displayTitle ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
              {t.pageTitleCaptured}
            </dt>
            <dd className="mt-1 text-sm text-[var(--color-ink)]">{displayTitle}</dd>
          </div>
        ) : null}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            {t.url}
          </dt>
          <dd className="mt-1 break-all font-mono text-sm text-[var(--color-ink)]">{obs.url}</dd>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            {t.status}
          </dt>
          <dd className="mt-1 text-sm text-[var(--color-ink)]">
            {obs.status === "success"
              ? t.statusSuccess
              : obs.status === "failure"
                ? t.statusFailure
                : t.statusPending}
            {obs.note ? ` — ${localizeObservationNote(obs.note, locale)}` : ""}
          </dd>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            {t.integrityTitle}
          </dt>
          <dd className="mt-1 space-y-2 text-sm text-[var(--color-ink)]">
            {contentIntegrity === "ok" ? (
              <>
                <p>
                  {t.integrityOk.replace("{version}", String(OBSERVATION_CONTENT_HASH_VERSION))}
                </p>
                {obs.contentHash ? (
                  <p className="break-all font-mono text-xs text-[var(--color-ink-muted)]">
                    {obs.contentHash}
                  </p>
                ) : null}
              </>
            ) : contentIntegrity === "missing" ? (
              <p className="text-[var(--color-ink-muted)]">
                {t.integrityMissing}
              </p>
            ) : (
              <>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  {t.integrityMismatch}
                </p>
                {obs.contentHash ? (
                  <p className="break-all font-mono text-xs text-[var(--color-ink-muted)]">
                    {t.integrityStoredPrefix}
                    {obs.contentHash}
                  </p>
                ) : null}
              </>
            )}
          </dd>
        </div>
        {obs.status === "success" && !obs.snapshotSha256 ? (
          <div className="rounded-xl border border-sky-500/35 bg-sky-500/10 px-4 py-2.5 sm:col-span-2">
            <p className="text-sm text-[var(--color-ink)]">{t.fallbackInsuranceLine}</p>
          </div>
        ) : null}
        <ObservationSnapshotBinaryPanel
          observationId={obs.id}
          locale={locale}
          snapshotSha256={obs.snapshotSha256}
          snapshotPhash={obs.snapshotPhash}
          snapshotBytes={obs.snapshotBytes}
          snapshotContentType={obs.snapshotContentType}
          snapshotImageUrl={obs.snapshotImageUrl}
        />
        {session.plan === "pro" && obs.regionValue ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
              {t.watchTitle}
            </dt>
            <dd className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[var(--color-ink)]">
                {t.watchBody.replace("{region}", obs.regionLabel)}
              </p>
              <form action={setObservationWatchEnabledAction}>
                <input type="hidden" name="url" value={obs.url} />
                <input type="hidden" name="region" value={obs.regionValue} />
                <input type="hidden" name="enabled" value={String(!watchEnabled)} />
                <button
                  type="submit"
                  className={`inline-flex rounded-full px-5 py-2.5 text-sm font-semibold text-white transition ${
                    watchEnabled
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-[var(--color-ink)] hover:opacity-90"
                  }`}
                >
                  {watchEnabled ? t.watchEnabled : t.watchDisabled}
                </button>
              </form>
            </dd>
          </div>
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
