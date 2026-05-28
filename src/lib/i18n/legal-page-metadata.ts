import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n";

export type LegalPageKey =
  | "terms"
  | "privacy"
  | "acceptableUse"
  | "tokushoho"
  | "contact"
  | "about";

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
        "Viewtraceの個人情報の取得項目、利用目的、委託先、越境移転、保存期間、Cookie・GA4、利用者の権利について。",
    },
    en: {
      title: "Privacy Policy",
      description:
        "How Viewtrace handles personal data: collection, purposes, subprocessors, international transfers, retention, cookies, and your rights.",
    },
  },
  acceptableUse: {
    ja: {
      title: "許容される利用方針",
      description:
        "Viewtraceの許容される利用方針。禁止事項、URL・自動観測、記録の取り扱い。利用規約第8条と併せてご確認ください。",
    },
    en: {
      title: "Acceptable Use",
      description:
        "Viewtrace acceptable use policy: prohibited activities, URL monitoring, record handling. Read with Terms of Service Section 8.",
    },
  },
  tokushoho: {
    ja: {
      title: "特定商取引法に基づく表記",
      description:
        "Viewtraceの特商法表記。事業者情報、料金、支払、解約方法、返金、無料トライアルについて。",
    },
    en: {
      title: "Commercial Disclosure (Japan)",
      description:
        "Japan Act on Specified Commercial Transactions disclosures for Viewtrace: seller, pricing, payment, cancellation, and refunds.",
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
  about: {
    ja: {
      title: "私たちについて",
      description:
        "Viewtraceを運営する The Establish合同会社。ミッション、サービス概要、会社情報、お問い合わせ先。",
    },
    en: {
      title: "About us",
      description:
        "The Establish LLC, operator of Viewtrace: mission, product focus, company details, and contact.",
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
