import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintReportButton } from "@/components/dashboard/PrintReportButton";
import { getSession } from "@/lib/auth/session";
import { getObservationMergedForPlan } from "@/lib/demo/user-observations";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";
import { copy } from "@/lib/i18n";
import { localizeObservationNote } from "@/lib/i18n/observation-persisted-copy";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import {
  OBSERVATION_CONTENT_HASH_VERSION,
  verifyObservationStoredHash,
} from "@/lib/observation-content-hash";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const session = await getSession();
  const locale = await getRequestLocale();
  const obs = session ? await getObservationMergedForPlan(id, session.plan) : undefined;
  const t = copy[locale].observationReport;
  return {
    title: obs ? `${t.title} · ${obs.id}` : t.title,
    robots: { index: false, follow: false },
  };
}

export default async function ObservationReportPage({ params }: Props) {
  const { id } = await params;
  const locale = await getRequestLocale();
  const t = copy[locale].observationReport;

  const session = await getSession();
  if (!session) notFound();
  const obs = await getObservationMergedForPlan(id, session.plan);
  if (!obs) notFound();

  const integrity = verifyObservationStoredHash(obs);
  const integrityLabel =
    integrity === "ok"
      ? locale === "ja"
        ? "一致"
        : "OK"
      : integrity === "missing"
        ? locale === "ja"
          ? "未設定"
          : "N/A"
        : integrity === "mismatch"
          ? locale === "ja"
            ? "不一致"
            : "MISMATCH"
          : "—";

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `@media print { .no-print { display: none !important; } }`,
        }}
      />
      <div className="no-print mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            href={`/dashboard/observations/${obs.id}`}
            className="font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
          >
            ← {t.back}
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <PrintReportButton label={t.print} />
          <p className="text-sm text-[var(--color-ink-muted)]">{t.printHint}</p>
        </div>
      </div>

      <article className="mx-auto max-w-3xl space-y-6 px-4 pb-12 sm:px-6 sm:pb-16">
        <header className="border-b border-[var(--color-border)] pb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            Viewtrace
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-[var(--color-ink)]">{t.title}</h1>
          <p className="mt-2 font-mono text-sm text-[var(--color-ink)]">{obs.id}</p>
          <p className="mt-4 text-sm text-[var(--color-ink-muted)]">{t.disclaimer}</p>
        </header>

        <section>
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">{t.sectionMeta}</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-[var(--color-ink-muted)]">{t.reportCaptured}</dt>
              <dd className="text-[var(--color-ink)]">
                {formatJaDateTime(obs.capturedAt)} · {formatUtcLabel(obs.capturedAt)}
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">{t.sectionUrl}</h2>
          <p className="mt-2 break-all font-mono text-sm text-[var(--color-ink)]">{obs.url}</p>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">{t.sectionRegion}</h2>
          <p className="mt-2 text-sm text-[var(--color-ink)]">
            {obs.regionLabel}
            {obs.regionValue ? ` (${obs.regionValue})` : ""}
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">{t.sectionStatus}</h2>
          <p className="mt-2 text-sm text-[var(--color-ink)]">{obs.status}</p>
        </section>

        {obs.pageTitle ? (
          <section>
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">{t.reportTitle}</h2>
            <p className="mt-2 text-sm text-[var(--color-ink)]">{obs.pageTitle}</p>
          </section>
        ) : null}

        <section>
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">{t.sectionNote}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-ink)]">
            {obs.note ? localizeObservationNote(obs.note, locale) : "—"}
          </p>
        </section>

        {obs.snapshotImageUrl ? (
          <section>
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">{t.reportSnapshotUrl}</h2>
            <p className="mt-2 break-all font-mono text-xs text-[var(--color-ink)]">{obs.snapshotImageUrl}</p>
          </section>
        ) : null}

        <section>
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">{t.sectionHashes}</h2>
          <dl className="mt-3 space-y-3 font-mono text-xs text-[var(--color-ink)]">
            <div>
              <dt className="text-[var(--color-ink-muted)]">
                {t.hashContent} (v{OBSERVATION_CONTENT_HASH_VERSION})
              </dt>
              <dd className="mt-1 break-all">{obs.contentHash ?? "—"}</dd>
              <dd className="mt-1 text-[var(--color-ink-muted)]">
                {t.reportIntegrity}: {integrityLabel}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-muted)]">{t.hashSnapshot}</dt>
              <dd className="mt-1 break-all">{obs.snapshotSha256 ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-muted)]">{t.hashPerceptual}</dt>
              <dd className="mt-1 break-all">{obs.snapshotPhash ?? "—"}</dd>
            </div>
            {typeof obs.snapshotBytes === "number" ? (
              <div>
                <dt className="text-[var(--color-ink-muted)]">{t.hashBytesType}</dt>
                <dd className="mt-1">
                  {obs.snapshotBytes} {obs.snapshotContentType ? `· ${obs.snapshotContentType}` : ""}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        {obs.events?.length ? (
          <section>
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">{t.sectionEvents}</h2>
            <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm text-[var(--color-ink)]">
              {obs.events.map((ev, i) => (
                <li key={`${ev.at}-${i}`}>
                  <span className="font-medium">{ev.label}</span>
                  {ev.detail ? (
                    <span className="mt-1 block text-[var(--color-ink-muted)]">{ev.detail}</span>
                  ) : null}
                  <span className="mt-1 block text-xs text-[var(--color-ink-muted)]">
                    {formatUtcLabel(ev.at)}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </article>
    </>
  );
}
