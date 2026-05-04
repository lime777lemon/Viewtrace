export type Locale = "ja" | "en";

export const copy = {
  ja: {
    nav: {
      pricing: "料金",
      regionSearch: "地域で試す",
      faq: "よくある質問",
      login: "ログイン",
      trial: "無料トライアル",
    },
    hero: {
      title:
        "広告とランディングページが、特定の地域・特定の時刻にどう見えていたかを確認する。",
      subtitle:
        "地域ターゲティング向けキャンペーンの、タイムスタンプ付きビジュアル記録。",
      disclaimer: "保証ではありません。参照用のスナップショット記録です。",
      trial: "無料トライアル",
      sample: "サンプルを見る",
    },
    regionSearch: {
      title: "地域を選んで、確認したいページを探す",
      subtitle:
        "プランに応じた観測ポイントを選び、URL やキーワードを入力して条件を組み立てられます（デモ・本番はログイン後のオブザベーションで実行）。",
      planLabel: "カバレッジ",
      planStarter: "Starter",
      planPro: "Pro",
      planStarterHint: "米国の代表州＋主要国",
      planProHint: "米国全州＋主要国",
      regionLabel: "観測地域",
      regionAria: "観測する地域を選択",
      queryLabel: "URL またはキーワード",
      queryPlaceholder: "https://example.com/campaign など",
      submit: "この条件で確認",
      hint: "送信しても実際の取得は行われません。トライアル登録後に同様の条件でオブザベーションできます。",
      mockTitle: "条件プレビュー（イメージ）",
      mockSnapshot: "スナップショット",
      mockEmptyQuery: "（URL を入力するとここに表示イメージが出ます）",
      dashboardIntro:
        "ログイン中の環境です。プランに応じた観測ポイントと URL を組み合わせ、条件を確認できます（この画面ではスナップショットは取得しません）。",
      dashboardHint:
        "送信しても実際の取得は行われません。「新規オブザベーション」から同様の条件で実行できます。",
      dashboardCta: "新規オブザベーションへ →",
      previewLiveNote:
        "※ 実ページから取得したタイトル・画像です。選択した地域経由のスナップショットではありません。",
      previewLoading: "ページ情報・スナップショットを取得しています…（OG 画像が無いサイトは数十秒かかることがあります）",
      previewError: "ページ情報を取得できませんでした。URLを確認するか、下のリンクから直接開いてください。",
      previewOpenLive: "新しいタブで開いて確認",
      previewNotUrl:
        "URL 形式（例: theestablish.jp）で入力すると、タイトルや画像をここに表示できます。",
      recordAsObservation: "このWeb確認をオブザベーションに記録",
      recordAsObservationHint:
        "いま取得したタイトル・URL・地域を一覧に保存します（デモ・このブラウザのクッキー）。",
      recordAsObservationLogin: "登録して記録する",
      recordAsObservationLoginSuffix: "（ダッシュボードの一覧に保存）",
    },
    painIntro: "地域ターゲット広告は、静かに失敗することがある。",
    pains: [
      {
        title: "承認されたのに表示されない",
        body: "審査は通っても、対象地域のユーザーには表示されないことがあります。",
      },
      {
        title: "国や言語が誤って誘導される",
        body: "ジオターゲティングの不具合で、意図しないページへ送られることがあります。",
      },
      {
        title: "州ごとのコンテンツが読み込まれない",
        body: "地域別の表示が正しく出ないことがあります。",
      },
      {
        title: "クリック後のリダイレクトや404",
        body: "リンク切れは広告費と信頼の両方を損ないます。",
      },
    ],
    painFooter:
      "こうした表示の問題に気づかないままでも、クリックのたびに課金される広告では、その分の費用は積み上がります。",
    value: {
      title: "実ユーザーが見ていたであろう表示を記録する。",
      body:
        "選択した地域条件のもとで、広告・LPがどう表示されていたかをタイムスタンプ付きで取得します。",
      bullets:
        "プロキシ操作なし。推測なし。保証ではなく、記録された結果だけです。",
    },
    howTitle: "仕組み",
    steps: [
      { title: "URLを入力", body: "観測したいランディングページや広告のURLを指定します。" },
      {
        title: "地域を選択（米国／州）",
        body: "観測する地理的な位置を選びます。",
      },
      {
        title: "ビジュアル記録を取得",
        body: "指定条件でのタイムスタンプ付きスクリーンショットです。",
      },
      {
        title: "スクリーンショットと差分を確認",
        body: "複数の記録を比較し、問題を把握します。",
      },
    ],
    stepNote: "記録は取得時点の状態を表します。",
    useCasesTitle: "ユースケース",
    useCases: [
      {
        title: "デジタル広告代理店",
        body: "クライアントキャンペーンを地域横断で検証し、影響が出る前に問題を捕捉します。",
      },
      {
        title: "Shopify・DTCブランド",
        body: "ジオ向けプロモーションやLPが、海外顧客向けに正しく表示されているか確認します。",
      },
      {
        title: "SaaSマーケチーム",
        body: "地域キャンペーンの状況を監視し、ローカライズの不具合を調査します。",
      },
    ],
    midCta: {
      title: "場所ごとに、サイトが実際どう見えていたかを把握する。",
      subtitle: "単なる自動チェックではなく、検証可能なビジュアル記録。",
      body:
        "各オブザベーションは、特定の時刻・特定の場所から見た表示を記録します。",
    },
    pricingTitle: "料金",
    pricingSubtitle:
      "機能の有無ではなく、用途（試す／本番で回す）の違いで選べる2プランです。選択肢を絞り、迷いを減らす設計にしています。",
    pricingOverageTitle: "追加オブザベーション（従量）",
    pricingOverageBody:
      "月間上限を超えた場合、追加オブザベーションは $0.75 / 回で請求されます。枠超過後も取得は継続し、料金は次回インボイスに加算されます。",
    pricingTrialTitle: "無料トライアル",
    /** FAQ「無料トライアルはどのくらい使えますか？」と同一文言 */
    pricingTrialBody:
      "20回までオブザベーションを無料でお試しいただけます。クレジットカードは不要です。トライアル期間は14日間で、終了後は Starter または Pro を選択して継続いただけます。無料枠の20回を使い切ると、ログイン後のダッシュボード上部にお申し込み・プラン選択の案内が表示されます。",
    plans: [
      {
        name: "Starter",
        badge: null as string | null,
        price: "$49",
        period: "/ 月",
        description: "試す・軽い検証用途向け",
        subdescription: "マーケ担当・個人検証・小規模DTCなど、現実的な検証用途をカバー。",
        features: [
          "月80回のオブザベーション",
          "米国＋主要国",
          "7日間の保持",
          "フルページのビジュアルスナップショット",
          "ステータス履歴",
          "追加オブザベーション：$0.75 / 回",
        ],
        cta: "トライアルを開始",
      },
      {
        name: "Pro",
        badge: "人気",
        price: "$99",
        period: "/ 月",
        description: "本番運用・代理店・監査用途向け",
        subdescription: "記録数が多く、保持期間とレポートが重要なチーム向け。",
        features: [
          "月250回のオブザベーション",
          "米国全州＋主要国",
          "60日間の保持",
          "フルページのビジュアルスナップショット",
          "CSVエクスポート",
          "監査・レポート用途向け",
          "追加オブザベーション：$0.75 / 回",
        ],
        cta: "トライアルを開始",
      },
    ],
    observationNote:
      "オブザベーションとは、特定の時刻・特定の場所から見た、サイトの表示を検証したビジュアル記録です。",
    observationSub:
      "変更の検知だけでなく、地域ごとにユーザーが実際に見ていたものを記録します。",
    trialSignup: {
      title: "無料トライアルに登録",
      intro:
        "メールアドレスを送信すると登録が完了します。トライアル案内・連絡に使用します（Supabase に保存）。",
      emailLabel: "メールアドレス",
      placeholder: "you@company.com",
      submit: "無料トライアル",
      success: "登録を受け付けました。ありがとうございます。",
      error: "送信に失敗しました。しばらくしてから再度お試しください。",
      submitting: "送信中…",
    },
    faqTitle: "よくある質問",
    faqs: [
      {
        q: "Starter と Pro はどう使い分けますか？",
        a: "試す・軽い検証用途なら Starter。本番運用・代理店・監査用途で、より多くのオブザベーション・長い保持・CSVが必要なら Pro を想定しています。",
      },
      {
        q: "無料トライアルはどのくらい使えますか？",
        a: "20回までオブザベーションを無料でお試しいただけます。クレジットカードは不要です。トライアル期間は14日間で、終了後は Starter または Pro を選択して継続いただけます。無料枠の20回を使い切ると、ログイン後のダッシュボード上部にお申し込み・プラン選択の案内が表示されます。",
      },
      {
        q: "月間の回数を超えたらどうなりますか？",
        a: "追加オブザベーションは $0.75 / 回で、次回インボイスに加算されます。枠超過後もオブザベーションの取得は継続します。まずはトライアルでボリューム感を掴むのがおすすめです。",
      },
      {
        q: "広告が正常に動いている保証になりますか？",
        a: "いいえ。特定の時点・条件で取得した観測記録のみを提供します。",
      },
      {
        q: "何が得られますか？",
        a: "単純なチェックとは異なり、ユーザーが実際に見ていた表示を示します。特定の時刻・場所におけるサイトの見え方の検証記録です。",
      },
      {
        q: "いつでも解約できますか？",
        a: "はい。ダッシュボードからいつでも解約できます。",
      },
    ],
    checkout: {
      metaTitle: "お支払い | Viewtrace",
      title: "お支払い",
      subtitle: "月額プランのお申し込み（デモ）。内容を確認のうえ、テストカード情報でお試しください。",
      demoBanner:
        "これはデモの決済画面です。実際の課金は発生せず、Stripe 等の決済プロバイダは未接続です。",
      stripeLiveBanner:
        "Stripe が接続されています。以下から Stripe Checkout に進むと、テストモード／本番モードに応じて実際の決済処理が行われます。",
      orderSummary: "ご注文内容",
      planLabel: "プラン",
      monthly: "月額",
      billedMonthly: "毎月自動更新",
      taxNote: "消費税・為替・決済手数料は本番の決済画面で表示されます。",
      payment: "お支払い方法",
      stripeNote: "本番では Stripe などのPCI準拠のプロバイダで処理する想定です。",
      email: "請求先メール",
      cardholder: "カード名義",
      cardNumber: "カード番号",
      cardPlaceholder: "4242 4242 4242 4242",
      expiry: "有効期限",
      expiryPlaceholder: "MM / YY",
      cvc: "CVC",
      payButton: "カードで支払う（デモ）",
      payWithStripe: "Stripe Checkout に進む",
      stripePayPending: "Stripe へ移動中…",
      stripeCheckoutError: "Stripe Checkout の開始に失敗しました。環境変数と Stripe ダッシュボードの設定を確認してください。",
      payPending: "処理中…",
      back: "料金ページに戻る",
      termsAgree: "お支払いにより",
      termsLink: "利用規約",
      termsAgreeEnd: "に同意したものとみなされます。",
      errorEmail: "有効なメールアドレスを入力してください。",
      errorCard: "テスト用に 4242424242424242 など16桁の番号を入力してください。",
      errorExpiry: "有効期限を MM / YY 形式で入力してください。",
      errorCvc: "CVC を3桁以上で入力してください。",
      successTitle: "デモ決済が完了しました",
      successSubtitle: "本番ではここでサブスクリプションが有効化され、ダッシュボードへ案内されます。",
      stripeSuccessTitle: "Stripe Checkout が完了しました",
      stripeSuccessSubtitle:
        "サブスクリプションの反映は数分かかることがあります。Stripe ダッシュボードで状態を確認できます。",
      successCtaLogin: "ログイン",
      successCtaHome: "サイトトップへ",
      langJa: "日本語",
      langEn: "English",
    },
    footer: {
      tagline: "地域ターゲットキャンペーン向けのビジュアル記録。",
      product: "プロダクト",
      legal: "法的情報",
      support: "サポート",
      links: {
        pricing: "料金",
        faq: "よくある質問",
        terms: "利用規約",
        privacy: "プライバシーポリシー",
        acceptable: "許容される利用方針",
        tokushoho: "特定商取引法に基づく表記",
        contact: "お問い合わせ",
      },
      disclaimer:
        "結果は取得時点の観測を表し、継続的な表示・正確性・パフォーマンスを保証するものではありません。記録は参考情報であり、法的証拠としての完全性・正確性を保証するものではありません。広告配信の正常性を保証するものではなく、観測時点の状態のみを記録します。",
      rights: "© 2026 Viewtrace. All rights reserved.",
    },
  },
  en: {
    nav: {
      pricing: "Pricing",
      regionSearch: "Try by region",
      faq: "FAQ",
      login: "Log in",
      trial: "Free trial",
    },
    hero: {
      title:
        "See how your ads and landing pages appeared in a specific region at a specific time.",
      subtitle:
        "Timestamped visual records for geo-targeted campaigns.",
      disclaimer:
        "Not a guarantee. Snapshot records for reference only.",
      trial: "Free trial",
      sample: "View sample",
    },
    regionSearch: {
      title: "Pick a region, then search what to verify",
      subtitle:
        "Choose an observation point for your plan, enter a URL or keyword, and preview how you’d run a check (demo—real captures run after sign-in).",
      planLabel: "Coverage",
      planStarter: "Starter",
      planPro: "Pro",
      planStarterHint: "Representative US states + major countries",
      planProHint: "All US states + major countries",
      regionLabel: "Region",
      regionAria: "Select observation region",
      queryLabel: "URL or keyword",
      queryPlaceholder: "https://example.com/campaign",
      submit: "Preview this setup",
      hint: "Nothing is fetched here. After trial signup you can run observations with the same kind of setup.",
      mockTitle: "Setup preview (illustrative)",
      mockSnapshot: "Snapshot",
      mockEmptyQuery: "(Enter a URL to see a preview line here)",
      dashboardIntro:
        "You’re signed in. Combine a plan’s observation points with a URL to sanity-check your setup—no snapshots are taken on this screen.",
      dashboardHint:
        "Nothing is fetched here. Use New observation to run a capture with the same kind of setup.",
      dashboardCta: "New observation →",
      previewLiveNote:
        "Title and image are fetched from the live page—not a geo-routed snapshot.",
      previewLoading: "Fetching page info and snapshot… (sites without OG images may take up to a minute)",
      previewError: "Could not fetch page info. Check the URL or open it directly below.",
      previewOpenLive: "Open in new tab to verify",
      previewNotUrl: "Enter a URL (e.g. theestablish.jp) to show title and image here.",
      recordAsObservation: "Save this web check as an observation",
      recordAsObservationHint:
        "Stores the fetched title, URL, and region in your list (demo; cookie in this browser).",
      recordAsObservationLogin: "Sign up to record",
      recordAsObservationLoginSuffix: " (saved to your dashboard list)",
    },
    painIntro: "Geo-targeted ads can fail quietly.",
    pains: [
      {
        title: "Approved but not showing",
        body: "Even after review, users in the target region may never see the ad.",
      },
      {
        title: "Wrong country or language",
        body: "Geo bugs can send people to pages you did not intend.",
      },
      {
        title: "State-level content missing",
        body: "Regional variations may not load as expected.",
      },
      {
        title: "Post-click redirects and 404s",
        body: "Broken links cost spend and trust.",
      },
    ],
    painFooter:
      "If these display issues go unnoticed, click-based ads still charge for every click—so spend keeps adding up.",
    value: {
      title: "Record what real users likely saw.",
      body:
        "Under the region you choose, capture how ads and landing pages rendered—with timestamps.",
      bullets:
        "No proxy tricks. No guessing. Not a guarantee—just recorded results.",
    },
    howTitle: "How it works",
    steps: [
      { title: "Enter a URL", body: "Point to the landing page or ad destination you want to observe." },
      {
        title: "Pick a region (US / state)",
        body: "Choose the geographic vantage point for the observation.",
      },
      {
        title: "Capture a visual record",
        body: "Timestamped screenshots under your specified conditions.",
      },
      {
        title: "Review screenshots and diffs",
        body: "Compare multiple captures to spot issues.",
      },
    ],
    stepNote: "Each record reflects the state at capture time.",
    useCasesTitle: "Use cases",
    useCases: [
      {
        title: "Digital ad agencies",
        body: "Validate client campaigns across regions and catch problems early.",
      },
      {
        title: "Shopify & DTC brands",
        body: "Check geo promos and LPs for international shoppers.",
      },
      {
        title: "SaaS marketing teams",
        body: "Monitor regional campaigns and investigate localization issues.",
      },
    ],
    midCta: {
      title: "Know what the site actually looked like from each place.",
      subtitle: "Verifiable visual records—not a generic uptime ping.",
      body:
        "Every observation records the view from a specific time and location.",
    },
    pricingTitle: "Pricing",
    pricingSubtitle:
      "Two plans differentiated by how you use Viewtrace—not by locking core features. Fewer choices, clearer fit, better conversion.",
    pricingOverageTitle: "Additional observations (metered)",
    pricingOverageBody:
      "If you exceed your monthly allowance, additional observations are billed at $0.75 each and added to your next invoice. Observations continue after you’ve used your included quota.",
    pricingTrialTitle: "Free trial",
    pricingTrialBody:
      "Your trial includes up to 20 observations at no charge, with no credit card required. The trial lasts 14 days; afterward, choose Starter or Pro to continue. After you use all 20 trial observations, a banner at the top of the dashboard guides you to subscribe.",
    plans: [
      {
        name: "Starter",
        badge: null as string | null,
        price: "$49",
        period: "/ month",
        description: "Try-it-out & light validation",
        subdescription:
          "Marketers, solo checks, and small DTC brands—enough volume for real validation work.",
        features: [
          "80 observations / month",
          "US + major countries",
          "7-day retention",
          "Full-page visual snapshots",
          "Status history",
          "Additional observations: $0.75 each",
        ],
        cta: "Start trial",
      },
      {
        name: "Pro",
        badge: "Popular",
        price: "$99",
        period: "/ month",
        description: "Production, agencies & audit use",
        subdescription:
          "Higher volume, longer retention, and exports for teams that run this in workflows and reporting.",
        features: [
          "250 observations / month",
          "All US states + major countries",
          "60-day retention",
          "Full-page visual snapshots",
          "CSV export",
          "Built for audit & reporting",
          "Additional observations: $0.75 each",
        ],
        cta: "Start trial",
      },
    ],
    observationNote:
      "An observation is a visual verification of how a site appeared from a specific time and place.",
    observationSub:
      "We record what users in each region likely saw—not just that something changed.",
    trialSignup: {
      title: "Start your free trial",
      intro:
        "Submit your email to sign up. We’ll use it for trial follow-up (stored in Supabase).",
      emailLabel: "Email",
      placeholder: "you@company.com",
      submit: "Free trial",
      success: "Thanks—you’re on the list.",
      error: "Something went wrong. Please try again in a moment.",
      submitting: "Submitting…",
    },
    faqTitle: "FAQ",
    faqs: [
      {
        q: "How do I choose between Starter and Pro?",
        a: "Starter fits try-it-out and light validation. Pro fits production use, agencies, and audits—more observations, longer retention, and CSV when you need it.",
      },
      {
        q: "How does the free trial work?",
        a: "You can take up to 20 observations at no charge, with no credit card required. The trial lasts 14 days; afterward, choose Starter or Pro to continue. After you use all 20 trial observations, a banner at the top of the dashboard guides you to subscribe.",
      },
      {
        q: "What happens if I exceed the monthly allowance?",
        a: "Additional observations bill at $0.75 each and are added to your next invoice. Observations keep running after you’ve used your included quota. Use the trial to gauge volume before you commit.",
      },
      {
        q: "Is this a guarantee that ads are healthy?",
        a: "No. We only provide observations captured under specific times and conditions.",
      },
      {
        q: "What do I actually get?",
        a: "Unlike a simple check, you see what users likely experienced—a verifiable record of appearance at a time and place.",
      },
      {
        q: "Can I cancel anytime?",
        a: "Yes. Cancel anytime from your dashboard.",
      },
    ],
    checkout: {
      metaTitle: "Checkout | Viewtrace",
      title: "Checkout",
      subtitle:
        "Subscribe to a monthly plan (demo). Review your order and use test card details.",
      demoBanner:
        "This is a demo checkout. No real charges are made; no payment provider is connected yet.",
      stripeLiveBanner:
        "Stripe is connected. Continuing to Stripe Checkout will run real payment flows (test mode or live, depending on your Stripe keys).",
      orderSummary: "Order summary",
      planLabel: "Plan",
      monthly: "Monthly",
      billedMonthly: "Billed monthly",
      taxNote: "Taxes and fees will appear on the live checkout when connected.",
      payment: "Payment method",
      stripeNote: "In production, payments would be processed securely (e.g. Stripe).",
      email: "Billing email",
      cardholder: "Name on card",
      cardNumber: "Card number",
      cardPlaceholder: "4242 4242 4242 4242",
      expiry: "Expiry",
      expiryPlaceholder: "MM / YY",
      cvc: "CVC",
      payButton: "Pay with card (demo)",
      payWithStripe: "Continue to Stripe Checkout",
      stripePayPending: "Redirecting to Stripe…",
      stripeCheckoutError:
        "Could not start Stripe Checkout. Check environment variables and your Stripe Dashboard configuration.",
      payPending: "Processing…",
      back: "Back to pricing",
      termsAgree: "By paying you agree to the ",
      termsLink: "terms of service",
      termsAgreeEnd: ".",
      errorEmail: "Enter a valid email address.",
      errorCard: "Use a 16-digit test number such as 4242424242424242.",
      errorExpiry: "Enter expiry as MM / YY.",
      errorCvc: "Enter a CVC of at least 3 digits.",
      successTitle: "Demo payment complete",
      successSubtitle:
        "In production your subscription would activate here and you’d be sent to the dashboard.",
      stripeSuccessTitle: "Stripe Checkout complete",
      stripeSuccessSubtitle:
        "Subscription activation may take a few minutes. You can verify status in the Stripe Dashboard.",
      successCtaLogin: "Log in",
      successCtaHome: "Back to site",
      langJa: "日本語",
      langEn: "English",
    },
    footer: {
      tagline: "Visual records for geo-targeted campaigns.",
      product: "Product",
      legal: "Legal",
      support: "Support",
      links: {
        pricing: "Pricing",
        faq: "FAQ",
        terms: "Terms of service",
        privacy: "Privacy policy",
        acceptable: "Acceptable use",
        tokushoho: "Commercial disclosure (Japan)",
        contact: "Contact",
      },
      disclaimer:
        "Results reflect observations at capture time and do not guarantee ongoing rendering, accuracy, or performance. Records are for reference only; we do not warrant completeness or accuracy for use as legal evidence. We do not guarantee ad delivery health—only what was observed at capture time.",
      rights: "© 2026 Viewtrace. All rights reserved.",
    },
  },
} as const;
