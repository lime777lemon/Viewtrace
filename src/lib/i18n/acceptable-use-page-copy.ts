export type AcceptableUsePageSection = {
  title: string;
  paragraphs?: readonly string[];
  listIntro?: string;
  listItems?: readonly string[];
  footerLink?: {
    prefix: string;
    href: string;
    label: string;
    suffix: string;
  };
  footerLinks?: readonly {
    prefix: string;
    href: string;
    label: string;
    suffix: string;
  }[];
  contactNotice?: {
    lead: string;
    orText: string;
    formLabel: string;
    end: string;
  };
};

export type AcceptableUsePageCopy = {
  pageTitle: string;
  callouts: readonly { kicker: string; body: string }[];
  intro: string;
  sections: readonly AcceptableUsePageSection[];
  closingPrefix: string;
  closingLinkLabel: string;
  closingSuffix: string;
};

export const acceptableUsePageCopyJa: AcceptableUsePageCopy = {
  pageTitle: "許容される利用方針",
  callouts: [
    {
      kicker: "【参考記録】",
      body:
        "本サービスが提供するスナップショットは観測時点の参考情報であり、広告配信の正常性や、確認記録としての完全性を保証するものではありません。",
    },
  ],
  intro:
    "本ポリシーは利用規約（特に第8条 禁止事項）と一体として適用されます。抵触する利用は、警告、機能制限、アカウント停止、利用契約の終了等の措置の対象となる場合があります。",
  sections: [
    {
      title: "想定される適正用途",
      listItems: [
        "自社または正当な権限に基づくキャンペーン・ランディングページの地域別表示確認",
        "広告・メディア運用における説明責任・社内共有のための証跡記録",
        "代理店・クライアントワークにおいて、契約上許可された範囲での確認・報告",
      ],
    },
    {
      title: "禁止される利用（例）",
      listIntro: "次に掲げる行為を含みますが、これらに限定されません。",
      listItems: [
        "法令または公序良俗に反する目的での利用",
        "違法サイトの監視、または個人情報の収集を主目的とした利用",
        "許可のない第三者サイト（競合サイトを含む）の継続監視・定期スクレイピング",
        "当社、対象サイト、または第三者のシステムに過剰な負荷を与える利用",
        "プラン上限の回避、レート制限・技術的制限の回避",
        "スクレイピング、自動化、API 利用、自動観測設定等の乱用",
        "本サービスのリバースエンジニアリング、再販、再提供、または競合目的での利用",
        "アカウントの共有、不正な複数アカウント、認証情報の第三者提供",
        "他のユーザーまたは第三者の権利（著作権、商標、プライバシー等）を侵害する行為",
      ],
    },
    {
      title: "URL・自動観測に関する目安",
      listItems: [
        "指定 URL について、監視・記録・共有に必要な権限があることを確認してから利用する",
        "対象サイトの robots.txt、利用規約、広告プラットフォーム規約および適用法を遵守する",
        "自動観測（定期実行）も手動観測と同様に本ポリシーおよびプラン上限の対象とする",
        "同一 URL への不合理な頻度・回数の設定など、対象サイトまたは当社インフラに過度な負荷を与えない",
      ],
    },
    {
      title: "記録の取り扱い",
      listItems: [
        "スクリーンショット等には、Cookie バナー、フォーム、第三者の個人情報等が写り込む場合がある",
        "記録の外部公開・再配布は、社内ポリシー、クライアント契約、適用法令に従う",
        "記録を裁判・行政手続等における唯一の証拠として扱わない（参考情報として利用する）",
      ],
      footerLink: {
        prefix: "個人情報の取扱いは",
        href: "/privacy",
        label: "プライバシーポリシー",
        suffix: "もご確認ください。",
      },
    },
    {
      title: "違反への対応",
      paragraphs: [
        "当社は、違反の内容・程度・再発の可能性等に応じて、警告、機能制限、アカウント停止、契約終了、関係機関への通報等の措置を講じることがあります。",
        "疑いがある利用については、調査のため一時的に機能を制限する場合があります。",
      ],
      contactNotice: {
        lead: "お問い合わせ・通報：",
        orText: "、または ",
        formLabel: "お問い合わせフォーム",
        end: "をご利用ください。",
      },
    },
    {
      title: "関連規約",
      footerLinks: [
        {
          prefix: "",
          href: "/terms",
          label: "利用規約",
          suffix: "",
        },
        {
          prefix: "・",
          href: "/privacy",
          label: "プライバシーポリシー",
          suffix: "",
        },
        {
          prefix: "・",
          href: "/tokushoho",
          label: "特定商取引法に基づく表記",
          suffix: "",
        },
      ],
    },
    {
      title: "本ポリシーの変更",
      paragraphs: [
        "当社は、必要に応じて本ポリシーを変更できます。重要な変更は、本サービス上への掲示その他合理的な方法で告知します。",
      ],
    },
  ],
  closingPrefix: "詳細・最新の条件は",
  closingLinkLabel: "利用規約全文",
  closingSuffix: "をご確認ください。",
};

export const acceptableUsePageCopyEn: AcceptableUsePageCopy = {
  pageTitle: "Acceptable Use",
  callouts: [
    {
      kicker: "Reference-only record.",
      body:
        "Snapshots are reference materials captured at a point in time. They do not guarantee ad delivery health, completeness, or legal evidentiary value.",
    },
  ],
  intro:
    "This policy applies together with our Terms of Service (especially Section 8, Prohibited use). Violations may result in warnings, feature limits, suspension, or termination.",
  sections: [
    {
      title: "Intended proper use",
      listItems: [
        "Geo/regional rendering checks for campaigns and landing pages you own or are authorized to monitor",
        "Evidence trails for internal reconciliation and accountability in ad/media workflows",
        "Agency/client work within contractual authorization",
      ],
    },
    {
      title: "Examples of prohibited use",
      listIntro: "Including but not limited to:",
      listItems: [
        "unlawful purposes or uses contrary to public order",
        "monitoring illegal sites or using the Service primarily to collect personal data",
        "ongoing monitoring of third-party sites (including competitors) without permission",
        "excessive load on our systems, target sites, or third parties",
        "circumventing plan limits, rate limits, or technical controls",
        "abuse of scraping, automation, APIs, or scheduled observation settings",
        "reverse engineering, reselling, repackaging, or competitive misuse of the Service",
        "account sharing, fraudulent multi-accounting, or sharing credentials",
        "infringing others’ rights (copyright, trademark, privacy, etc.)",
      ],
    },
    {
      title: "URLs & scheduled observations",
      listItems: [
        "confirm you have rights to monitor, record, and share each URL you submit",
        "comply with robots.txt, site terms, ad platform rules, and applicable law",
        "scheduled observations are subject to this policy and plan limits, same as manual runs",
        "do not configure unreasonable frequency or volume that imposes undue load",
      ],
    },
    {
      title: "Handling records",
      listItems: [
        "captures may include cookie banners, forms, or third-party personal data",
        "external sharing/redistribution must follow your policies, client contracts, and law",
        "do not treat records as the sole evidence in legal or regulatory proceedings",
      ],
      footerLink: {
        prefix: "See our ",
        href: "/privacy",
        label: "Privacy Policy",
        suffix: " for personal data handling.",
      },
    },
    {
      title: "Enforcement",
      paragraphs: [
        "We may warn, limit features, suspend accounts, terminate contracts, or notify authorities depending on severity and recurrence.",
        "We may temporarily restrict features while investigating suspected abuse.",
      ],
      contactNotice: {
        lead: "Contact / report: ",
        orText: ", or use our ",
        formLabel: "contact form",
        end: ".",
      },
    },
    {
      title: "Related policies",
      footerLinks: [
        {
          prefix: "",
          href: "/terms",
          label: "Terms of Service",
          suffix: "",
        },
        {
          prefix: ", ",
          href: "/privacy",
          label: "Privacy Policy",
          suffix: "",
        },
        {
          prefix: ", ",
          href: "/tokushoho",
          label: "Commercial Disclosure (Japan)",
          suffix: "",
        },
      ],
    },
    {
      title: "Changes",
      paragraphs: [
        "We may update this policy and will post material changes on the Service or notify you by reasonable means.",
      ],
    },
  ],
  closingPrefix: "For the latest conditions, see the ",
  closingLinkLabel: "full Terms of Service",
  closingSuffix: ".",
};
