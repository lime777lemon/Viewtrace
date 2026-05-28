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
    <LegalDocShell locale={locale} title={t.pageTitle} updated="2026-05-28">
      <div className="callout space-y-3">
        {t.callouts.map((c, i) => (
          <p key={i}>
            <strong>{c.kicker}</strong> {c.body}
          </p>
        ))}
      </div>

      <p>{t.intro}</p>

      {t.sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2>{section.title}</h2>
          {section.paragraphs?.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {section.listIntro ? <p>{section.listIntro}</p> : null}
          {section.listItems ? (
            <ul>
              {section.listItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          ) : null}
          {section.footerLink ? (
            <p>
              {section.footerLink.prefix}
              <Link href={section.footerLink.href} className="underline">
                {section.footerLink.label}
              </Link>
              {section.footerLink.suffix}
            </p>
          ) : null}
        </section>
      ))}

    </LegalDocShell>
  );
}
