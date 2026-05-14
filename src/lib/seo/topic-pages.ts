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
