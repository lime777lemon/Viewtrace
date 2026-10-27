import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewtraceLogo } from "@/components/brand/ViewtraceLogo";
import { EvidenceReportObservationDetail } from "@/components/evidence-report/EvidenceReportObservationDetail";
import { PublicShareActions } from "@/components/verify/PublicShareActions";
import { ShareCollectionRecordSection } from "@/components/verify/ShareCollectionRecordSection";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { loadPublicShareCollectionRecords } from "@/lib/observation-share-collection";
import { sanitizeVerifyTokenParam } from "@/lib/observation-verify-token";

export const dynamic = "force-dynamic";

type TokenParams = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: TokenParams): Promise<Metadata> {
  const { token: tokenRaw } = await params;
  const token = sanitizeVerifyTokenParam(tokenRaw);
  const locale = await getRequestLocale();
  const t = copy[locale].publicShareCollection;
  if (!token) return { title: t.title, robots: { index: false, follow: false } };
  return {
    title: t.title,
    description: t.subtitle,
    robots: { index: false, follow: false },
  };
}

export default async function PublicShareCollectionPage({ params }: TokenParams) {
  const { token: tokenRaw } = await params;
  const token = sanitizeVerifyTokenParam(tokenRaw);
  if (!token) notFound();

  const locale = await getRequestLocale();
  const t = copy[locale].publicShareCollection;
  const tv = copy[locale].publicVerify;

  const collection = await loadPublicShareCollectionRecords(token);
  if (!collection) notFound();

  return (
    <div className="min-h-screen bg-surface">
      <style
        dangerouslySetInnerHTML={{
          __html: `@media print { .no-print { display: none !important; } }`,
        }}
      />
      <header className="border-b border-border bg-surface-elevated">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="shrink-0">
            <ViewtraceLogo className="h-7 w-auto" priority={false} />
          </Link>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">{t.badge}</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{t.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t.subtitle}</p>

        <PublicShareActions
          copyLabel={tv.copyShareUrl}
          copiedLabel={tv.shareCopied}
          failedLabel={tv.shareCopyFailed}
          printLabel={tv.savePdf}
        />

        <ol className="mt-10 space-y-4">
          {collection.records.map((record, index) => (
            <li key={record.obs.id} className="list-none">
              <ShareCollectionRecordSection
                heading={t.itemHeading
                  .replace("{n}", String(index + 1))
                  .replace("{total}", String(collection.records.length))}
                capturedLabel={`${formatJaDateTime(record.obs.capturedAt, locale)} · ${formatUtcLabel(record.obs.capturedAt)}`}
                regionLabel={record.obs.regionLabel}
                url={record.obs.url}
                showLabel={t.showRecord}
                hideLabel={t.hideRecord}
              >
                <EvidenceReportObservationDetail data={record} locale={locale} />
              </ShareCollectionRecordSection>
            </li>
          ))}
        </ol>

        <p className="mt-10 text-xs leading-relaxed text-ink-muted">{t.disclaimer}</p>
        <p className="mt-10 text-center text-xs text-ink-muted">
          <Link href="/" className="font-medium text-ink-muted hover:text-accent">
            Powered by Viewtrace
          </Link>
        </p>
      </main>
    </div>
  );
}
