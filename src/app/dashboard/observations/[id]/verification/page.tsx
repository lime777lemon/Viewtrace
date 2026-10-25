import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EvidenceReportSheet } from "@/components/dashboard/EvidenceReportSheet";
import { EvidenceReportObservationDetail } from "@/components/evidence-report/EvidenceReportObservationDetail";
import { observationAiAuditCopyFrom } from "@/lib/observation-ai-audit-copy";
import { loadObservationAiAudit } from "@/lib/observation-ai-audit-store";
import { ObservationNotVisible } from "@/components/dashboard/ObservationNotVisible";
import { PrintReportButton } from "@/components/dashboard/PrintReportButton";
import { getSession } from "@/lib/auth/session";
import { getObservationMergedForPlan, listObservationsForUrlIdentity } from "@/lib/demo/user-observations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildEvidenceReportFacts } from "@/lib/evidence-report";
import {
  loadEvidenceReportObservationDetails,
  type EvidenceReportObservationDetailData,
} from "@/lib/evidence-report-observation-detail";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import type { JourneyRunFacts } from "@/lib/observation-measure-ledger";
import {
  loadObservationScrollInteraction,
  loadObservationSyntheticInteraction,
} from "@/lib/observation-optional-metrics-store";
import { sanitizeObservationRouteId } from "@/lib/observation-route-id";
import {
  buildPublicVerifyUrlForObservation,
  ensureObservationVerifyTokenForUser,
} from "@/lib/observation-verify-token";
import { loadMonitoringRunForObservation } from "@/lib/monitoring-run-store";
import { readScreenshotRetentionDays } from "@/lib/screenshot-retention-store";
import { visibleSnapshotImageUrl } from "@/lib/observation-screenshot-retention";
import { getAppOriginForEmailLinks } from "@/lib/site";

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
  const aiAudit = await loadObservationAiAudit(supabase, session.userId, obs.id);
  const aiAuditCopy = observationAiAuditCopyFrom(td);
  const verifyToken = await ensureObservationVerifyTokenForUser(supabase, obs.id);
  const verifyUrl = verifyToken ? buildPublicVerifyUrlForObservation(verifyToken) : "—";
  const storedScroll = await loadObservationScrollInteraction(supabase, session.userId, obs.id);
  const storedSynthetic = await loadObservationSyntheticInteraction(supabase, session.userId, obs.id);
  const siblings = obs.regionValue ? await listObservationsForUrlIdentity(obs.url) : [];
  let journeyRuns: JourneyRunFacts[] = [];
  try {
    const checkRun = await loadMonitoringRunForObservation(supabase, session.userId, obs.id);
    journeyRuns = (checkRun?.journeyRuns ?? []).map((row) => ({
      region: row.region,
      deviceClass: row.deviceClass,
      status: row.status,
      steps: row.steps,
    }));
  } catch {
    journeyRuns = [];
  }
  const facts = buildEvidenceReportFacts({
    observation: obs,
    locale,
    siblings,
    session: storedScroll?.result.discovery?.session ?? null,
    behaviorTypes: storedScroll?.result.types ?? null,
    synthetic: storedSynthetic?.result ?? null,
    journeyRuns,
  });

  const capturedLabel = `${formatJaDateTime(obs.capturedAt, locale)} · ${formatUtcLabel(obs.capturedAt)}`;
  const retentionDays = await readScreenshotRetentionDays(session.userId, session.plan);

  /**
   * 提出用: 表紙の1ページサマリーのあとに、詳細画面と同じ内容をそのまま載せる。
   * 再計測はしない。保存済みの行だけ。
   */
  let detail: EvidenceReportObservationDetailData | null = null;
  try {
    const loaded = await loadEvidenceReportObservationDetails({
      admin: supabase,
      userId: session.userId,
      plan: session.plan,
      retentionDays,
      appOrigin: getAppOriginForEmailLinks(),
      rows: [{ id: obs.id, verifyToken }],
    });
    detail = loaded[0] ?? null;
  } catch (error) {
    console.warn("[verification-report] observation details unavailable", {
      message: error instanceof Error ? error.message : "details_failed",
    });
  }

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
    fieldSha256Hint: t.fieldSha256Hint,
    fieldContentHash: t.fieldContentHash,
    fieldVerifyUrl: t.fieldVerifyUrl,
    fieldStatus: t.fieldStatus,
    statusSuccess: td.statusSuccess,
    statusFailure: td.statusFailure,
    statusPending: td.statusPending,
    noScreenshot: t.noScreenshot,
    fieldRequested: t.fieldRequested,
    fieldObserved: t.fieldObserved,
    sectionReachability: t.sectionReachability,
    fieldHttp: t.fieldHttp,
    fieldFinalUrl: t.fieldFinalUrl,
    fieldPageTitle: t.fieldPageTitle,
    fieldDns: t.fieldDns,
    fieldTls: t.fieldTls,
    unmeasured: t.unmeasured,
    sectionDetected: t.sectionDetected,
    detectedHint: t.detectedHint,
    previousValue: t.previousValue,
    thisValue: t.thisValue,
    sectionBehavior: t.sectionBehavior,
    behaviorNote: t.behaviorNote,
    sectionJourney: t.sectionJourney,
    journeyNoSafeTarget: t.journeyNoSafeTarget,
    journeyIncomplete: t.journeyIncomplete,
    auditInference: t.auditInference,
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
      <div className="no-print mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
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
        status={obs.status}
        snapshotImageUrl={visibleSnapshotImageUrl(obs, retentionDays)}
        snapshotSha256={obs.snapshotSha256}
        contentHash={obs.contentHash}
        verifyUrl={verifyUrl}
        facts={facts}
        aiAudit={aiAudit}
        aiAuditCopy={aiAuditCopy}
        locale={locale}
        aiAuditGeneratedAtLabel={
          aiAudit
            ? `${formatJaDateTime(aiAudit.createdAt, locale)} · ${formatUtcLabel(aiAudit.createdAt)}`
            : undefined
        }
      />

      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6 sm:pb-20 print:break-before-page print:pb-0">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#276248]">{t.details}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t.detailsHint}</p>
        <div className="mt-4">
          {detail ? (
            <EvidenceReportObservationDetail data={detail} locale={locale} />
          ) : (
            <p className="rounded-2xl border border-dashed border-border bg-surface px-4 py-4 text-sm text-ink-muted">
              {t.detailsUnavailable}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
