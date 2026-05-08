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
import {
  OBSERVATION_CONTENT_HASH_VERSION,
  verifyObservationStoredHash,
} from "@/lib/observation-content-hash";
import { setObservationWatchEnabledAction } from "@/app/actions/observation-watches";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const session = await getSession();
  const obs = session
    ? await getObservationMergedForPlan(id, session.plan)
    : undefined;
  return {
    title: obs ? `記録 ${obs.id} | Viewtrace` : "記録 | Viewtrace",
    robots: { index: false, follow: false },
  };
}

export default async function ObservationDetailPage({ params }: Props) {
  const { id } = await params;
  const locale = await getRequestLocale();
  const rt = copy[locale].observationReport;
  const session = await getSession();
  if (!session) notFound();
  const obs = await getObservationMergedForPlan(id, session.plan);
  if (!obs) notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) notFound();

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
          ← 一覧へ
        </Link>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">オブザベーション詳細</h1>
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
            取得日時
          </dt>
          <dd className="mt-1 text-sm text-[var(--color-ink)]">{formatJaDateTime(obs.capturedAt)}</dd>
          <dd className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
            {formatUtcLabel(obs.capturedAt)}
          </dd>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
          <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            地域
          </dt>
          <dd className="mt-1 text-sm text-[var(--color-ink)]">{obs.regionLabel}</dd>
        </div>
        {displayTitle ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
              ページタイトル（取得時点）
            </dt>
            <dd className="mt-1 text-sm text-[var(--color-ink)]">{displayTitle}</dd>
          </div>
        ) : null}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            URL
          </dt>
          <dd className="mt-1 break-all font-mono text-sm text-[var(--color-ink)]">{obs.url}</dd>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            ステータス
          </dt>
          <dd className="mt-1 text-sm text-[var(--color-ink)]">
            {obs.status === "success" ? "成功" : obs.status === "failure" ? "失敗" : "処理中"}
            {obs.note ? ` — ${obs.note}` : ""}
          </dd>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            コンテンツ整合性チェック
          </dt>
          <dd className="mt-1 space-y-2 text-sm text-[var(--color-ink)]">
            {contentIntegrity === "ok" ? (
              <>
                <p>
                  記録された主要フィールドとハッシュが一致しています（SHA-256、v
                  {OBSERVATION_CONTENT_HASH_VERSION}）。
                </p>
                {obs.contentHash ? (
                  <p className="break-all font-mono text-xs text-[var(--color-ink-muted)]">
                    {obs.contentHash}
                  </p>
                ) : null}
              </>
            ) : contentIntegrity === "missing" ? (
              <p className="text-[var(--color-ink-muted)]">
                コンテンツハッシュがありません（この機能追加前の記録の可能性があります）。
              </p>
            ) : (
              <>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  保存内容とハッシュが一致しません。記録内容の更新や、検証方式の変更などが考えられます。
                </p>
                {obs.contentHash ? (
                  <p className="break-all font-mono text-xs text-[var(--color-ink-muted)]">
                    保存値: {obs.contentHash}
                  </p>
                ) : null}
              </>
            )}
          </dd>
        </div>
        <ObservationSnapshotBinaryPanel
          observationId={obs.id}
          snapshotSha256={obs.snapshotSha256}
          snapshotPhash={obs.snapshotPhash}
          snapshotBytes={obs.snapshotBytes}
          snapshotContentType={obs.snapshotContentType}
          snapshotImageUrl={obs.snapshotImageUrl}
        />
        {session.plan === "pro" && obs.regionValue ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
              継続監視
            </dt>
            <dd className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[var(--color-ink)]">
                このURL（{obs.regionLabel}）を1日1回自動で観測し、差分が大きいときにメール通知します。
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
                  {watchEnabled ? "監視中（停止）" : "監視を開始"}
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
      />
    </div>
  );
}
