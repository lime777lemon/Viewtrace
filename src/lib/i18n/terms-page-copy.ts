export type TermsPageSection = {
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

export type TermsPageCopy = {
  pageTitle: string;
  callouts: readonly { kicker: string; body: string }[];
  intro: string;
  sections: readonly TermsPageSection[];
};

export const termsPageCopyJa: TermsPageCopy = {
  pageTitle: "利用規約",
  callouts: [
    {
      kicker: "【法的リスク回避】",
      body:
        "本サービスの記録は参考情報であり、確認記録としての完全性・正確性を保証するものではありません。",
    },
    {
      kicker: "【広告用途向け】",
      body:
        "本サービスは広告配信の正常性を保証するものではなく、観測時点の状態のみを記録するものです。",
    },
  ],
  intro:
    "本サービス「Viewtrace」（以下「本サービス」）は、ユーザーが指定した URL について、特定の地域および時刻における表示状態のスナップショット記録を提供するものです。本利用規約（以下「本規約」）は、The Establish合同会社（以下「当社」）と本サービスを利用するお客様（以下「ユーザー」）との間の権利義務関係を定めます。",
  sections: [
    {
      title: "第1条（適用）",
      paragraphs: [
        "本規約は、本サービスの利用に関する当社とユーザーとの一切の関係に適用されます。",
        "ユーザーは、アカウント作成、有料プランの申込・決済、または本サービスの利用開始時点で、本規約および当社が別途定めるプライバシーポリシーその他のポリシーに同意したものとみなします。",
      ],
      footerLink: {
        prefix: "個人情報の取扱いは",
        href: "/privacy",
        label: "プライバシーポリシー",
        suffix: "をご確認ください。",
      },
    },
    {
      title: "第2条（定義）",
      listIntro: "本規約において、次の用語は次の意味を有します。",
      listItems: [
        "「記録」：本サービス上で生成・保存されるスナップショット、メタデータ、監査ログ等の出力一式",
        "「観測」：指定 URL を指定条件（地域等）で取得・記録する行為",
        "「自動観測」：ユーザーが設定したスケジュールに基づき当社が定期的に観測を実行する機能",
        "「プラン」：無料トライアル、Starter、Pro 等、当社が定める利用形態",
      ],
    },
    {
      title: "第3条（アカウント）",
      listIntro: "ユーザーは、次の事項を遵守するものとします。",
      listItems: [
        "登録情報を正確かつ最新の状態に保つこと",
        "アカウントの ID・パスワード等を適切に管理し、第三者に利用させないこと",
        "アカウントを通じて行われた行為について、当該ユーザー自身の行為とみなされることに同意すること",
      ],
      paragraphs: [
        "当社は、虚偽の登録、本規約違反、不正利用のおそれ、その他当社が不適切と判断する場合、事前通知なくアカウントの停止・削除等の措置を講じることがあります。",
      ],
    },
    {
      title: "第4条（サービス内容）",
      paragraphs: [
        "当社は、指定条件に基づくウェブページの表示記録を提供します。",
        "当該記録は取得時点の情報であり、継続的な表示、将来の表示、または正確性を保証するものではありません。",
        "本サービスは、リアルタイム監視、常時可用性の保証、または対象サイトの改ざん検知を目的とするものではありません。",
      ],
    },
    {
      title: "第5条（保証の否認）",
      listIntro: "当社は、本サービスについて、明示または黙示を問わず、次の事項を保証しません。",
      listItems: [
        "広告配信の正常性",
        "地域ターゲティングの正確性",
        "表示内容の完全性",
        "外部サービス（決済、キャプチャ、ホスティング、プロキシ等）の動作",
        "記録が裁判所、行政機関、広告プラットフォーム等において特定の効力を有すること",
      ],
    },
    {
      title: "第6条（ユーザーによる URL 等の指定）",
      paragraphs: [
        "ユーザーは、観測対象として指定する URL および関連コンテンツについて、監視・記録・共有に必要な権限を有し、適用法令および対象サイトの利用規約、robots.txt 等を遵守していることを表明し、保証します。",
        "ユーザーは、第三者の権利（著作権、商標権、プライバシー、パーソナルデータ保護等）を侵害しない方法で本サービスを利用するものとします。",
        "ユーザー指定の URL またはコンテンツに関する第三者からの請求・紛争について、当社の故意または重過失による場合を除き、ユーザーが自己の費用と責任で対応するものとします。",
      ],
    },
    {
      title: "第7条（記録・データの取扱い）",
      paragraphs: [
        "記録は、説明・照合・社内共有等のための参考情報として提供されます。法的証拠、監査証跡、コンプライアンス上の完全な記録としての効力を保証するものではありません。",
        "地域表示は、プロキシ、CDN、A/B テスト、端末差、ネットワーク状況等により、実際のエンドユーザー体験と異なる場合があります。",
        "スクリーンショット等の保存期間はプランに応じて定められ（例：Starter 7 日、Pro 60 日）、期間経過後は当社所定の方法により削除されます。",
        "自動観測およびメール通知は、技術的制約、対象サイトの応答、第三者サービスの障害等により、遅延・未達・欠落が生じ得ます。当社は best-effort で提供しますが、個別の配信・実行を保証しません。",
      ],
    },
    {
      title: "第8条（禁止事項）",
      listIntro: "ユーザーは、次の行為をしてはなりません。",
      listItems: [
        "法令または公序良俗に反する目的での利用",
        "違法なウェブサイトの監視、または主要目的が個人データの収集となる利用",
        "当社または第三者のサーバー・ネットワークに過度の負荷を与える行為",
        "スクレイピング、自動化、API 利用等の乱用",
        "本サービスのリバースエンジニアリング、再販、再提供、または競合目的での利用",
        "他のユーザーまたは第三者の権利を侵害する行為",
      ],
      footerLink: {
        prefix: "詳細は",
        href: "/acceptable-use",
        label: "許容される利用方針",
        suffix: "をご覧ください。",
      },
    },
    {
      title: "第9条（料金・サブスクリプション）",
      paragraphs: [
        "有料プランの料金、支払方法、支払時期、提供時期、解約・返金等は、料金ページおよび特定商取引法に基づく表記に定めるとおりとします。",
        "有料プランは、ユーザーが解約手続を完了しない限り、月額で自動更新されます。決済は Stripe 等の決済事業者を通じて処理されます。",
        "無料トライアルは、当社所定の期間・観測回数等の範囲で提供されます。内容は料金ページまたはアカウント画面に表示されるものとします。",
        "プラン上限を超える利用について、当社が従量課金を定めている場合、その単価および課金方法は料金ページに表示されるものとします。",
      ],
      footerLink: {
        prefix: "事業者情報・返金条件等は",
        href: "/tokushoho",
        label: "特定商取引法に基づく表記",
        suffix: "をご確認ください。",
      },
    },
    {
      title: "第10条（知的財産）",
      paragraphs: [
        "本サービスに関するプログラム、デザイン、商標、ドキュメント等の知的財産権は、当社または正当な権利者に帰属します。",
        "ユーザーが指定した URL、記録の内容、ユーザーがアップロードまたは入力した情報の権利は、ユーザーまたは正当な権利者に留保されます。",
        "ユーザーは、本サービスの提供・改善・サポート・セキュリティ確保に必要な範囲で、当社が当該情報を複製、保存、処理、表示することを許諾します。",
      ],
    },
    {
      title: "第11条（第三者サービス）",
      paragraphs: [
        "本サービスは、スクリーンショット取得、クラウドホスティング、データベース、決済、メール配信、地域ルーティング用プロキシ等の第三者サービスに依存します。",
        "第三者サービスの停止、仕様変更、障害、または利用制限により、本サービスの全部または一部が利用できなくなる場合があります。当社は、当社の故意または重過失による場合を除き、これによりユーザーに生じた損害について責任を負いません。",
      ],
    },
    {
      title: "第12条（責任の制限）",
      listIntro:
        "当社は、本サービスに関連してユーザーに生じた次の損害について、当社の故意または重過失による場合を除き、責任を負いません。",
      listItems: ["広告費の損失", "逸失利益", "間接損害、特別損害、結果的損害"],
      paragraphs: [
        "当社がユーザーに対して損害賠償責任を負う場合、その上限は、当該損害が発生した月にユーザーが当社に支払った利用料金（無料プランの場合は 0 円）の額とします。",
        "前項は、消費者契約法その他の強行法規により適用が制限される場合、この限りではありません。",
      ],
    },
    {
      title: "第13条（サービスの変更・中断・終了）",
      paragraphs: [
        "当社は、ユーザーへの事前通知のうえ、本サービスの内容、機能、プラン、価格を変更することがあります。法令上必要な場合または緊急を要する場合は、事後通知とすることがあります。",
        "メンテナンス、障害対応、セキュリティ上の必要等により、本サービスの全部または一部を一時中断することがあります。",
        "当社は、相当期間の通知のうえ、本サービスの提供を終了することができます。",
      ],
    },
    {
      title: "第14条（規約の変更）",
      paragraphs: [
        "当社は、必要に応じて本規約を変更できます。変更後の規約は、本サービス上への掲示その他当社所定の方法で告知した時点から効力を生じます。",
        "変更後にユーザーが本サービスを利用した場合、変更後の規約に同意したものとみなします。",
      ],
    },
    {
      title: "第15条（準拠法・管轄）",
      paragraphs: [
        "本規約の準拠法は日本法とします。",
        "本サービスまたは本規約に関して当社とユーザーとの間で紛争が生じた場合、東京地方裁判所を第一審の専属的合意管轄裁判所とします。",
      ],
    },
    {
      title: "第16条（お問い合わせ）",
      paragraphs: [
        "本規約に関するお問い合わせは、info@viewtrace.net までご連絡ください。",
        "運営者：The Establish合同会社（サービス名 Viewtrace）",
      ],
    },
  ],
};

export const termsPageCopyEn: TermsPageCopy = {
  pageTitle: "Terms of Service",
  callouts: [
    {
      kicker: "Reference for verification and sharing.",
      body:
        "Outputs are reference information. We do not warrant completeness or accuracy as confirmation records.",
    },
    {
      kicker: "Advertising workflows.",
      body:
        "Viewtrace does not guarantee ad delivery health; it records only what was observed at capture time.",
    },
  ],
  intro:
    "Viewtrace (the “Service”) provides timestamped snapshots of how a user-specified URL appeared in a specific region at a specific time. These Terms of Service (“Terms”) govern the relationship between The Establish LLC (“we”, “us”) and customers who use the Service (“you”).",
  sections: [
    {
      title: "1. Application",
      paragraphs: [
        "These Terms apply to all use of the Service.",
        "By creating an account, subscribing to a paid plan, or using the Service, you agree to these Terms and our Privacy Policy and other policies we publish.",
      ],
      footerLink: {
        prefix: "See our ",
        href: "/privacy",
        label: "Privacy Policy",
        suffix: " for how we handle personal data.",
      },
    },
    {
      title: "2. Definitions",
      listIntro: "In these Terms:",
      listItems: [
        "“Record” means snapshots, metadata, audit logs, and related outputs stored in the Service",
        "“Observation” means capturing and storing a specified URL under specified conditions (such as region)",
        "“Scheduled observation” means observations we run on a schedule you configure",
        "“Plan” means free trial, Starter, Pro, or other tiers we offer",
      ],
    },
    {
      title: "3. Accounts",
      listIntro: "You agree to:",
      listItems: [
        "keep registration information accurate and up to date",
        "protect credentials and not share account access with unauthorized parties",
        "accept responsibility for activity under your account",
      ],
      paragraphs: [
        "We may suspend or terminate accounts for false registration, violations, suspected abuse, or other conduct we deem inappropriate, with or without prior notice where permitted.",
      ],
    },
    {
      title: "4. Service",
      paragraphs: [
        "We provide visual records of web page rendering under specified conditions.",
        "Records reflect a point in time and do not guarantee ongoing availability or correctness.",
        "The Service is not real-time monitoring, uptime monitoring, or tamper detection for target sites.",
      ],
    },
    {
      title: "5. Disclaimer",
      listIntro: "We do not warrant, expressly or implicitly:",
      listItems: [
        "ad delivery health",
        "geo-targeting accuracy",
        "completeness of captured content",
        "behavior of third-party services (payments, capture, hosting, proxies, etc.)",
        "that records will have any particular legal or regulatory effect",
      ],
    },
    {
      title: "6. URLs you specify",
      paragraphs: [
        "You represent that you have the rights and permissions needed to monitor and record URLs you submit, and that you comply with applicable law and each target site’s terms, robots.txt, and similar rules.",
        "You will not use the Service in a way that infringes third-party rights (copyright, trademark, privacy, personal data, etc.).",
        "Except where caused by our willful misconduct or gross negligence, you will handle third-party claims relating to URLs or content you specify at your own cost.",
      ],
    },
    {
      title: "7. Records and data",
      paragraphs: [
        "Records are provided as reference information for explanation, reconciliation, and internal sharing. We do not warrant them as complete legal evidence or audit trails.",
        "Regional rendering may differ from end-user experience due to proxies, CDNs, A/B tests, devices, or network conditions.",
        "Retention depends on your plan (e.g., Starter 7 days, Pro 60 days) and records are deleted after the retention period.",
        "Scheduled observations and email notifications are provided on a best-effort basis and may be delayed, missed, or incomplete.",
      ],
    },
    {
      title: "8. Prohibited use",
      listIntro: "You must not:",
      listItems: [
        "use the Service for unlawful purposes",
        "monitor illegal sites or use the Service primarily to collect personal data",
        "impose excessive load on our or others’ systems",
        "abuse scraping, automation, or API access",
        "reverse engineer, resell, or repackage the Service for competing purposes",
        "infringe others’ rights",
      ],
      footerLink: {
        prefix: "See ",
        href: "/acceptable-use",
        label: "Acceptable Use",
        suffix: " for details.",
      },
    },
    {
      title: "9. Fees and subscriptions",
      paragraphs: [
        "Paid plan pricing, payment methods, timing, delivery, cancellation, and refunds are as stated on the pricing page and in our Japan commercial disclosure.",
        "Paid plans renew monthly unless you cancel. Payments are processed via Stripe or similar providers.",
        "Free trials are offered within limits shown on the pricing page or in your account.",
        "If we offer usage-based overage fees, rates are shown on the pricing page.",
      ],
      footerLink: {
        prefix: "See ",
        href: "/tokushoho",
        label: "Commercial Disclosure (Japan)",
        suffix: " for seller information and refund terms.",
      },
    },
    {
      title: "10. Intellectual property",
      paragraphs: [
        "We own (or license) the Service software, design, trademarks, and documentation.",
        "You retain rights in URLs you specify and content you submit; records reflect your specified targets.",
        "You grant us a license to copy, store, process, and display your content as needed to operate, secure, and improve the Service.",
      ],
    },
    {
      title: "11. Third-party services",
      paragraphs: [
        "The Service relies on third parties for capture, hosting, databases, payments, email, and geo-routing proxies.",
        "Outages or changes at those providers may affect the Service. Except for our willful misconduct or gross negligence, we are not liable for resulting harm.",
      ],
    },
    {
      title: "12. Limitation of liability",
      listIntro: "Except for our willful misconduct or gross negligence, we are not liable for:",
      listItems: ["ad spend loss", "lost profits", "indirect, special, or consequential damages"],
      paragraphs: [
        "If we are liable, our aggregate cap is the fees you paid us for the month in which the claim arose (zero for free plans).",
        "Mandatory consumer protection laws may limit the application of this section.",
      ],
    },
    {
      title: "13. Changes, suspension, termination",
      paragraphs: [
        "We may change features, plans, or pricing with advance notice where practicable.",
        "We may suspend the Service for maintenance, incidents, or security.",
        "We may discontinue the Service with reasonable notice.",
      ],
    },
    {
      title: "14. Changes to these Terms",
      paragraphs: [
        "We may update these Terms by posting them on the Service or by other reasonable means.",
        "Continued use after changes constitutes acceptance.",
      ],
    },
    {
      title: "15. Governing law and jurisdiction",
      paragraphs: [
        "These Terms are governed by the laws of Japan.",
        "The Tokyo District Court shall have exclusive jurisdiction in the first instance for disputes relating to the Service or these Terms.",
      ],
    },
    {
      title: "16. Contact",
      paragraphs: [
        "Questions about these Terms: info@viewtrace.net",
        "Operator: The Establish LLC (Service: Viewtrace)",
      ],
    },
  ],
};
