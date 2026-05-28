export type TokushohoPageSection = {
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
  externalLink?: {
    href: string;
    label: string;
  };
  emailLink?: {
    address: string;
  };
};

export type TokushohoPageCopy = {
  pageTitle: string;
  callouts: readonly { kicker: string; body: string }[];
  sections: readonly TokushohoPageSection[];
};

export const tokushohoPageCopyJa: TokushohoPageCopy = {
  pageTitle: "特定商取引法に基づく表記",
  callouts: [
    {
      kicker: "【記録の性質】",
      body:
        "本サービスの記録は参考情報であり、確認記録としての完全性・正確性を保証するものではありません。広告配信の正常性を保証するものでもありません。",
    },
  ],
  sections: [
    {
      title: "事業者名",
      paragraphs: ["The Establish合同会社", "サービス名：Viewtrace"],
    },
    {
      title: "代表責任者",
      paragraphs: ["池田　優希子"],
    },
    {
      title: "所在地",
      paragraphs: ["東京都渋谷区道玄坂1-16-6 二葉ビル8b"],
    },
    {
      title: "連絡先",
      emailLink: { address: "info@viewtrace.net" },
      paragraphs: [
        "お問い合わせは上記メールにて受け付けます。電話番号の開示をご希望の場合は、法令に基づき遅滞なく対応いたします。",
      ],
    },
    {
      title: "コーポレートサイト",
      externalLink: { href: "https://theestablish.jp", label: "theestablish.jp" },
    },
    {
      title: "役務の内容",
      paragraphs: [
        "ユーザーが指定した URL について、特定の地域および時刻における表示状態のスナップショット記録をクラウド上で提供する SaaS です。",
        "プランにより、月間観測回数、保存期間、対応地域、自動観測・メール通知、CSV 出力等の機能が異なります。",
      ],
    },
    {
      title: "販売価格",
      paragraphs: [
        "各プランの価格は米ドル（USD）表示です。Starter $49/月、Pro $99/月 等、最新の金額は料金ページに記載します。",
        "プラン上限を超える観測について、従量単価を料金ページに表示している場合は、その単価に従い追加課金されることがあります。",
      ],
      footerLink: {
        prefix: "詳細は",
        href: "/#pricing",
        label: "料金",
        suffix: "をご確認ください。",
      },
    },
    {
      title: "商品代金以外の必要料金",
      listItems: [
        "消費税（適用される場合）",
        "インターネット接続に必要な通信費",
        "為替手数料等（カード会社・決済事業者による場合）",
      ],
    },
    {
      title: "支払方法",
      paragraphs: ["クレジットカード（Stripe 経由）"],
    },
    {
      title: "支払時期",
      listItems: [
        "有料プラン：申込時に初回決済。以降、1 ヶ月ごとに自動更新・自動決済",
        "解約手続完了後は、次回更新日以降の課金は停止（当該更新日まで利用可能な場合があります）",
      ],
    },
    {
      title: "無料トライアル",
      paragraphs: [
        "所定の期間・観測回数の範囲で無料トライアルを提供します（例：14 日間・観測 20 回まで。クレジットカード登録不要で開始可能）。",
        "有料プランへ申し込んだ時点から、選択プランに応じた課金が開始されます。",
      ],
    },
    {
      title: "提供時期",
      paragraphs: [
        "無料トライアル：アカウント作成後、直ちに利用可能",
        "有料プラン：決済完了後、直ちに利用可能",
      ],
    },
    {
      title: "解約方法",
      listIntro: "有料サブスクリプションは、次の方法で解約できます。",
      listItems: [
        "ログイン後、ダッシュボードの「設定」内「請求・解約」から解約（次回更新日での停止）",
        "同画面から Stripe 請求ポータルを開き、支払方法の変更・解約手続",
        "上記で解決しない場合：info@viewtrace.net までご連絡",
      ],
      footerLink: {
        prefix: "解約後も、",
        href: "/terms",
        label: "利用規約",
        suffix: "およびプランに定める保存期間に従いデータが取り扱われます。",
      },
    },
    {
      title: "返品・返金",
      paragraphs: [
        "デジタル役務の性質上、原則として返金には応じません。",
        "ただし、サービスに重大な不具合がある場合等、当社が妥当と判断したときは返金または代替対応を行うことがあります。",
      ],
    },
    {
      title: "不良品・不具合",
      paragraphs: [
        "サービスが契約内容に照らし著しく機能しない場合は、info@viewtrace.net までご連絡ください。調査のうえ、修正または当社判断による返金等に対応します。",
      ],
    },
    {
      title: "動作環境",
      paragraphs: [
        "インターネット接続およびモダンな Web ブラウザが必要です。詳細はサポートまたは FAQ をご参照ください。",
      ],
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
          suffix: "もあわせてご確認ください。",
        },
      ],
    },
  ],
};

export const tokushohoPageCopyEn: TokushohoPageCopy = {
  pageTitle: "Commercial Disclosure (Japan)",
  callouts: [
    {
      kicker: "Nature of records.",
      body:
        "Captures are reference-only and do not guarantee completeness, accuracy, or legal evidentiary value. We do not guarantee ad delivery health.",
    },
  ],
  sections: [
    {
      title: "Seller",
      paragraphs: ["The Establish LLC (Japan)", "Service: Viewtrace"],
    },
    {
      title: "Responsible person",
      paragraphs: ["Yukiko Ikeda"],
    },
    {
      title: "Address",
      paragraphs: ["1-16-6 Dogenzaka, Shibuya-ku, Tokyo 150-0043, Japan (Nitoba Building 8b)"],
    },
    {
      title: "Contact",
      emailLink: { address: "info@viewtrace.net" },
      paragraphs: [
        "Phone number is disclosed upon request in accordance with applicable laws.",
      ],
    },
    {
      title: "Corporate website",
      externalLink: { href: "https://theestablish.jp", label: "theestablish.jp" },
    },
    {
      title: "Service description",
      paragraphs: [
        "Cloud SaaS that records timestamped snapshots of user-specified URLs as rendered in selected regions.",
        "Plans differ by monthly observation limits, retention, regions, scheduled observations, email notifications, CSV export, etc.",
      ],
    },
    {
      title: "Price",
      paragraphs: [
        "Prices are shown in USD (e.g., Starter $49/month, Pro $99/month). See the pricing page for current amounts.",
        "If usage-based overage pricing is published, additional observations may be billed at the stated unit rate.",
      ],
      footerLink: {
        prefix: "See ",
        href: "/#pricing",
        label: "Pricing",
        suffix: " for details.",
      },
    },
    {
      title: "Additional fees",
      listItems: [
        "Consumption tax (if applicable)",
        "Internet connectivity costs",
        "FX or card fees charged by your payment provider (if any)",
      ],
    },
    {
      title: "Payment methods",
      paragraphs: ["Credit card via Stripe"],
    },
    {
      title: "Payment timing",
      listItems: [
        "Paid plans: charged at signup, then auto-renew monthly",
        "After cancellation is completed, billing stops from the next renewal date (access may continue until that date)",
      ],
    },
    {
      title: "Free trial",
      paragraphs: [
        "We offer a free trial within stated limits (e.g., 14 days and up to 20 observations; no credit card required to start).",
        "Paid plan charges begin when you subscribe to a paid tier.",
      ],
    },
    {
      title: "Delivery",
      paragraphs: [
        "Free trial: available immediately after account creation",
        "Paid plans: available immediately after payment succeeds",
      ],
    },
    {
      title: "How to cancel",
      listIntro: "You can cancel a paid subscription as follows:",
      listItems: [
        "Dashboard → Settings → Billing & cancellation (cancel at period end)",
        "Open the Stripe customer portal from the same screen to manage payment method or cancel",
        "If you need help: info@viewtrace.net",
      ],
      footerLink: {
        prefix: "After cancellation, data is handled per our ",
        href: "/terms",
        label: "Terms of Service",
        suffix: " and plan retention rules.",
      },
    },
    {
      title: "Refunds",
      paragraphs: [
        "Digital services are generally non-refundable.",
        "We may offer refunds or alternatives at our discretion, for example when there is a material service defect.",
      ],
    },
    {
      title: "Defects / malfunctions",
      paragraphs: [
        "If the Service materially fails to function as described, contact info@viewtrace.net. We will investigate and may fix the issue or offer a refund at our discretion.",
      ],
    },
    {
      title: "System requirements",
      paragraphs: [
        "Internet access and a modern web browser are required. See support or FAQ for details.",
      ],
    },
    {
      title: "Related policies",
      footerLinks: [
        {
          prefix: "See our ",
          href: "/terms",
          label: "Terms of Service",
          suffix: "",
        },
        {
          prefix: " and ",
          href: "/privacy",
          label: "Privacy Policy",
          suffix: ".",
        },
      ],
    },
  ],
};
