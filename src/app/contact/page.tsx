import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocShell } from "@/components/legal/LegalDocShell";
import { contactEmail } from "@/lib/site";

export const metadata: Metadata = {
  title: "お問い合わせ | Viewtrace",
  description: "Viewtraceへのお問い合わせ窓口です。",
};

export default function ContactPage() {
  return (
    <LegalDocShell title="お問い合わせ" updated="2026年5月4日">
      <p>
        ご質問・ご相談は、下記メールアドレスまでお送りください。返信までにお時間をいただく場合があります。
      </p>
      <p className="text-lg font-semibold text-[var(--color-ink)]">
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
      </p>
      <p>
        <Link href="/">トップページへ戻る</Link>
      </p>
    </LegalDocShell>
  );
}
