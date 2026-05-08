import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n";

export type LegalPageKey =
  | "terms"
  | "privacy"
  | "acceptableUse"
  | "tokushoho"
  | "contact";

const SEO: Record<LegalPageKey, Record<Locale, { title: string; description: string }>> = {
  terms: {
    ja: {
      title: "利用規約",
      description:
        "Viewtrace（ビュートレース）の利用規約。スナップショットは確認・共有用の参照記録であり、確認記録としての完全性・正確性や広告配信の正常性を保証するものではありません。",
    },
    en: {
      title: "Terms of Service",
      description:
        "Viewtrace Terms of Service. Snapshots are reference records for verification and sharing; we do not warrant completeness, accuracy as confirmation records, or ad delivery health.",
    },
  },
  privacy: {
    ja: {
      title: "プライバシーポリシー",
      description:
        "Viewtraceにおける個人情報の取得項目、利用目的、第三者提供、保存期間、セキュリティについて。",
    },
    en: {
      title: "Privacy Policy",
      description:
        "How Viewtrace handles personal data: what we collect, purposes, sharing, retention, and security.",
    },
  },
  acceptableUse: {
    ja: {
      title: "許容される利用方針",
      description:
        "Viewtraceの許容される利用方針。禁止事項と適正利用の要点。利用規約第3条と併せてご確認ください。",
    },
    en: {
      title: "Acceptable Use",
      description:
        "Viewtrace acceptable use policy: prohibited activities and fair-use expectations. Read with the Terms of Service.",
    },
  },
  tokushoho: {
    ja: {
      title: "特定商取引法に基づく表記",
      description:
        "Viewtraceの特定商取引法に基づく表記（事業者情報・代金・支払・返品等）。",
    },
    en: {
      title: "Commercial Disclosure (Japan)",
      description:
        "Japan Act on Specified Commercial Transactions disclosures for Viewtrace: seller information, pricing, payment, and related terms.",
    },
  },
  contact: {
    ja: {
      title: "お問い合わせ",
      description: "Viewtraceへのお問い合わせ窓口です。",
    },
    en: {
      title: "Contact",
      description: "Contact Viewtrace for questions or support requests.",
    },
  },
};

/** Legal / footer-linked pages: title & description follow request locale (cookie or Accept-Language). */
export function legalPageMetadata(
  canonicalPath: string,
  key: LegalPageKey,
  locale: Locale,
): Metadata {
  const t = SEO[key][locale];
  return {
    title: t.title,
    description: t.description,
    alternates: { canonical: canonicalPath },
    robots: { index: true, follow: true },
  };
}
