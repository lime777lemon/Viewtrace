import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocShell } from "@/components/legal/LegalDocShell";
import { legalPageMetadata } from "@/lib/i18n/legal-page-metadata";
import { contactEmail } from "@/lib/site";
import { getRequestLocale } from "@/lib/i18n/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return legalPageMetadata("/contact", "contact", locale);
}

export default async function ContactPage() {
  const locale = await getRequestLocale();
  return (
    <LegalDocShell
      locale={locale}
      title={locale === "en" ? "Contact" : "お問い合わせ"}
      updated="2026-05-04"
    >
      <p>
        {locale === "en"
          ? "For questions or requests, email us below. Replies may take some time."
          : "ご質問・ご相談は、下記メールアドレスまでお送りください。返信までにお時間をいただく場合があります。"}
      </p>
      <p className="text-lg font-semibold text-ink">
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
      </p>
      <p>
        <Link href="/">{locale === "en" ? "Back to home" : "トップページへ戻る"}</Link>
      </p>
    </LegalDocShell>
  );
}
