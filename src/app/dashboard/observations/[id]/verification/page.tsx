import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EvidenceReportSheet } from "@/components/dashboard/EvidenceReportSheet";
import { ObservationNotVisible } from "@/components/dashboard/ObservationNotVisible";
import { PrintReportButton } from "@/components/dashboard/PrintReportButton";
import { getSession } from "@/lib/auth/session";
import { getObservationMergedForPlan } from "@/lib/demo/user-observations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { sanitizeObservationRouteId } from "@/lib/observation-route-id";
import {
  buildPublicVerifyUrlForObservation,
  ensureObservationVerifyTokenForUser,
} from "@/lib/observation-verify-token";
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
  const td = copy[locale].observationDetail;

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

  const supabase = await createSupabaseServerClient();
  const verifyToken = await ensureObservationVerifyTokenForUser(supabase, obs.id);
  const verifyUrl = verifyToken ? buildPublicVerifyUrlForObservation(verifyToken) : "—";

  const capturedLabel = `${formatJaDateTime(obs.capturedAt)} · ${formatUtcLabel(obs.capturedAt)}`;
  const country = formatVerificationReportCountry(obs);

  const reportCopy = {
    title: t.title,
    subtitle: t.subtitle,
    disclaimer: t.disclaimer,
    fieldObservationId: t.fieldObservationId,
    fieldUrl: t.fieldUrl,
    fieldCaptureTime: t.fieldCaptureTime,
    fieldCountry: t.fieldCountry,
    fieldScreenshot: t.fieldScreenshot,
    fieldSha256: t.fieldSha256,
    fieldContentHash: t.fieldContentHash,
    fieldVerifyUrl: t.fieldVerifyUrl,
    fieldStatus: t.fieldStatus,
    statusSuccess: td.statusSuccess,
    statusFailure: td.statusFailure,
    statusPending: td.statusPending,
    noScreenshot: t.noScreenshot,
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              .no-print { display: none !important; }
              .evidence-report-sheet {
                max-width: none !important;
                padding: 0 !important;
                box-shadow: none !important;
              }
              @page { size: A4 portrait; margin: 14mm; }
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
          <PrintReportButton label={t.generateButton} />
          <p className="text-sm text-ink-muted">{t.printHint}</p>
        </div>
        {verifyUrl !== "—" ? (
          <p className="text-sm text-ink-muted">
            {t.verifyUrlHint}{" "}
            <a href={verifyUrl} className="break-all font-mono text-xs text-accent hover:underline">
              {verifyUrl}
            </a>
          </p>
        ) : null}
      </div>

      <EvidenceReportSheet
        copy={reportCopy}
        observationId={obs.id}
        url={obs.url}
        capturedLabel={capturedLabel}
        country={country}
        status={obs.status}
        snapshotImageUrl={obs.snapshotImageUrl}
        snapshotSha256={obs.snapshotSha256}
        contentHash={obs.contentHash}
        verifyUrl={verifyUrl}
      />
    </>
  );
}
