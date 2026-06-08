import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ViewtraceLogo } from "@/components/brand/ViewtraceLogo";
import { ObservationNotVisible } from "@/components/dashboard/ObservationNotVisible";
import { PrintReportButton } from "@/components/dashboard/PrintReportButton";
import { getSession } from "@/lib/auth/session";
import { getObservationMergedForPlan } from "@/lib/demo/user-observations";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { sanitizeObservationRouteId } from "@/lib/observation-route-id";
import { formatVerificationReportCountry } from "@/lib/verification-report-country";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: idRaw } = await params;
  const id = sanitizeObservationRouteId(idRaw);
  const locale = await getRequestLocale();
  const t = copy[locale].observationVerificationReport;
  if (!id) {
    return { title: t.title, robots: { index: false, follow: false } };
  }
  const session = await getSession();
  const obs = session ? await getObservationMergedForPlan(id, session.plan) : undefined;
  return {
    title: obs ? `${t.title} · ${obs.id}` : t.title,
    robots: { index: false, follow: false },
  };
}

export default async function ObservationVerificationReportPage({ params }: Props) {
  const { id: idRaw } = await params;
  const id = sanitizeObservationRouteId(idRaw);
  if (!id) notFound();
  const locale = await getRequestLocale();
  const t = copy[locale].observationVerificationReport;

  const session = await getSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/dashboard/observations/${id}/verification`)}`);
  }
  const obs = await getObservationMergedForPlan(id, session.plan);
  if (!obs) {
    return (
      <ObservationNotVisible
        signedInEmail={session.email}
        observationId={id}
        locale={locale}
      />
    );
  }

  const capturedLabel = `${formatJaDateTime(obs.capturedAt)} · ${formatUtcLabel(obs.capturedAt)}`;
  const country = formatVerificationReportCountry(obs);

  const rows: { label: string; value: string; mono?: boolean }[] = [
    { label: t.fieldObservationId, value: obs.id, mono: true },
    { label: t.fieldUrl, value: obs.url, mono: true },
    { label: t.fieldCaptureTime, value: capturedLabel },
    { label: t.fieldCountry, value: country },
    { label: t.fieldSha256, value: obs.snapshotSha256?.trim() || "—", mono: true },
    { label: t.fieldPhash, value: obs.snapshotPhash?.trim() || "—", mono: true },
  ];

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              .no-print { display: none !important; }
              .verification-sheet {
                max-width: none !important;
                padding: 0 !important;
                box-shadow: none !important;
              }
              @page { size: A4 portrait; margin: 18mm; }
            }
          `,
        }}
      />
      <div className="no-print mx-auto max-w-2xl space-y-4 px-4 py-6 sm:px-6">
        <Link
          href={`/dashboard/observations/${obs.id}`}
          className="text-sm font-medium text-accent hover:text-accent-hover"
        >
          ← {t.back}
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <PrintReportButton label={t.print} />
          <p className="text-sm text-ink-muted">{t.printHint}</p>
        </div>
      </div>

      <article className="verification-sheet mx-auto max-w-2xl px-4 pb-16 sm:px-6 sm:pb-20 print:pb-0">
        <div className="rounded-2xl border border-border bg-surface-elevated px-6 py-8 shadow-sm print:border-0 print:shadow-none sm:px-8 sm:py-10">
          <header className="border-b border-border pb-6">
            <ViewtraceLogo className="h-7 w-auto sm:h-8" priority={false} />
            <h1 className="mt-4 font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              {t.title}
            </h1>
            <p className="mt-2 text-sm text-ink-muted">{t.subtitle}</p>
          </header>

          <dl className="mt-6 divide-y divide-border">
            {rows.map((row) => (
              <div key={row.label} className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {row.label}
                </dt>
                <dd
                  className={`text-sm text-ink ${row.mono ? "break-all font-mono text-xs leading-relaxed" : "leading-relaxed"}`}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-8 border-t border-border pt-6 text-xs leading-relaxed text-ink-muted">
            {t.disclaimer}
          </p>
        </div>
      </article>
    </>
  );
}
