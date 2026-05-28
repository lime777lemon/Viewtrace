import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocShell } from "@/components/legal/LegalDocShell";
import { copy } from "@/lib/i18n";
import { legalPageMetadata } from "@/lib/i18n/legal-page-metadata";
import { getRequestLocale } from "@/lib/i18n/locale-server";

function TokushohoExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      className="group inline-flex items-baseline gap-2 font-medium text-accent no-underline transition hover:text-accent-hover"
    >
      <span className="border-b border-accent/30 pb-0.5 transition group-hover:border-accent/60">
        {label}
      </span>
      <span aria-hidden className="text-sm opacity-50 transition group-hover:opacity-80">
        ↗
      </span>
    </a>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return legalPageMetadata("/tokushoho", "tokushoho", locale);
}

export default async function TokushohoPage() {
  const locale = await getRequestLocale();
  const t = copy[locale].tokushohoPage;

  return (
    <LegalDocShell locale={locale} title={t.pageTitle} updated="2026-05-28">
      <div className="callout space-y-3">
        {t.callouts.map((c, i) => (
          <p key={i}>
            <strong>{c.kicker}</strong> {c.body}
          </p>
        ))}
      </div>

      {t.sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2>{section.title}</h2>
          {section.paragraphs?.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {section.emailLink ? (
            <p>
              <a href={`mailto:${section.emailLink.address}`} className="underline">
                {section.emailLink.address}
              </a>
            </p>
          ) : null}
          {section.externalLink ? (
            <p>
              <TokushohoExternalLink
                href={section.externalLink.href}
                label={section.externalLink.label}
              />
            </p>
          ) : null}
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
          {section.footerLinks ? (
            <p>
              {section.footerLinks.map((link) => (
                <span key={link.href}>
                  {link.prefix}
                  <Link href={link.href} className="underline">
                    {link.label}
                  </Link>
                  {link.suffix}
                </span>
              ))}
            </p>
          ) : null}
        </section>
      ))}
    </LegalDocShell>
  );
}
