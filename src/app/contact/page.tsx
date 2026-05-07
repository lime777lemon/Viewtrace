import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocShell } from "@/components/legal/LegalDocShell";
import { contactEmail } from "@/lib/site";
import { getRequestLocale } from "@/lib/i18n/locale-server";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "Viewtraceへのお問い合わせ窓口です。",
  alternates: { canonical: "/contact" },
  robots: { index: true, follow: true },
};

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
      <p className="text-lg font-semibold text-[var(--color-ink)]">
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
      </p>
      <p>
        <Link href="/">{locale === "en" ? "Back to home" : "トップページへ戻る"}</Link>
      </p>
    </LegalDocShell>
  );
}
