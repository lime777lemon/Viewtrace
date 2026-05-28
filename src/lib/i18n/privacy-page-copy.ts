export type PrivacyPageSection = {
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
};

export type PrivacyPageCopy = {
  pageTitle: string;
  callouts: readonly { kicker: string; body: string }[];
  intro: string;
  sections: readonly PrivacyPageSection[];
  contactIntro: string;
};

export const privacyPageCopyJa: PrivacyPageCopy = {
  pageTitle: "プライバシーポリシー",
  callouts: [
    {
      kicker: "【参考情報であることの確認】",
      body:
        "当社が生成・保存するスクリーンショット等はサービス提供のための記録であり、確認記録としての完全性・正確性を保証するものではありません。",
    },
  ],
  intro:
    "The Establish合同会社（以下「当社」）は、Viewtrace（以下「本サービス」）において取得する情報の取扱いについて、以下のとおり定めます。本ポリシーは、日本の個人情報保護法制を踏まえつつ、主に米国を含む海外からもご利用いただくサービスとして記載しています。",
  sections: [
    {
      title: "1. 運営者",
      paragraphs: [
        "事業者：The Establish合同会社（サービス名 Viewtrace）",
        "個人情報に関するお問い合わせ窓口：info@viewtrace.net",
      ],
      footerLink: {
        prefix: "事業者の表示は",
        href: "/tokushoho",
        label: "特定商取引法に基づく表記",
        suffix: "もご確認ください。",
      },
    },
    {
      title: "2. 取得する情報",
      listIntro: "当社は、本サービスの提供にあたり、次の情報を取得します。",
      listItems: [
        "アカウント情報（メールアドレス、認証用ユーザー ID、パスワードのハッシュ等）",
        "任意のプロフィール情報（氏名、会社名、電話番号等）",
        "利用設定（指定 URL、地域、自動観測スケジュール、通知設定等）",
        "生成・保存される記録（スクリーンショット、ページタイトル、ハッシュ値、監査ログ等）",
        "決済・契約情報（Stripe 経由のサブスクリプション状態等。クレジットカード番号は当社では保持しません）",
        "お問い合わせ内容（氏名、メールアドレス、件名、本文）",
        "技術情報（IP アドレス、ブラウザ種別、アクセスログ、認証・障害調査ログ、Cookie、言語設定等）",
        "分析情報（同意いただいた場合の Google Analytics によるサイト利用状況）",
      ],
    },
    {
      title: "3. 利用目的",
      listItems: [
        "本サービスの提供・維持・改善",
        "アカウント認証、セッション管理、言語設定の保持",
        "観測・自動観測の実行、結果の保存、メール通知",
        "料金プランの提供、課金、契約管理",
        "お問い合わせ・サポート対応",
        "不正利用の防止、セキュリティ確保、障害対応",
        "利用状況の分析（同意がある場合）および品質改善",
        "法令に基づく対応",
      ],
    },
    {
      title: "4. Cookie・分析",
      paragraphs: [
        "当社は、ログイン（Supabase Auth）、言語設定（vt_locale）、分析 Cookie の同意状態（viewtrace_ga_consent）等に Cookie を使用します。",
        "同意いただいた場合、Google Analytics（GA4）でサイトの利用状況を把握し、サービス改善に利用します。初回訪問時のバナーで分析 Cookie の許可・拒否を選べます。",
        "ホスティングの一環として Vercel Analytics / Speed Insights 等により、集計された利用状況やパフォーマンス指標が取得される場合があります。",
      ],
    },
    {
      title: "5. 委託先（処理の外部委託）",
      listIntro:
        "当社は、本サービスの運営に必要な範囲で、次の事業者等に情報の処理を委託します（委託先は変更される場合があります）。",
      listItems: [
        "Supabase — 認証、データベース",
        "Vercel — ホスティング、ストレージ（Blob）、分析",
        "Stripe — 決済・サブスクリプション管理",
        "Browserless 等 — スクリーンショット取得",
        "Bright Data 等 — 地域別ルーティング用プロキシ（設定時）",
        "Google — Google Analytics（同意がある場合）",
        "Resend 等 — トランザクションメール・問い合わせ通知",
      ],
      paragraphs: [
        "当社は、委託先に対し、契約または当社の指示に基づき、適切な安全管理が行われるよう努めます。",
      ],
    },
    {
      title: "6. 第三者提供",
      listIntro: "当社は、次の場合を除き、個人情報等を第三者に提供しません。",
      listItems: [
        "ユーザーの同意がある場合",
        "法令に基づく場合",
        "人の生命・身体・財産の保護のために必要で、本人同意が困難な場合",
        "サービス提供に必要な委託（前条）の範囲",
      ],
      paragraphs: [
        "決済処理（Stripe）および分析（Google Analytics、同意がある場合）への情報送信は、サービス提供のために必要な委託・連携として行います。",
      ],
    },
    {
      title: "7. 越境移転（国外での処理）",
      paragraphs: [
        "本サービスのインフラは主として米国等、日本国外のサーバーで運用されます。取得した情報は、日本国外で保存・処理される場合があります。",
        "当社は、委託先との契約、プライバシーポリシー、標準的な保護措置等により、国外移転に伴うリスクの低減に努めます。",
      ],
    },
    {
      title: "8. 保存期間",
      listItems: [
        "スクリーンショット等の記録：プランに応じた期間（例：Starter 7 日、Pro 60 日）経過後に削除",
        "アカウント情報：アカウント存続期間中。退会・削除請求後、合理的期間内に削除または匿名化",
        "決済・契約関連：法令および会計上必要な期間",
        "お問い合わせ：対応完了後、合理的期間内",
        "技術ログ・監査ログ：セキュリティ・障害対応のため、必要な期間",
      ],
    },
    {
      title: "9. スクリーンショットに含まれる情報",
      paragraphs: [
        "ユーザーが指定した URL の画面には、第三者の個人情報、Cookie バナー、フォーム、広告等が写り込む場合があります。",
        "当社は、本サービス提供のため当該記録を保存しますが、監視対象サイト上のデータについてデータ管理者となるものではありません。",
        "ユーザーは、指定 URL の監視・記録・共有が適法であり、社内ポリシーおよび対象サイトの条件に適合することを確認する責任を負います（利用規約もご参照ください）。",
      ],
      footerLink: {
        prefix: "",
        href: "/terms",
        label: "利用規約",
        suffix: "もご確認ください。",
      },
    },
    {
      title: "10. 利用者の権利",
      paragraphs: [
        "ユーザーは、当社所定の方法により、自己の情報について開示、訂正、削除等を求めることができます。",
        "分析 Cookie については、サイト上の同意バナーまたはブラウザ設定により、同意の撤回・拒否が可能です。",
        "カリフォルニア州在住者（CCPA/CPRA）：当社は、個人情報を販売しません。開示・削除等の請求は info@viewtrace.net までご連絡ください。",
        "欧州経済領域（EEA）等からアクセスする場合：適用法令に基づくアクセス、訂正、削除、処理制限、データポータビリティ、異議等の権利が適用される場合があります。",
      ],
    },
    {
      title: "11. 未成年",
      paragraphs: [
        "本サービスは、16 歳未満（または当地の法定年齢未満）の方を対象としておらず、故意に当該者から個人情報を取得しません。",
      ],
    },
    {
      title: "12. セキュリティ",
      paragraphs: [
        "当社は、アクセス制御、通信の保護、委託先管理など合理的な安全対策を実施しますが、完全な安全性を保証するものではありません。",
        "個人情報の漏えい等が判明した場合、法令に従い、必要に応じてユーザーおよび監督当局への通知等を行います。",
      ],
    },
    {
      title: "13. 本ポリシーの変更",
      paragraphs: [
        "当社は、必要に応じて本ポリシーを変更できます。重要な変更は、本サービス上への掲示その他合理的な方法で告知します。",
        "変更後のポリシーは、掲示した時点から効力を生じます。",
      ],
    },
  ],
  contactIntro: "本ポリシーに関するお問い合わせ：",
};

export const privacyPageCopyEn: PrivacyPageCopy = {
  pageTitle: "Privacy Policy",
  callouts: [
    {
      kicker: "Reference-only record.",
      body:
        "Screenshots and other outputs are stored to provide the Service. We do not warrant completeness, accuracy, or legal evidentiary value.",
    },
  ],
  intro:
    "The Establish LLC (“we”, “us”) describes how Viewtrace (the “Service”) handles information. This policy is written for users worldwide, including our primary audience in the United States, while we operate from Japan.",
  sections: [
    {
      title: "1. Operator",
      paragraphs: [
        "Operator: The Establish LLC (Service: Viewtrace)",
        "Privacy contact: info@viewtrace.net",
      ],
      footerLink: {
        prefix: "See also our ",
        href: "/tokushoho",
        label: "Commercial Disclosure (Japan)",
        suffix: " for seller information.",
      },
    },
    {
      title: "2. Information we collect",
      listIntro: "We collect the following categories of information:",
      listItems: [
        "Account data (email, authentication user ID, password hash, etc.)",
        "Optional profile data (name, company, phone, etc.)",
        "Service settings (URLs, regions, scheduled observation settings, notification preferences)",
        "Records we generate (screenshots, page titles, hashes, audit logs, etc.)",
        "Billing data via Stripe (subscription status, etc.; we do not store full card numbers)",
        "Contact form submissions (name, email, topic, message)",
        "Technical data (IP address, browser type, access logs, auth/diagnostic logs, cookies, locale)",
        "Analytics data via Google Analytics when you consent",
      ],
    },
    {
      title: "3. How we use information",
      listItems: [
        "Provide, maintain, and improve the Service",
        "Authenticate accounts, manage sessions, and remember preferences",
        "Run observations and scheduled observations; store results; send email notifications",
        "Bill subscriptions and manage plans",
        "Respond to support and contact requests",
        "Prevent abuse, secure the Service, and troubleshoot incidents",
        "Analyze usage (with consent) and improve quality",
        "Comply with law",
      ],
    },
    {
      title: "4. Cookies & analytics",
      paragraphs: [
        "We use cookies for sign-in (Supabase Auth), locale (vt_locale), and analytics consent (viewtrace_ga_consent).",
        "With your consent, we use Google Analytics (GA4) to understand site usage. You can accept or decline analytics cookies via the banner on first visit.",
        "Vercel Analytics / Speed Insights may collect aggregated usage and performance metrics as part of hosting.",
      ],
    },
    {
      title: "5. Service providers (processors)",
      listIntro: "We use the following categories of providers (which may change):",
      listItems: [
        "Supabase — authentication and database",
        "Vercel — hosting, blob storage, analytics",
        "Stripe — payments and subscriptions",
        "Browserless and similar — screenshot capture",
        "Bright Data and similar — geo-routing proxies when configured",
        "Google — Google Analytics when you consent",
        "Resend and similar — transactional and contact email",
      ],
      paragraphs: [
        "We require or expect appropriate safeguards through contracts and vendor policies.",
      ],
    },
    {
      title: "6. Disclosures to third parties",
      listIntro: "We do not sell personal information. We disclose information only:",
      listItems: [
        "with your consent",
        "when required by law",
        "to protect life, safety, or property when consent is impractical",
        "to service providers listed above as needed to operate the Service",
      ],
      paragraphs: [
        "Payment processing (Stripe) and analytics (Google Analytics, with consent) are handled as necessary integrations or processing.",
      ],
    },
    {
      title: "7. International transfers",
      paragraphs: [
        "Our infrastructure is primarily located outside Japan, including the United States. Your information may be stored and processed abroad.",
        "We use contractual and organizational measures to reduce risks associated with cross-border processing.",
      ],
    },
    {
      title: "8. Retention",
      listItems: [
        "Screenshot records: per plan limits (e.g., Starter 7 days, Pro 60 days), then deleted",
        "Account data: while your account is active; deleted or anonymized within a reasonable time after closure or deletion request",
        "Billing records: as required by law and accounting needs",
        "Contact inquiries: for a reasonable period after resolution",
        "Technical and audit logs: as needed for security and incident response",
      ],
    },
    {
      title: "9. Information inside screenshots",
      paragraphs: [
        "Pages you specify may contain third-party personal data, cookie banners, forms, ads, or other content.",
        "We store captures to operate the Service but are not the data controller for content on target websites.",
        "You are responsible for ensuring monitoring and sharing complies with law, your policies, and each site’s terms (see our Terms of Service).",
      ],
      footerLink: {
        prefix: "See our ",
        href: "/terms",
        label: "Terms of Service",
        suffix: ".",
      },
    },
    {
      title: "10. Your rights",
      paragraphs: [
        "You may request access, correction, or deletion of your information by contacting us.",
        "You can withdraw analytics consent via the site banner or browser settings.",
        "California residents (CCPA/CPRA): we do not sell personal information. Contact info@viewtrace.net for access or deletion requests.",
        "If you are in the EEA or UK, you may have additional rights under applicable law (access, rectification, erasure, restriction, portability, objection).",
      ],
    },
    {
      title: "11. Children",
      paragraphs: [
        "The Service is not directed to children under 16 (or the minimum age in your jurisdiction), and we do not knowingly collect their personal information.",
      ],
    },
    {
      title: "12. Security",
      paragraphs: [
        "We use reasonable safeguards such as access controls and encrypted transport, but cannot guarantee absolute security.",
        "If we become aware of a breach involving personal information, we will notify users and regulators as required by law.",
      ],
    },
    {
      title: "13. Changes to this policy",
      paragraphs: [
        "We may update this policy and will post material changes on the Service or notify you by reasonable means.",
        "Changes take effect when posted unless stated otherwise.",
      ],
    },
  ],
  contactIntro: "Privacy questions:",
};
