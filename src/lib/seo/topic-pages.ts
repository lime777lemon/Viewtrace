import type { Locale } from "@/lib/i18n";

export const TOPIC_SLUGS = [
  "geo-screenshot-tool",
  "website-screenshot-from-another-country",
  "ad-verification-tool",
  "localized-qa",
  "geo-testing-tool",
  "how-to-check-website-from-another-country",
  "landing-page-qa",
  "proof-for-ad-agencies",
] as const;

export type TopicSlug = (typeof TOPIC_SLUGS)[number];

export function isTopicSlug(s: string): s is TopicSlug {
  return (TOPIC_SLUGS as readonly string[]).includes(s);
}

const LINK_LABEL: Record<Locale, Record<TopicSlug, string>> = {
  en: {
    "geo-screenshot-tool": "Geo screenshot tool",
    "website-screenshot-from-another-country": "Website screenshot from another country",
    "ad-verification-tool": "Ad verification tool",
    "localized-qa": "Localized QA",
    "geo-testing-tool": "Geo testing tool",
    "how-to-check-website-from-another-country": "How to check a website from another country",
    "landing-page-qa": "Landing page QA",
    "proof-for-ad-agencies": "Proof for ad agencies",
  },
  ja: {
    "geo-screenshot-tool": "Geo screenshot tool（地理別の画面取得）",
    "website-screenshot-from-another-country": "海外から見た自サイト（website screenshot from another country）",
    "ad-verification-tool": "広告表示の検証（ad verification tool）",
    "localized-qa": "ローカライズ・地域別QA（localized QA）",
    "geo-testing-tool": "地理テスト（geo testing tool）",
    "how-to-check-website-from-another-country": "他国からサイトを確認する方法",
    "landing-page-qa": "ランディングページの地域別QA（landing page QA）",
    "proof-for-ad-agencies": "代理店向けの根拠・証跡（proof for ad agencies）",
  },
};

export function getTopicSectionsForLanding(locale: Locale): {
  slug: TopicSlug;
  label: string;
  h1: string;
  paragraphs: string[];
}[] {
  return TOPIC_SLUGS.map((slug) => {
    const c = getTopicPageCopy(locale, slug);
    return {
      slug,
      label: LINK_LABEL[locale][slug],
      h1: c.h1,
      paragraphs: c.paragraphs,
    };
  });
}

/** トピックページ本体の相対パス（sitemap・内部リンクで共通利用） */
export function topicPagePath(slug: TopicSlug): string {
  return `/tools/${slug}`;
}

/** slug → 表示ラベル（関連リンク一覧などで利用） */
export function getTopicLinkLabels(locale: Locale): { slug: TopicSlug; label: string }[] {
  return TOPIC_SLUGS.map((slug) => ({ slug, label: LINK_LABEL[locale][slug] }));
}

/** トピック個別ページの共通UI文言（ロケール別） */
export const TOPIC_PAGE_UI: Record<
  Locale,
  {
    eyebrow: string;
    ctaPrimary: string;
    ctaSecondary: string;
    relatedTitle: string;
    faqTitle: string;
    screenshotTitle: string;
    screenshotCaption: string;
    backToHome: string;
    allTopics: string;
    breadcrumbHome: string;
  }
> = {
  en: {
    eyebrow: "Guide",
    ctaPrimary: "Start for free",
    ctaSecondary: "See pricing",
    relatedTitle: "Related topics",
    faqTitle: "Frequently asked questions",
    screenshotTitle: "See it in your dashboard",
    screenshotCaption:
      "Recent observations with URL, region, timestamp, and status—kept together in your workspace.",
    backToHome: "Back to home",
    allTopics: "All topics",
    breadcrumbHome: "Home",
  },
  ja: {
    eyebrow: "ガイド",
    ctaPrimary: "無料で始める",
    ctaSecondary: "料金を見る",
    relatedTitle: "関連トピック",
    faqTitle: "よくある質問",
    screenshotTitle: "実際のダッシュボード",
    screenshotCaption:
      "URL・地域・取得日時・ステータス付きの観測記録が、ワークスペースにまとまって蓄積されます。",
    backToHome: "トップへ戻る",
    allTopics: "トピック一覧",
    breadcrumbHome: "ホーム",
  },
};

type TopicBody = {
  metaTitle: string;
  metaDescription: string;
  h1: string;
  paragraphs: string[];
};

const EN: Record<TopicSlug, TopicBody> = {
  "geo-screenshot-tool": {
    metaTitle: "Geo screenshot tool — capture renders from real vantage points | Viewtrace",
    metaDescription:
      "A geo screenshot tool should attach URL, timestamp, and region—not a desktop grab. Viewtrace routes like users, then saves replayable visual evidence for teams.",
    h1: "Geo screenshot tool, built for evidence—not disposable captures",
    paragraphs: [
      "Teams searching for a geo screenshot tool usually need more than a PNG: they need to show what a page looked like from a specific country or state, at a specific time, with the same URL their users hit.",
      "Viewtrace is not a generic browser extension. You pick the region (for example a US state or a country), run an observation, and we store a timestamped visual record you can reopen, compare, and share when accountability questions arrive.",
    ],
  },
  "website-screenshot-from-another-country": {
    metaTitle: "Website screenshot from another country — routed captures | Viewtrace",
    metaDescription:
      "Get a website screenshot from another country with geo routing and a saved trail. Viewtrace pairs URL + region + time so stakeholders can trust what was live.",
    h1: "Website screenshot from another country—with a defensible trail",
    paragraphs: [
      "If you only need a one-off image, many proxies can help. If you need a website screenshot from another country that still makes sense next month—when a client asks “what did we actually show in-market?”—you want the capture tied to URL, region, and timestamp.",
      "Viewtrace records how the page rendered from the vantage point you chose, keeps history in your workspace, and supports scheduled runs so you are not re‑inventing the same proof every week.",
    ],
  },
  "ad-verification-tool": {
    metaTitle: "Ad verification tool — geo-routed visual proof | Viewtrace",
    metaDescription:
      "Use Viewtrace as an ad verification tool: save how landing pages and promos rendered by region, diff changes, and email your team when visuals drift.",
    h1: "Ad verification tool: show what the creative looked like in-market",
    paragraphs: [
      "An ad verification tool for modern teams is not just “did the tag fire?”—it is often “did the right hero, price, or legal line render for that geo?” Viewtrace captures the rendered page from the region you specify.",
      "Pair captures with history and optional email alerts when the visual changes meaningfully, so account and media teams can answer client questions with evidence instead of anecdotes.",
    ],
  },
  "localized-qa": {
    metaTitle: "Localized QA — shared truth across regions | Viewtrace",
    metaDescription:
      "Localized QA needs the same record shape in every market: URL, time, region, and a visual trail. Viewtrace stacks observations so product and marketing align.",
    h1: "Localized QA without losing the thread between markets",
    paragraphs: [
      "Localized QA breaks when every market uses a different folder naming scheme or a different moment in time. Viewtrace standardizes what you save: the URL, the vantage point, and when you fetched it.",
      "That shared structure is what lets distributed teams build shared truth—everyone opens the same observation, not ten versions of screenshot-final-v2.",
    ],
  },
  "geo-testing-tool": {
    metaTitle: "Geo testing tool — schedule and archive by region | Viewtrace",
    metaDescription:
      "A geo testing tool for landing pages and campaigns: run observations from chosen regions, archive results, and compare runs over time with Viewtrace.",
    h1: "Geo testing tool: repeat the same test, keep the receipts",
    paragraphs: [
      "Geo testing is only useful if you can repeat it. Viewtrace lets you re-run the same URL from the same region and keep a timeline—ideal when you are validating fixes or watching a rollout.",
      "Scheduled runs (Starter / Pro) add email digests so the team does not rely on someone remembering to “grab a screenshot.”",
    ],
  },
  "how-to-check-website-from-another-country": {
    metaTitle: "How to check a website from another country | Viewtrace",
    metaDescription:
      "How to check a website from another country: pick a region, run an observation, and save a timestamped capture. Viewtrace routes like users and stores proof.",
    h1: "How to check a website from another country (and prove what you saw)",
    paragraphs: [
      "The short answer: use a geo-routed fetch from the country or state you care about, then save the result with metadata you can revisit. VPNs alone rarely give you a durable audit trail.",
      "With Viewtrace you choose the observation region, run the check from your dashboard, and get a saved record with URL, time, and vantage point—so “how we checked it” is obvious to anyone who was not in the room.",
    ],
  },
  "landing-page-qa": {
    metaTitle: "Landing page QA — geo captures & diffs | Viewtrace",
    metaDescription:
      "Landing page QA for global campaigns: capture how the LP renders per region, compare runs, and export when stakeholders need proof.",
    h1: "Landing page QA that survives the launch meeting",
    paragraphs: [
      "Landing page QA for international traffic is not only copy review—it is “what did the hero and pricing block actually render in DE vs JP vs US-CA?” Viewtrace stores those renders as structured observations.",
      "When something changes, diffing and scheduled reruns help you catch regressions before they become a client escalation.",
    ],
  },
  "proof-for-ad-agencies": {
    metaTitle: "Proof for ad agencies — client-ready geo evidence | Viewtrace",
    metaDescription:
      "Proof for ad agencies: timestamped, geo-routed captures your team can resend, diff, and attach to reviews—not ad-hoc screenshots in Slack.",
    h1: "Proof for ad agencies: one trail, many stakeholders",
    paragraphs: [
      "Agencies live under explanation pressure: clients expect proof for ad agencies—not vibes. Viewtrace gives you repeatable captures from each market with timestamps and URLs baked in.",
      "Exports and longer retention on Pro help you attach evidence to approvals, QBRs, and follow-up threads without rebuilding the story each time.",
    ],
  },
};

const JA: Record<TopicSlug, TopicBody> = {
  "geo-screenshot-tool": {
    metaTitle: "Geo screenshot tool（地理別の画面取得）| Viewtrace",
    metaDescription:
      "地理ルートで取得した表示を、URL・時刻・地域付きで保存。単発の geo screenshot tool ではなく、説明責任に耐える証跡として使えます。",
    h1: "Geo screenshot tool としてではなく、証跡インフラとして",
    paragraphs: [
      "「geo screenshot tool」で探している多くの現場は、PNG そのものより **どの国・どの州の視点で・いつ・どの URL がどう見えたか** を示したいはずです。デスクトップの切り抜きだけでは、あとから説明が崩れやすいです。",
      "Viewtrace では地域を選びオブザベーションを実行すると、その条件でレンダリングされた状態をタイムスタンプ付きで保存します。再提示・照合・共有までを前提にした「地理別の取得」です。",
    ],
  },
  "website-screenshot-from-another-country": {
    metaTitle: "海外から見た自サイト（website screenshot from another country）| Viewtrace",
    metaDescription:
      "別国からの見え方を、website screenshot from another country として残すなら、ルートと時刻と URL をセットで。Viewtrace が観測記録として保持します。",
    h1: "Website screenshot from another country — いつの・どこ経由の画面かを残す",
    paragraphs: [
      "海外から自社サイトを見たいニーズは、単発のスクショより **いつの取得か** が問われます。Viewtrace は「website screenshot from another country」を、観測という形で履歴化します。",
      "キャンペーン LP やジオ向けページを、指定地域から繰り返し取得し、差分やメール通知（プランに応じて）まで含めて運用できます。",
    ],
  },
  "ad-verification-tool": {
    metaTitle: "広告・LP の表示検証（ad verification tool）| Viewtrace",
    metaDescription:
      "ad verification tool として、地域ごとのレンダリングを保存。クリエイティブが市場でどう見えていたかを、クライアントに提示しやすい形にします。",
    h1: "Ad verification tool — 市場で実際に描画された内容を残す",
    paragraphs: [
      "タグが発火したかだけでなく、「その地域のユーザーにヒーローや価格表示がどう見えていたか」まで含めて説明したい場面で、Viewtrace は ad verification tool 的な役割を果たします。",
      "取得結果はダッシュボードに蓄積され、視覚差分が大きいときだけ通知する設定など、運用に合わせたまわし方が選べます。",
    ],
  },
  "localized-qa": {
    metaTitle: "ローカライズ・地域別 QA（localized QA）| Viewtrace",
    metaDescription:
      "localized QA で市場ごとの表示を揃えて比較。国・州ごとに同じフォーマットの観測記録を積み上げ、チームの共通認識を作れます。",
    h1: "Localized QA — 市場横断でも記録の型をそろえる",
    paragraphs: [
      "localized QA が難しいのは、フォルダ名も取得タイミングもバラバラになるからです。Viewtrace は URL・地域・時刻を固定した観測として保存するので、比較と説明がしやすくなります。",
      "プロダクト・マーケ・制作が同じ一覧を見られることが、越境キャンペーンでの shared truth に繋がります。",
    ],
  },
  "geo-testing-tool": {
    metaTitle: "地理テスト（geo testing tool）| Viewtrace",
    metaDescription:
      "geo testing tool として同じ条件で再実行し、履歴を残す。修正検証やロールアウト監視に向いた観測の積み上げができます。",
    h1: "Geo testing tool — 同じルートで繰り返し、ログを残す",
    paragraphs: [
      "地理テストの価値は再現性にあります。Viewtrace では同じ URL を同じ地域から再観測し、タイムラインで追える geo testing tool 的な使い方ができます。",
      "Starter / Pro では日・週・月のスケジュール実行とメール通知も選べ、人手依存を減らせます。",
    ],
  },
  "how-to-check-website-from-another-country": {
    metaTitle: "他国からサイトを確認する方法（how to check website from another country）| Viewtrace",
    metaDescription:
      "how to check website from another country — 地域を選び、観測を実行し、記録として保存。VPN だけより説明負荷が下がる進め方です。",
    h1: "How to check website from another country — 手順と証跡まで",
    paragraphs: [
      "他国から見えを確認する典型はプロキシや VPN ですが、**あとから同じ条件を示せるか** が説明責任の分かれ目です。Viewtrace では地域を選んで観測し、結果をワークスペースに残します。",
      "ログイン後のダッシュボードから URL と地域を指定して実行できます。トライアルでボリューム感を試してから本番プランを選べます。",
    ],
  },
  "landing-page-qa": {
    metaTitle: "ランディングページの地域別 QA（landing page QA）| Viewtrace",
    metaDescription:
      "landing page QA を国・州単位で残す。ヒーローや価格ブロックの差分を、観測記録として積み上げられます。",
    h1: "Landing page QA — 国・地域ごとのレンダリングを観測として固定",
    paragraphs: [
      "landing page QA は文言校正だけでなく、「その市場のユーザーに実際どう描画されたか」まで含みます。Viewtrace は LP を地域経由で取得し、記録として保管します。",
      "差分や定期実行（プランによる）を組み合わせると、ローンチ後の回帰も見つけやすくなります。",
    ],
  },
  "proof-for-ad-agencies": {
    metaTitle: "代理店向けの根拠・証跡（proof for ad agencies）| Viewtrace",
    metaDescription:
      "proof for ad agencies — クライアントに再提示できる地理付きのビジュアル証跡。Slack の画像散らばりを減らし、説明の型をそろえます。",
    h1: "Proof for ad agencies — クライアントワークの説明負荷を下げる",
    paragraphs: [
      "代理店には「いつ・どの市場で・何を見せていたか」という proof for ad agencies が求められます。Viewtrace はその前提で、観測をインフラとして積み上げます。",
      "Pro では保持期間や CSV など、報告・稟議に使いやすい出力も選べます（プラン詳細はトップの料金を参照）。",
    ],
  },
};

export function getTopicPageCopy(locale: Locale, slug: TopicSlug): TopicBody {
  return locale === "ja" ? JA[slug] : EN[slug];
}

/* ------------------------------------------------------------------ */
/* 使い方ステップ（全トピック共通のプロダクトフロー）                    */
/* ------------------------------------------------------------------ */

export type HowStep = { title: string; body: string };

const HOW_IT_WORKS: Record<Locale, { title: string; steps: HowStep[] }> = {
  en: {
    title: "How it works",
    steps: [
      {
        title: "Pick your region",
        body: "Choose the country or state you want to observe from—so the capture matches what real users in that market see.",
      },
      {
        title: "Run an observation",
        body: "Enter the URL and Viewtrace captures how the page rendered from that vantage point.",
      },
      {
        title: "Save with metadata",
        body: "Every capture is stored with its URL, timestamp, and region, so it still makes sense weeks later.",
      },
      {
        title: "Compare or schedule",
        body: "Diff runs over time, or schedule reruns with email digests to catch visual drift (Starter / Pro).",
      },
    ],
  },
  ja: {
    title: "使い方",
    steps: [
      {
        title: "地域を選ぶ",
        body: "観測したい国・州を選択します。その市場の実ユーザーに近い見え方で取得できます。",
      },
      {
        title: "観測を実行",
        body: "URL を入力すると、その地点からページがどう描画されたかを取得します。",
      },
      {
        title: "メタ情報付きで保存",
        body: "URL・時刻・地域とセットで保存されるため、時間が経っても意味が失われません。",
      },
      {
        title: "比較・定期実行",
        body: "期間での差分比較や、視覚変化を検知するメール通知付きの定期実行が使えます（Starter / Pro）。",
      },
    ],
  },
};

export function getHowItWorks(locale: Locale): { title: string; steps: HowStep[] } {
  return HOW_IT_WORKS[locale];
}

/* ------------------------------------------------------------------ */
/* テーマ別 FAQ（FAQPage 構造化データにも利用）                          */
/* ------------------------------------------------------------------ */

export type TopicFaq = { q: string; a: string };

const FAQ_EN: Record<TopicSlug, TopicFaq[]> = {
  "geo-screenshot-tool": [
    {
      q: "How is this different from taking a screenshot behind a VPN?",
      a: "A VPN changes your exit IP but rarely stores the URL, timestamp, and region together. Viewtrace routes from the region you pick and saves a replayable record you can reopen and compare later.",
    },
    {
      q: "Can I capture from a specific US state or country?",
      a: "Yes. You choose the vantage point when you start an observation, and the capture is tied to that region.",
    },
    {
      q: "Do captures stay available after a campaign ends?",
      a: "Yes. Captures are stored in your workspace with history, so you can revisit or diff them later.",
    },
  ],
  "website-screenshot-from-another-country": [
    {
      q: "Why not just use a proxy for a one-off image?",
      a: "A proxy gives you a picture, not a defensible trail. Viewtrace pairs the image with URL, region, and timestamp so it still makes sense months later.",
    },
    {
      q: "Can I re-check the same page later?",
      a: "Yes. Re-run the same URL from the same country and keep a timeline of how it changed.",
    },
    {
      q: "How do I choose which country to view from?",
      a: "You pick the vantage point per observation from your dashboard; available regions are shown when you set up the run.",
    },
  ],
  "ad-verification-tool": [
    {
      q: "Does Viewtrace check whether my ad tag fired?",
      a: "It focuses on what actually rendered—hero, price, or legal line—from a given region. It is visual proof, not tag-firing analytics.",
    },
    {
      q: "Can I be alerted when a landing page changes?",
      a: "Yes. Scheduled reruns with email digests flag meaningful visual drift so you notice before a client does.",
    },
    {
      q: "Can I share the proof with clients?",
      a: "Yes. Reopen and export captures to attach to reviews and approvals.",
    },
  ],
  "localized-qa": [
    {
      q: "How does this help across many markets?",
      a: "Every market saves the same record shape—URL, region, and time—so teams compare like-for-like instead of scattered screenshots.",
    },
    {
      q: "Can product and marketing see the same records?",
      a: "Yes. Observations live in a shared workspace so everyone opens the same source of truth.",
    },
    {
      q: "Can I schedule checks per region?",
      a: "Yes, on Starter and Pro, with email digests summarizing each run.",
    },
  ],
  "geo-testing-tool": [
    {
      q: "Can I repeat the exact same test?",
      a: "Yes. Re-run the same URL from the same region and keep a timeline you can scroll through.",
    },
    {
      q: "Is there scheduling?",
      a: "Daily, weekly, and monthly scheduled runs are available on Starter and Pro.",
    },
    {
      q: "How do I validate that a fix rolled out correctly?",
      a: "Compare before-and-after observations from the affected region to confirm the change is live.",
    },
  ],
  "how-to-check-website-from-another-country": [
    {
      q: "What is the quickest way to check?",
      a: "Pick the country or state, run an observation on the URL, and save the timestamped capture from your dashboard.",
    },
    {
      q: "Isn't a VPN enough?",
      a: "A VPN can change the view but rarely leaves a durable, shareable trail. Viewtrace stores the URL, time, and region with each capture.",
    },
    {
      q: "Do I need to install anything?",
      a: "No. You run checks from your dashboard in the browser—no extension or local proxy required.",
    },
  ],
  "landing-page-qa": [
    {
      q: "What does landing page QA cover here?",
      a: "Beyond copy review, it captures what the hero and pricing block actually rendered per region.",
    },
    {
      q: "Can I catch regressions after launch?",
      a: "Yes. Diffs and scheduled reruns surface changes so you can act before they escalate.",
    },
    {
      q: "Can I export results for stakeholders?",
      a: "Yes. Print-ready reports and exports are available (Pro) for reviews and approvals.",
    },
  ],
  "proof-for-ad-agencies": [
    {
      q: "What kind of proof does it produce?",
      a: "Timestamped, geo-routed captures tied to the exact URL, repeatable for each market you report on.",
    },
    {
      q: "Can I attach evidence to client reviews?",
      a: "Yes. Exports and longer retention on Pro help with approvals, QBRs, and follow-up threads.",
    },
    {
      q: "Is this better than screenshots in Slack?",
      a: "Yes. You get one consistent trail per market instead of ad-hoc images scattered across channels.",
    },
  ],
};

const FAQ_JA: Record<TopicSlug, TopicFaq[]> = {
  "geo-screenshot-tool": [
    {
      q: "VPN 経由でスクショを撮るのと何が違いますか？",
      a: "VPN は出口 IP を変えるだけで、URL・時刻・地域をまとめて残すことは通常できません。Viewtrace は選んだ地域から取得し、あとで再表示・比較できる記録として保存します。",
    },
    {
      q: "特定の米国州や国を指定して取得できますか？",
      a: "はい。観測の開始時に地点を選ぶと、その地域に紐づいた形で取得されます。",
    },
    {
      q: "キャンペーン終了後も記録は残りますか？",
      a: "はい。記録は履歴付きでワークスペースに保存され、後から見返したり差分を取ったりできます。",
    },
  ],
  "website-screenshot-from-another-country": [
    {
      q: "単発の画像ならプロキシで十分では？",
      a: "プロキシで得られるのは画像だけで、根拠となる証跡は残りません。Viewtrace は画像を URL・地域・時刻とセットで保持するため、数か月後でも意味が通ります。",
    },
    {
      q: "同じページを後から再確認できますか？",
      a: "はい。同じ URL を同じ国から再取得し、どう変化したかをタイムラインで追えます。",
    },
    {
      q: "どの国から見るかはどう選びますか？",
      a: "観測ごとにダッシュボードで地点を選びます。設定時に利用可能な地域が表示されます。",
    },
  ],
  "ad-verification-tool": [
    {
      q: "広告タグが発火したか確認できますか？",
      a: "Viewtrace は「その地域で実際に何が描画されたか」（ヒーロー・価格・注記など）に注目します。タグ発火の計測ではなく、視覚的な証跡です。",
    },
    {
      q: "ランディングページの変化を通知できますか？",
      a: "はい。メール通知付きの定期実行で、意味のある視覚変化を検知し、クライアントより先に気づけます。",
    },
    {
      q: "証跡をクライアントに共有できますか？",
      a: "はい。取得結果を再表示・エクスポートして、レビューや承認に添付できます。",
    },
  ],
  "localized-qa": [
    {
      q: "多数の市場をまたぐときに役立ちますか？",
      a: "各市場で URL・地域・時刻という同じ型で保存するため、バラバラのスクショではなく同条件で比較できます。",
    },
    {
      q: "プロダクトとマーケが同じ記録を見られますか？",
      a: "はい。観測は共有ワークスペースに保存され、全員が同じ一次情報を開けます。",
    },
    {
      q: "地域ごとに定期チェックを組めますか？",
      a: "はい。Starter / Pro で、各実行を要約するメール通知付きの定期実行が使えます。",
    },
  ],
  "geo-testing-tool": [
    {
      q: "まったく同じテストを繰り返せますか？",
      a: "はい。同じ URL を同じ地域から再実行し、遡れるタイムラインとして残せます。",
    },
    {
      q: "スケジュール実行はありますか？",
      a: "Starter / Pro で日次・週次・月次の定期実行が使えます。",
    },
    {
      q: "修正が正しく反映されたかを検証するには？",
      a: "対象地域の実行前後の観測を比較し、変更が本番に反映されているか確認します。",
    },
  ],
  "how-to-check-website-from-another-country": [
    {
      q: "いちばん手早い確認方法は？",
      a: "国・州を選び、URL に対して観測を実行し、タイムスタンプ付きの記録をダッシュボードから保存します。",
    },
    {
      q: "VPN では不十分ですか？",
      a: "VPN は見え方を変えられますが、共有できる持続的な証跡は残りにくいです。Viewtrace は各記録に URL・時刻・地域を保存します。",
    },
    {
      q: "何かインストールが必要ですか？",
      a: "いいえ。ブラウザ上のダッシュボードから実行でき、拡張機能やローカルプロキシは不要です。",
    },
  ],
  "landing-page-qa": [
    {
      q: "ここでの LP QA は何を対象にしますか？",
      a: "文言校正だけでなく、ヒーローや価格ブロックが地域ごとに実際どう描画されたかまで取得します。",
    },
    {
      q: "ローンチ後の回帰も検知できますか？",
      a: "はい。差分と定期実行で変化を可視化し、大きくなる前に対処できます。",
    },
    {
      q: "関係者向けに出力できますか？",
      a: "はい。レビューや承認向けに、印刷用レポートやエクスポートが利用できます（Pro）。",
    },
  ],
  "proof-for-ad-agencies": [
    {
      q: "どんな証跡が得られますか？",
      a: "URL に紐づいた、タイムスタンプ・地理ルート付きの取得結果です。報告する各市場で繰り返し取得できます。",
    },
    {
      q: "クライアントレビューに証跡を添付できますか？",
      a: "はい。Pro のエクスポートや長い保持期間が、承認・QBR・フォローに役立ちます。",
    },
    {
      q: "Slack のスクショ共有より良いですか？",
      a: "はい。チャンネルに散らばる場当たり的な画像ではなく、市場ごとに一貫した1本の証跡になります。",
    },
  ],
};

export function getTopicFaqs(locale: Locale, slug: TopicSlug): TopicFaq[] {
  return (locale === "ja" ? FAQ_JA : FAQ_EN)[slug];
}
