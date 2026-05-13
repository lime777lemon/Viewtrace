import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocShell } from "@/components/legal/LegalDocShell";
import { copy } from "@/lib/i18n";
import { legalPageMetadata } from "@/lib/i18n/legal-page-metadata";
import { getRequestLocale } from "@/lib/i18n/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return legalPageMetadata("/terms", "terms", locale);
}

export default async function TermsPage() {
  const locale = await getRequestLocale();
  const t = copy[locale].termsPage;

  return (
    <LegalDocShell locale={locale} title={t.pageTitle} updated="2026-05-04">
      <div className="callout space-y-3">
        {t.callouts.map((c, i) => (
          <p key={i}>
            <strong>{c.kicker}</strong> {c.body}
          </p>
        ))}
      </div>

      <p>{t.intro}</p>

      <section className="space-y-3">
        <h2>{t.s1.title}</h2>
        {t.s1.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </section>

      <section className="space-y-3">
        <h2>{t.s2.title}</h2>
        <p>{t.s2.listIntro}</p>
        <ul>
          {t.s2.listItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2>{t.s3.title}</h2>
        <p>{t.s3.listIntro}</p>
        <ul>
          {t.s3.listItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <p>
          {t.s3.acceptablePrefix}
          <Link href="/acceptable-use" className="underline">
            {t.s3.acceptableLink}
          </Link>
          {t.s3.acceptableSuffix}
        </p>
      </section>

      <section className="space-y-3">
        <h2>{t.s4.title}</h2>
        <p>{t.s4.listIntro}</p>
        <ul>
          {t.s4.listItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <p>{t.s4.liabilityCap}</p>
      </section>

      <section className="space-y-3">
        <h2>{t.s5.title}</h2>
        <p>{t.s5.body}</p>
      </section>

      {t.draftNotice ? (
        <div className="muted-box text-sm text-ink-muted">
          <p>{t.draftNotice}</p>
        </div>
      ) : null}
    </LegalDocShell>
  );
}
