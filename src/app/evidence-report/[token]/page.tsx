import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewtraceLogo } from "@/components/brand/ViewtraceLogo";
import { readEvidenceReportShare, sanitizeEvidenceReportShareToken } from "@/lib/evidence-report-share";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";
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

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-surface-elevated">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="shrink-0">
            <ViewtraceLogo className="h-7 w-auto" priority={false} />
          </Link>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">{t.badge}</p>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{report.subject}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t.subtitle}</p>
        <pre className="mt-8 whitespace-pre-wrap rounded-2xl border border-border bg-surface-elevated px-5 py-5 font-sans text-sm leading-relaxed text-ink sm:px-6">
          {report.body}
        </pre>
        <p className="mt-10 text-center text-xs text-ink-muted">
          <Link href="/" className="font-medium text-ink-muted hover:text-accent">
            Powered by Viewtrace
          </Link>
        </p>
      </main>
    </div>
  );
}
