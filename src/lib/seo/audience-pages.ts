import type { Locale } from "@/lib/i18n";

/**
 * 相手別（代理店セグメント別）ランディングページのコピー。
 * 目的: 米国の広告・マーケ会社に「刺さる」訴求で、SEO/GEO と有料広告の着地を同時に強化する。
 * ルートは /for/[segment]（例: /for/agency, /for/performance-agency）。
 */
export const AUDIENCE_SLUGS = ["agency", "performance-agency"] as const;

export type AudienceSlug = (typeof AUDIENCE_SLUGS)[number];

export function isAudienceSlug(s: string): s is AudienceSlug {
  return (AUDIENCE_SLUGS as readonly string[]).includes(s);
}

/** 相手別ページの相対パス（sitemap・内部リンク・広告の最終URLで共通利用） */
export function audiencePagePath(slug: AudienceSlug): string {
  return `/for/${slug}`;
}

type Feature = { title: string; body: string };
type Faq = { q: string; a: string };

type AudienceBody = {
  /** ページ上部の小さなラベル */
  eyebrow: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  subhead: string;
  intro: string[];
  painTitle: string;
  pains: Feature[];
  valueTitle: string;
  values: Feature[];
  faqTitle: string;
  faqs: Faq[];
  ctaTitle: string;
  ctaBody: string;
  /** 検索/AI 向けの一言サマリ（llms.txt でも再利用） */
  summary: string;
};

/** 相手別ページ共通のUI文言（ロケール別） */
export const AUDIENCE_PAGE_UI: Record<
  Locale,
  {
    ctaPrimary: string;
    ctaSecondary: string;
    screenshotTitle: string;
    screenshotCaption: string;
    backToHome: string;
    breadcrumbHome: string;
    trustNote: string;
  }
> = {
  en: {
    ctaPrimary: "Start free — no credit card",
    ctaSecondary: "See pricing",
    screenshotTitle: "What your team sees",
    screenshotCaption:
      "Every observation keeps URL, region, timestamp, and status together—so anyone on the account can reopen the proof later.",
    backToHome: "Back to home",
    breadcrumbHome: "Home",
    trustNote: "Free trial · up to 20 observations · 14 days · no credit card",
  },
  ja: {
    ctaPrimary: "無料で始める（カード不要）",
    ctaSecondary: "料金を見る",
    screenshotTitle: "チームが見る画面",
    screenshotCaption:
      "各観測は URL・地域・取得日時・ステータスをまとめて保持。アカウントの誰でも、あとから証跡を開き直せます。",
    backToHome: "トップへ戻る",
    breadcrumbHome: "ホーム",
    trustNote: "無料トライアル・最大20観測・14日間・クレジットカード不要",
  },
};

const EN: Record<AudienceSlug, AudienceBody> = {
  agency: {
    eyebrow: "For advertising & marketing agencies",
    metaTitle:
      "Geo ad verification for agencies — client-ready proof of what rendered | Viewtrace",
    metaDescription:
      "Viewtrace helps US advertising and marketing agencies prove how ads and landing pages actually rendered in each region—timestamped, geo-routed captures with verify URLs and PDF reports clients trust.",
    h1: "Prove to clients what actually rendered—in every market you buy",
    subhead:
      "Viewtrace is the verification layer for agencies: geo-routed captures with timestamps and tamper-evident proof, packaged as client-ready verify URLs and PDF reports.",
    summary:
      "Viewtrace gives advertising and marketing agencies tamper-evident, geo-routed proof of how ads and landing pages rendered in each region—delivered as verify URLs and PDF reports for client reporting.",
    intro: [
      "Clients don't just ask “did it run?”—they ask “did the right creative, price, and legal line actually show for people in that market?” Screenshots in Slack and a VPN aren't an answer you can defend three months later.",
      "Viewtrace routes like a real user in the region you choose, captures how the page rendered, and stores it with the URL, timestamp, and an integrity check. You reopen, diff, and share it—so account teams answer with evidence instead of anecdotes.",
    ],
    painTitle: "Where agencies lose hours (and trust)",
    pains: [
      {
        title: "“It looked fine to me”",
        body: "Your team is in the US; the campaign runs in the UK, DE, or JP. A local VPN gives a picture, not a record you can stand behind in a QBR.",
      },
      {
        title: "Screenshots scattered across channels",
        body: "Proof lives in DMs, decks, and someone's desktop. When a client escalates, nobody can find the version that was actually live.",
      },
      {
        title: "No timeline when things change",
        body: "A price or hero swaps silently. Without dated, repeatable captures, you can't show when it changed—or that you caught it.",
      },
    ],
    valueTitle: "What Viewtrace gives your account teams",
    values: [
      {
        title: "Geo-routed captures, not desktop grabs",
        body: "Pick the country or US state and observe how the page rendered from that vantage point—tied to the exact URL.",
      },
      {
        title: "Tamper-evident proof",
        body: "Each observation carries a timestamp and integrity check, so “this is what showed, when” holds up under scrutiny.",
      },
      {
        title: "Client-ready verify URLs & PDF reports",
        body: "Share a link or export a report clients can open themselves—no more re-explaining what a Slack screenshot means.",
      },
      {
        title: "One trail per market, shared across the team",
        body: "Observations live in a shared workspace, so media, account, and creative all open the same source of truth.",
      },
    ],
    faqTitle: "Agency FAQ",
    faqs: [
      {
        q: "How is this different from a VPN or proxy screenshot?",
        a: "A VPN changes the view but rarely leaves a durable, shareable trail. Viewtrace routes from the region you pick and saves the URL, timestamp, and an integrity check with every capture—so it still holds up when a client asks weeks later.",
      },
      {
        q: "Can I show clients the proof without giving them a login?",
        a: "Yes. Each observation can produce a verify URL and a PDF report your client can open directly, without an account.",
      },
      {
        q: "Which regions can I capture from?",
        a: "You choose the vantage point per observation, including US states and countries. Available regions are shown when you set up a run.",
      },
      {
        q: "Can I white-label or export for reporting?",
        a: "Print-ready reports and exports are available (Pro) for reviews, approvals, and QBRs. Verify URLs carry light Viewtrace branding that also helps referrals.",
      },
      {
        q: "Do you charge per client or per seat?",
        a: "Plans are based on observation volume and retention, not per client—see pricing. Start free with up to 20 observations, no credit card.",
      },
    ],
    ctaTitle: "Give your next client review a trail, not a screenshot",
    ctaBody:
      "Start free and capture your first geo-routed proof in minutes. No credit card, up to 20 observations.",
  },
  "performance-agency": {
    eyebrow: "For performance & paid media agencies",
    metaTitle:
      "Landing page & ad proof for performance agencies — geo verification | Viewtrace",
    metaDescription:
      "Performance and paid media agencies use Viewtrace to verify that landing pages and offers rendered correctly by region—timestamped, geo-routed captures with alerts, verify URLs, and PDF proof.",
    h1: "Verify the landing page your budget is actually sending clicks to",
    subhead:
      "Viewtrace captures how your LPs and offers rendered from each region—so you catch broken geos and price mismatches before they burn spend, with proof you can hand to the client.",
    summary:
      "Viewtrace helps performance and paid media agencies verify that landing pages and offers rendered correctly per region, with timestamped geo-routed captures, drift alerts, verify URLs, and PDF reports.",
    intro: [
      "You optimize bids to the decimal, but the page the click lands on is a black box outside your own market. A broken hero, a geo-blocked offer, or a stale price in DE or JP quietly tanks conversion while spend keeps flowing.",
      "Viewtrace observes the live landing page from the region you're buying in, stores how it rendered with a timestamp and integrity check, and can alert you when the visual drifts—so you protect ROAS with evidence, not guesswork.",
    ],
    painTitle: "Where paid budgets leak silently",
    pains: [
      {
        title: "The LP breaks only in-market",
        body: "It renders fine from your desk, but a geo-gated script, currency, or consent wall changes what real users in the target region actually see.",
      },
      {
        title: "Offer or price mismatch by geo",
        body: "The ad promises one thing; the localized page shows another. You find out from a client's angry email, not your dashboard.",
      },
      {
        title: "No proof when a test tanks",
        body: "CVR drops and everyone blames the creative. Without dated captures of the page per region, you can't isolate what actually changed.",
      },
    ],
    valueTitle: "How Viewtrace protects performance",
    values: [
      {
        title: "Observe the LP from the buying region",
        body: "Capture how the exact landing URL rendered from the country or US state you're driving traffic to.",
      },
      {
        title: "Drift alerts on meaningful change",
        body: "Scheduled reruns with email digests flag visual changes—so you catch a broken geo before the next spend cycle (Starter / Pro).",
      },
      {
        title: "Repeatable geo tests with a timeline",
        body: "Re-run the same URL from the same region and keep a dated history to validate fixes and rollouts.",
      },
      {
        title: "Proof clients accept",
        body: "Verify URLs and PDF reports turn “trust me, the page was live” into something you can attach to the account.",
      },
    ],
    faqTitle: "Performance agency FAQ",
    faqs: [
      {
        q: "Does Viewtrace check whether my tag or pixel fired?",
        a: "It focuses on what actually rendered—hero, price, offer, legal line—from a given region. It's visual proof of the landing experience, complementary to tag-firing analytics, not a replacement.",
      },
      {
        q: "Can it alert me when a landing page changes?",
        a: "Yes. Scheduled reruns with email digests flag meaningful visual drift, so you notice a broken geo before it eats another spend cycle (Starter / Pro).",
      },
      {
        q: "Can I verify a competitor's or a client's geo-gated page?",
        a: "You can observe any public URL from the region you choose, subject to acceptable use. It's ideal for confirming your own client LPs render correctly in-market.",
      },
      {
        q: "How fast can I get a capture?",
        a: "Pick the region, enter the URL, and run an observation from your dashboard—no extension or local proxy needed.",
      },
      {
        q: "What does it cost to start?",
        a: "Free trial with up to 20 observations and no credit card. Paid plans scale with observation volume, retention, and scheduling—see pricing.",
      },
    ],
    ctaTitle: "Stop sending budget to a page you can't see",
    ctaBody:
      "Start free and verify your first geo-routed landing page in minutes. No credit card, up to 20 observations.",
  },
};

const JA: Record<AudienceSlug, AudienceBody> = {
  agency: {
    eyebrow: "広告・マーケティング代理店向け",
    metaTitle: "代理店向けの地域別・広告表示検証 — クライアントに出せる証跡 | Viewtrace",
    metaDescription:
      "Viewtrace は、広告・LP が各地域で実際にどう描画されたかを、タイムスタンプ・地理ルート・改ざん検知付きで保存。検証URLとPDFレポートで、代理店のクライアント報告を支えます。",
    h1: "「実際にどう見えていたか」をクライアントに証明する",
    subhead:
      "Viewtrace は代理店のための検証レイヤー。地理ルートで取得した表示を、タイムスタンプ・改ざん検知付きで保存し、クライアントに渡せる検証URLとPDFレポートにします。",
    summary:
      "Viewtrace は広告・マーケ代理店向けに、広告やLPが各地域でどう描画されたかを、地理ルート・タイムスタンプ・改ざん検知付きで証跡化し、検証URLとPDFレポートとして提供します。",
    intro: [
      "クライアントが知りたいのは「配信したか」だけではありません。「その市場のユーザーに、正しいクリエイティブ・価格・注記が本当に表示されたか」です。Slack のスクショや VPN では、3か月後に説明しきれません。",
      "Viewtrace は選んだ地域の実ユーザーのように経路を通し、描画結果を URL・時刻・改ざん検知とセットで保存します。再表示・差分・共有ができるので、担当者は感覚ではなく証跡で答えられます。",
    ],
    painTitle: "代理店が時間と信頼を失う場面",
    pains: [
      {
        title: "「こちらでは問題なく見えました」",
        body: "チームは米国、配信は英・独・日。現地VPNで得られるのは画像だけで、QBRで根拠として示せる記録にはなりません。",
      },
      {
        title: "スクショがあちこちに散らばる",
        body: "証跡がDM・資料・誰かのデスクトップに分散。クライアントから指摘が来た時、実際に出ていた版が見つかりません。",
      },
      {
        title: "変化のタイムラインが残らない",
        body: "価格やヒーローが静かに差し替わる。日付付きで再現できる取得がないと、いつ変わったか・気づいたかを示せません。",
      },
    ],
    valueTitle: "担当チームに渡せるもの",
    values: [
      {
        title: "デスクトップの切り抜きではなく地理ルート取得",
        body: "国・米国州を選び、その地点から実際にどう描画されたかを、正確な URL に紐づけて取得します。",
      },
      {
        title: "改ざん検知付きの証跡",
        body: "各観測にタイムスタンプと整合性チェックが付くため、「いつ・何が出ていたか」が精査に耐えます。",
      },
      {
        title: "クライアントに出せる検証URL・PDF",
        body: "リンク共有やレポート出力で、クライアント自身が開けます。スクショの意味を毎回説明する必要がありません。",
      },
      {
        title: "市場ごとに1本の証跡をチーム共有",
        body: "観測は共有ワークスペースに保存。メディア・アカウント・制作が同じ一次情報を開けます。",
      },
    ],
    faqTitle: "代理店向けFAQ",
    faqs: [
      {
        q: "VPN やプロキシのスクショと何が違いますか？",
        a: "VPN は見え方を変えられますが、共有できる持続的な証跡は残りにくいです。Viewtrace は選んだ地域から取得し、URL・時刻・整合性チェックを各記録に保存するので、後日クライアントに問われても通用します。",
      },
      {
        q: "ログインを渡さずにクライアントへ証跡を見せられますか？",
        a: "はい。各観測から検証URLとPDFレポートを生成でき、クライアントはアカウント無しで直接開けます。",
      },
      {
        q: "どの地域から取得できますか？",
        a: "観測ごとに地点を選べます（米国州や各国を含む）。設定時に利用可能な地域が表示されます。",
      },
      {
        q: "報告用にエクスポート／ホワイトラベルできますか？",
        a: "Pro で印刷用レポートやエクスポートが使えます（レビュー・承認・QBR向け）。検証URLには軽い Viewtrace の表示があり、紹介にもつながります。",
      },
      {
        q: "料金はクライアント単位・席単位ですか？",
        a: "プランは観測ボリュームと保持期間ベースで、クライアント単位ではありません（料金参照）。最大20観測まで無料・カード不要で始められます。",
      },
    ],
    ctaTitle: "次のレビューに、スクショではなく証跡を",
    ctaBody:
      "無料で始めて、最初の地理ルート証跡を数分で。カード不要・最大20観測。",
  },
  "performance-agency": {
    eyebrow: "運用型・パフォーマンスマーケ代理店向け",
    metaTitle: "運用型代理店向けのLP・広告検証 — 地域別の表示チェック | Viewtrace",
    metaDescription:
      "運用型・パフォーマンスマーケ代理店が、LPやオファーが地域ごとに正しく描画されたかを検証。地理ルート取得・タイムスタンプ・差分通知・検証URL・PDFで、無駄な配信を防ぎます。",
    h1: "予算がクリックを送っている“その LP”を、実際に確認する",
    subhead:
      "Viewtrace は LP やオファーが各地域でどう描画されたかを取得。地域別の表示崩れや価格不一致を、配信で溶かす前に検知し、クライアントに渡せる証跡にします。",
    summary:
      "Viewtrace は運用型・パフォーマンス代理店向けに、LPやオファーが地域ごとに正しく描画されたかを、地理ルート取得・タイムスタンプ・差分通知・検証URL・PDFで検証します。",
    intro: [
      "入札は小数点まで最適化しても、クリックの着地先は自分の市場外ではブラックボックス。独や日でヒーローの崩れ・地域ブロックのオファー・古い価格が、コンバージョンを静かに落とし続けます。",
      "Viewtrace は配信している地域から実際のLPを観測し、描画結果をタイムスタンプ・整合性チェック付きで保存。視覚変化を通知できるので、勘ではなく証跡で ROAS を守れます。",
    ],
    painTitle: "有料予算が静かに漏れる場所",
    pains: [
      {
        title: "LPは“現地でだけ”壊れる",
        body: "自席からは正常でも、地域限定スクリプト・通貨・同意ウォールで、対象地域の実ユーザーの見え方が変わります。",
      },
      {
        title: "地域ごとのオファー／価格不一致",
        body: "広告の訴求とローカライズページの内容がズレる。気づくのはダッシュボードではなく、クライアントの怒りのメールから。",
      },
      {
        title: "テストが落ちた時の証跡がない",
        body: "CVRが下がると全員がクリエイティブのせいに。地域別・日付付きのページ取得がないと、実際に何が変わったか切り分けられません。",
      },
    ],
    valueTitle: "Viewtrace がパフォーマンスを守る方法",
    values: [
      {
        title: "配信地域からLPを観測",
        body: "トラフィックを流している国・米国州から、その LP の URL が実際どう描画されたかを取得します。",
      },
      {
        title: "意味のある変化を差分通知",
        body: "メール通知付きの定期実行で視覚変化を検知。次の配信サイクル前に、崩れた地域に気づけます（Starter / Pro）。",
      },
      {
        title: "再現可能な地理テストとタイムライン",
        body: "同じ URL を同じ地域から再実行し、日付付き履歴で修正やロールアウトを検証します。",
      },
      {
        title: "クライアントが受け入れる証跡",
        body: "検証URLとPDFで、「ページは出ていました」を、アカウントに添付できる形にします。",
      },
    ],
    faqTitle: "運用型代理店向けFAQ",
    faqs: [
      {
        q: "タグやピクセルの発火を確認できますか？",
        a: "Viewtrace は「その地域で実際に何が描画されたか」（ヒーロー・価格・オファー・注記）に注目します。着地体験の視覚的証跡で、タグ発火計測を置き換えるものではなく補完します。",
      },
      {
        q: "LPの変化を通知できますか？",
        a: "はい。メール通知付きの定期実行で意味のある視覚変化を検知し、崩れた地域が次の配信予算を食う前に気づけます（Starter / Pro）。",
      },
      {
        q: "地域ブロックされたページも検証できますか？",
        a: "利用規約の範囲で、任意の公開 URL を選んだ地域から観測できます。自社クライアントの LP が現地で正しく描画されるかの確認に最適です。",
      },
      {
        q: "取得はどれくらい速いですか？",
        a: "地域を選び URL を入力してダッシュボードから実行するだけ。拡張機能やローカルプロキシは不要です。",
      },
      {
        q: "始めるのにいくらかかりますか？",
        a: "最大20観測まで無料・カード不要。有料は観測ボリューム・保持期間・スケジュールでスケールします（料金参照）。",
      },
    ],
    ctaTitle: "見えないページに、予算を送り続けない",
    ctaBody:
      "無料で始めて、最初の地理ルートLP検証を数分で。カード不要・最大20観測。",
  },
};

export function getAudiencePageCopy(locale: Locale, slug: AudienceSlug): AudienceBody {
  return locale === "ja" ? JA[slug] : EN[slug];
}

/** 相手別ページのリンクラベル（相互リンク・トップからの導線で利用） */
export function getAudienceLinkLabels(
  locale: Locale,
): { slug: AudienceSlug; label: string }[] {
  return AUDIENCE_SLUGS.map((slug) => ({
    slug,
    label: getAudiencePageCopy(locale, slug).eyebrow,
  }));
}
