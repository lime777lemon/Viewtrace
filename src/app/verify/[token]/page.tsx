import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewtraceLogo } from "@/components/brand/ViewtraceLogo";
import { PublicVerifySnapshot } from "@/components/verify/PublicVerifySnapshot";
import { VerifyViewBeacon } from "@/components/verify/VerifyViewBeacon";
import { fetchObservationForPublicVerify } from "@/lib/observation-public-verify";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { sanitizeVerifyTokenParam } from "@/lib/observation-verify-token";

export const dynamic = "force-dynamic";

type TokenParams = { params: Promise<{ token: string }> };
type Props = TokenParams;

export async function generateMetadata({ params }: TokenParams): Promise<Metadata> {
  const { token: tokenRaw } = await params;
  const locale = await getRequestLocale();
  const t = copy[locale].publicVerify;
  if (!sanitizeVerifyTokenParam(tokenRaw)) {
    return { title: t.title, robots: { index: false, follow: false } };
  }
  return {
    title: t.title,
    description: t.subtitle,
    robots: { index: false, follow: false },
  };
}

export default async function PublicVerifyPage({ params }: Props) {
  const { token: tokenRaw } = await params;
  const token = sanitizeVerifyTokenParam(tokenRaw);
  if (!token) notFound();

  const locale = await getRequestLocale();
  const t = copy[locale].publicVerify;
  const td = copy[locale].observationDetail;
  const sv = copy[locale].snapshotVisuals;

  const obs = await fetchObservationForPublicVerify(token);
  if (!obs) notFound();

  const capturedLabel = `${formatJaDateTime(obs.capturedAt, locale)} · ${formatUtcLabel(obs.capturedAt)}`;
  const statusLabel =
    obs.status === "success"
      ? td.statusSuccess
      : obs.status === "failure"
        ? td.statusFailure
        : td.statusPending;

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-surface-elevated">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="shrink-0">
            <ViewtraceLogo className="h-7 w-auto" priority={false} />
          </Link>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">{t.badge}</p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        <VerifyViewBeacon token={token} />
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{t.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t.subtitle}</p>

        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface-elevated">
          {obs.snapshotImageUrl ? (
            <PublicVerifySnapshot
              imageUrl={obs.snapshotImageUrl}
              labels={{
                viewFullscreen: sv.viewFullscreen,
                closeFullscreen: sv.closeFullscreen,
                fullscreenHint: sv.fullscreenHint,
              }}
            />
          ) : (
            <p className="px-4 py-12 text-center text-sm text-ink-muted">{t.noScreenshot}</p>
          )}
        </div>

        <dl className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface-elevated px-5 sm:px-6">
          <div className="grid gap-1 py-4 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {t.fieldTimestamp}
            </dt>
            <dd className="text-sm text-ink">{capturedLabel}</dd>
          </div>
          <div className="grid gap-1 py-4 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {t.fieldRegion}
            </dt>
            <dd className="text-sm text-ink">{obs.regionLabel}</dd>
          </div>
          <div className="grid gap-1 py-4 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {t.fieldStatus}
            </dt>
            <dd className="text-sm font-medium text-ink">{statusLabel}</dd>
          </div>
          <div className="grid gap-1 py-4 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {t.fieldSha256}
            </dt>
            <dd className="text-sm text-ink">
              <p className="break-all font-mono text-xs leading-relaxed">
                {obs.snapshotSha256?.trim() || "—"}
              </p>
              {obs.snapshotSha256?.trim() ? (
                <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{t.fieldSha256Hint}</p>
              ) : null}
            </dd>
          </div>
          <div className="grid gap-1 py-4 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {t.fieldObservationId}
            </dt>
            <dd className="break-all font-mono text-xs text-ink-muted">{obs.id}</dd>
          </div>
        </dl>

        <p className="mt-6 text-xs leading-relaxed text-ink-muted">{t.disclaimer}</p>
        <p className="mt-3">
          <Link
            href={`/verify/${token}/evidence.json`}
            className="text-sm font-semibold text-accent hover:text-accent-hover"
          >
            {t.evidenceJsonDownload}
          </Link>
        </p>

        <p className="mt-10 text-center text-xs text-ink-muted">
          <Link href="/" className="font-medium text-ink-muted hover:text-accent">
            Powered by Viewtrace
          </Link>
        </p>
      </main>
    </div>
  );
}
