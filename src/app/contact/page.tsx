import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";
import { LegalDocShell } from "@/components/legal/LegalDocShell";
import { getContactPageCopy } from "@/lib/i18n/contact-page-copy";
import { legalPageMetadata } from "@/lib/i18n/legal-page-metadata";
import { getRequestLocale } from "@/lib/i18n/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return legalPageMetadata("/contact", "contact", locale);
}

export default async function ContactPage() {
  const locale = await getRequestLocale();
  const t = getContactPageCopy(locale);

  return (
    <LegalDocShell
      locale={locale}
      title={locale === "en" ? "Contact" : "お問い合わせ"}
      updated="2026-05-28"
    >
      <div className="max-w-xl space-y-8">
        <p className="text-base leading-relaxed text-ink-muted">{t.intro}</p>
        <ContactForm locale={locale} />
      </div>
    </LegalDocShell>
  );
}
