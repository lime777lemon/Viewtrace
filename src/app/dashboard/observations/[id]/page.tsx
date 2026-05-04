import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ObservationDetailSnapshotSection } from "@/components/dashboard/ObservationDetailSnapshotSection";
import { getSession } from "@/lib/auth/session";
import { getCachedUrlPreviewForObservation } from "@/lib/demo/observation-snapshot";
import { getObservationMergedForPlan } from "@/lib/demo/user-observations";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";

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
  const session = await getSession();
  if (!session) notFound();
  const obs = await getObservationMergedForPlan(id, session.plan);
  if (!obs) notFound();

  const live =
    obs.status === "success" && (!obs.snapshotImageUrl || !obs.pageTitle)
      ? await getCachedUrlPreviewForObservation(obs.url)
      : null;

  const displayTitle = obs.pageTitle ?? live?.title ?? null;
  const displayImageUrl = obs.snapshotImageUrl ?? live?.image ?? null;
  const resolvedCanonical = live?.canonicalUrl ?? null;

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

      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">オブザベーション詳細</h1>
        <p className="mt-1 font-mono text-xs text-[var(--color-ink-muted)]">{obs.id}</p>
      </div>

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
      </dl>

      <ObservationDetailSnapshotSection
        obs={obs}
        displayTitle={displayTitle}
        displayImageUrl={displayImageUrl}
        resolvedCanonical={resolvedCanonical}
      />

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 text-sm text-[var(--color-ink-muted)]">
        本画面の内容はデモです。記録の法的証拠性・広告表示の保証は行いません。
      </div>
    </div>
  );
}
