import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewtraceLogo } from "@/components/brand/ViewtraceLogo";
import { readEvidenceReportShare, sanitizeEvidenceReportShareToken } from "@/lib/evidence-report-share";
import { parseEvidenceReportBody } from "@/lib/evidence-report-public-view";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { ObservationRegionReadout } from "@/components/dashboard/ObservationRegionReadout";
import { observationGeoCopyFrom } from "@/lib/observation-geo-readout";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";
import {
  composeWeeklyEvidenceReportForUser,
  type WeeklyEvidenceObservationRow,
} from "@/lib/scheduled-evidence-report-run";
import { evidenceFactCaptureConditions, evidenceReportPeriodStarting } from "@/lib/scheduled-evidence-report";
import { getAppOriginForEmailLinks } from "@/lib/site";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type TokenParams = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: TokenParams): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = copy[locale].publicEvidenceReport;
  const { token: tokenRaw } = await params;
  if (!sanitizeEvidenceReportShareToken(tokenRaw)) {
    return { title: t.title, robots: { index: false, follow: false } };
  }
  return {
    title: t.title,
    description: t.subtitle,
    robots: { index: false, follow: false },
  };
}

export default async function PublicEvidenceReportPage({ params }: TokenParams) {
  const { token: tokenRaw } = await params;
  const token = sanitizeEvidenceReportShareToken(tokenRaw);
  if (!token) notFound();
  const admin = createSupabaseAdminClient();
  const report = admin ? await readEvidenceReportShare(admin, token) : null;
  if (!report) notFound();

  const locale = await getRequestLocale();
  const t = copy[locale].publicEvidenceReport;
  const period = evidenceReportPeriodStarting(report.periodStart);
  let source = report.body;
  let rows: WeeklyEvidenceObservationRow[] = [];
  if (admin && report.userId && period) {
    try {
      const fresh = await composeWeeklyEvidenceReportForUser(
        admin,
        report.userId,
        period,
        getAppOriginForEmailLinks(),
      );
      if (fresh.observationCount > 0 && fresh.text.trim()) {
        source = fresh.text;
        rows = fresh.rows;
      }
    } catch (error) {
      console.warn("[evidence-report] public summary fell back to the sent text", {
        message: error instanceof Error ? error.message : "recompose_failed",
      });
    }
  }
  const view = parseEvidenceReportBody(source);
  const table = copy[locale].observationsTable;
  const detail = copy[locale].observationDetail;
  const geoCopy = observationGeoCopyFrom(detail);

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-surface-elevated">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="shrink-0">
            <ViewtraceLogo className="h-7 w-auto" priority={false} />
          </Link>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">{t.badge}</p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{report.subject}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t.subtitle}</p>
        {view.period ? <p className="mt-4 text-sm font-medium text-ink">{view.period}</p> : null}
        {view.notes.length > 0 ? (
          <div className="mt-3 space-y-1">
            {view.notes.map((note) => (
              <p key={note} className="text-sm leading-relaxed text-ink-muted">
                {note}
              </p>
            ))}
          </div>
        ) : null}
        {view.counts.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#276248]">{t.summary}</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              {view.counts.map((item) => (
                <div key={item.label} className="rounded-2xl border border-border bg-surface-elevated px-4 py-3">
                  <dt className="text-xs text-ink-muted">{item.label}</dt>
                  <dd className="mt-1 font-display text-2xl font-semibold text-ink">{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
        {rows.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#276248]">{t.weekRecords}</h2>
            <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface-elevated">
              <div className="overflow-x-auto">
                <table className="w-full min-w-208 text-left text-sm">
                  <thead className="border-b border-border bg-surface text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="px-4 py-3">{table.colCaptured}</th>
                      <th className="px-4 py-3">{table.colUrl}</th>
                      <th className="px-4 py-3">{table.colRegion}</th>
                      <th className="px-4 py-3">{t.screenshot}</th>
                      <th className="px-4 py-3">{table.colStatus}</th>
                      <th className="px-4 py-3 text-right">{table.colActions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row) => {
                      const statusLabel =
                        row.status === "success"
                          ? detail.statusSuccess
                          : row.status === "failure"
                            ? detail.statusFailure
                            : detail.statusPending;
                      const statusClass =
                        row.status === "success"
                          ? "bg-emerald-100 text-emerald-900"
                          : row.status === "failure"
                            ? "bg-red-100 text-red-900"
                            : "bg-amber-100 text-amber-900";
                      return (
                        <tr key={row.id} className="align-top">
                          <td className="px-4 py-3 text-ink-muted">
                            <span className="text-ink">{formatJaDateTime(row.capturedAt, locale)}</span>
                            <span className="mt-0.5 block text-[11px] text-ink-muted">{formatUtcLabel(row.capturedAt)}</span>
                          </td>
                          <td className="max-w-55 px-4 py-3 font-mono text-xs text-ink">
                            <span className="block min-w-0 truncate">{row.url}</span>
                          </td>
                          <td className="px-4 py-3 text-ink">
                            <ObservationRegionReadout
                              requestedLabel={row.regionLabel}
                              regionValue={row.regionValue}
                              captureConditions={evidenceFactCaptureConditions(row)}
                              copy={geoCopy}
                              locale={locale}
                              compact
                            />
                          </td>
                          <td className="max-w-56 px-4 py-3 text-xs leading-relaxed text-ink">{row.screenshot}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {row.detailUrl ? (
                              <Link href={row.detailUrl} className="text-accent hover:text-accent-hover">
                                {table.actionDetail}
                              </Link>
                            ) : (
                              <span className="text-ink-muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}
        {view.records.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#276248]">{t.records}</h2>
            <div className="mt-3 grid gap-3">
              {view.records.map((region) => (
                <article key={region.region} className="rounded-2xl border border-border bg-surface px-4 py-4 shadow-sm sm:px-5">
                  <h3 className="font-display text-base font-semibold text-ink">{region.region}</h3>
                  {region.notes.map((note) => (
                    <p key={note} className="mt-2 text-sm leading-relaxed text-ink-muted">
                      {note}
                    </p>
                  ))}
                  <div className="mt-4 grid gap-3">
                    {region.pages.map((page) => (
                      <div key={`${region.region}-${page.name}-${page.facts[0] ?? ""}`} className="border-t border-border pt-3">
                        <p className="text-sm font-semibold text-ink">{page.name}</p>
                        {page.facts.map((fact) => (
                          <p key={fact} className="mt-1 text-sm leading-relaxed text-ink-muted">
                            {fact}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
        {view.sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#276248]">{section.heading}</h2>
            <div className="mt-3 rounded-2xl border border-border bg-surface-elevated px-4 py-4">
              {section.lines.map((line) => (
                <p key={line} className="text-sm leading-relaxed text-ink">
                  {line}
                </p>
              ))}
            </div>
          </section>
        ))}
        <details className="mt-8 rounded-2xl border border-border bg-surface px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-ink">{t.source}</summary>
          <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-muted">{report.body}</pre>
        </details>
        <p className="mt-10 text-center text-xs text-ink-muted">
          <Link href="/" className="font-medium text-ink-muted hover:text-accent">
            Powered by Viewtrace
          </Link>
        </p>
      </main>
    </div>
  );
}
