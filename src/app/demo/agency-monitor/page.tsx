import type { Metadata } from "next";
import Link from "next/link";
import { ViewtraceLogo } from "@/components/brand/ViewtraceLogo";
import { LegalLocaleToggle } from "@/components/legal/LegalLocaleToggle";
import { copy, type Locale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";

/**
 * Agency Portfolio Monitor — 営業/検証用のモック画面（コンシェルジュMVP）。
 * 実データ連携なし。現Viewtrace の実機能ではないため noindex とし、
 * sitemap・ナビには載せない（共有URLとしてのみ使う）。
 * 言語トグル（vt_locale クッキー）を効かせるため、リクエスト時にクッキーを読む
 * 動的レンダリングにする（force-static にすると常に英語になる）。
 */

export const metadata: Metadata = {
  title: { absolute: "Agency Portfolio Monitor (concept preview) | Viewtrace" },
  description:
    "Concept preview: monitor every client account, surface what needs attention, and know the recommended next action—for marketing and performance agencies.",
  robots: { index: false, follow: false },
};

type Status = "attention" | "opportunity" | "normal";

type ClientCard = {
  name: string;
  channels: string[];
  status: Exclude<Status, "normal">;
  metric: string;
  metricDelta: string;
  cause: string;
  action: string;
};

const UI: Record<
  Locale,
  {
    badge: string;
    title: string;
    subtitle: string;
    lastUpdated: string;
    monitored: string;
    attention: string;
    opportunity: string;
    normal: string;
    filters: string[];
    cause: string;
    action: string;
    normalStripe: string;
    moreOpps: string;
    disclaimerTitle: string;
    disclaimer: string;
    cta: string;
    ctaNote: string;
    poweredBy: string;
    sampleBar: string;
    sampleTag: string;
  }
> = {
  en: {
    badge: "Concept preview",
    title: "Agency Portfolio Monitor",
    subtitle: "Monitor every client. Find what needs attention. Know what to do next.",
    lastUpdated: "Last checked",
    monitored: "clients monitored",
    attention: "Need attention",
    opportunity: "Opportunities",
    normal: "Performing normally",
    filters: ["All", "Need attention", "Opportunities", "Normal"],
    cause: "Probable cause",
    action: "Recommended action",
    normalStripe: "22 accounts performing within normal ranges — no action needed today.",
    moreOpps: "+3 more opportunities",
    disclaimerTitle: "How the beta works",
    disclaimer:
      "This is a product concept preview with sample data. During the private beta, the Viewtrace team prepares this monitor from read-only access to your ad accounts—no changes are made to your campaigns.",
    cta: "Request beta access",
    ctaNote: "Free during beta · read-only · your data is never modified",
    poweredBy: "Powered by Viewtrace",
    sampleBar:
      "Sample data — this is an illustrative concept. None of these numbers are measured from a real account.",
    sampleTag: "Sample",
  },
  ja: {
    badge: "コンセプト・プレビュー",
    title: "Agency Portfolio Monitor",
    subtitle: "全クライアントを監視。要対応を発見。次の一手がわかる。",
    lastUpdated: "最終チェック",
    monitored: "クライアントを監視中",
    attention: "要対応",
    opportunity: "機会",
    normal: "正常",
    filters: ["すべて", "要対応", "機会", "正常"],
    cause: "推定原因",
    action: "推奨アクション",
    normalStripe: "22アカウントは正常範囲内 — 本日の対応は不要です。",
    moreOpps: "他に3件の機会",
    disclaimerTitle: "ベータの仕組み",
    disclaimer:
      "これはサンプルデータによるコンセプト・プレビューです。プライベートベータ期間中は、Viewtrace チームがあなたの広告アカウントへの read-only アクセスからこの画面を作成します。キャンペーンへの変更は一切行いません。",
    cta: "ベータ利用を申し込む",
    ctaNote: "ベータ中は無料・read-only・データは変更しません",
    poweredBy: "Powered by Viewtrace",
    sampleBar:
      "サンプルデータ — これは説明用のコンセプトです。ここにある数値は実際のアカウントから計測したものではありません。",
    sampleTag: "サンプル",
  },
};

function getClients(locale: Locale): { attention: ClientCard[]; opportunity: ClientCard[] } {
  if (locale === "ja") {
    return {
      attention: [
        {
          name: "Northwind Retail",
          channels: ["Google Ads"],
          status: "attention",
          metric: "CPA",
          metricDelta: "+42% (7日)",
          cause: "検索キャンペーン「Brand/Non-brand」の CTR が 28% 低下",
          action: "低CTRの広告グループ3つを停止し、予算25%を上位キャンペーンへ移動",
        },
        {
          name: "Lumina Skincare",
          channels: ["Meta Ads"],
          status: "attention",
          metric: "ROAS",
          metricDelta: "3.1x → 1.8x (7日)",
          cause: "クリエイティブ疲弊「Summer-UGC-04」、フリークエンシー 4.7",
          action: "新クリエイティブを2本投入し、フリークエンシー上限を2.5に設定",
        },
        {
          name: "Apex Home Services",
          channels: ["GA4"],
          status: "attention",
          metric: "コンバージョン",
          metricDelta: "-35% (3日)",
          cause: "モバイルでフォーム送信が急減（form_start は高いが submit が落ちる）",
          action: "モバイルのフォーム/計測を確認。トラッキング欠損かUX不具合の可能性",
        },
      ],
      opportunity: [
        {
          name: "Bluewave SaaS",
          channels: ["Google Ads"],
          status: "opportunity",
          metric: "ROAS",
          metricDelta: "4.8x・予算上限",
          cause: "上位キャンペーンがインプレッションシェアを予算で損失",
          action: "上位キャンペーンの予算を15%増額",
        },
        {
          name: "Cedar & Co",
          channels: ["Google Ads", "GA4"],
          status: "opportunity",
          metric: "CVR",
          metricDelta: "流入 +31% / CVR -18%",
          cause: "流入増に対しLPの完了率が低下（チェックアウト離脱）",
          action: "LP・チェックアウトファネルを確認",
        },
        {
          name: "Vertex Fitness",
          channels: ["Meta Ads"],
          status: "opportunity",
          metric: "CPC",
          metricDelta: "-22% / IMP 上昇",
          cause: "勝ちパターン「Q3-Reels-02」が好調",
          action: "該当広告セットを20%スケール",
        },
        {
          name: "Harbor Legal",
          channels: ["Google Ads"],
          status: "opportunity",
          metric: "IS(予算)",
          metricDelta: "-34% 損失",
          cause: "予算不足でインプレッションシェアを損失",
          action: "予算増額、またはジオ/時間帯を絞り込み",
        },
      ],
    };
  }
  return {
    attention: [
      {
        name: "Northwind Retail",
        channels: ["Google Ads"],
        status: "attention",
        metric: "CPA",
        metricDelta: "+42% (7d)",
        cause: "Search campaign “Brand/Non-brand” CTR down 28%",
        action: "Pause 3 low-CTR ad groups; shift 25% budget to top performer",
      },
      {
        name: "Lumina Skincare",
        channels: ["Meta Ads"],
        status: "attention",
        metric: "ROAS",
        metricDelta: "3.1x → 1.8x (7d)",
        cause: "Creative fatigue on “Summer-UGC-04”, frequency 4.7",
        action: "Rotate in 2 new creatives; cap frequency at 2.5",
      },
      {
        name: "Apex Home Services",
        channels: ["GA4"],
        status: "attention",
        metric: "Conversions",
        metricDelta: "-35% (3d)",
        cause: "Mobile form submits collapsed (form_start high, submit dropped)",
        action: "Check mobile form/tracking — likely a break in tracking or UX",
      },
    ],
    opportunity: [
      {
        name: "Bluewave SaaS",
        channels: ["Google Ads"],
        status: "opportunity",
        metric: "ROAS",
        metricDelta: "4.8x · budget-limited",
        cause: "Top campaign losing impression share to budget",
        action: "Increase budget 15% on the top campaign",
      },
      {
        name: "Cedar & Co",
        channels: ["Google Ads", "GA4"],
        status: "opportunity",
        metric: "CVR",
        metricDelta: "Traffic +31% / CVR -18%",
        cause: "More traffic, lower completion (checkout drop-off)",
        action: "Review landing page / checkout funnel",
      },
      {
        name: "Vertex Fitness",
        channels: ["Meta Ads"],
        status: "opportunity",
        metric: "CPC",
        metricDelta: "-22% / impressions up",
        cause: "Winning pattern “Q3-Reels-02” performing well",
        action: "Scale that ad set +20%",
      },
      {
        name: "Harbor Legal",
        channels: ["Google Ads"],
        status: "opportunity",
        metric: "IS (budget)",
        metricDelta: "-34% lost",
        cause: "Losing impression share due to limited budget",
        action: "Raise budget or tighten geo/schedule",
      },
    ],
  };
}

const STATUS_STYLE: Record<
  Exclude<Status, "normal">,
  { dot: string; chip: string; ring: string }
> = {
  attention: {
    dot: "bg-red-500",
    chip: "bg-red-50 text-red-700 ring-red-600/20",
    ring: "ring-red-500/20",
  },
  opportunity: {
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700 ring-amber-600/20",
    ring: "ring-amber-500/20",
  },
};

function ClientRow({ c, ui }: { c: ClientCard; ui: (typeof UI)[Locale] }) {
  const s = STATUS_STYLE[c.status];
  return (
    <div
      className={`rounded-2xl border border-border bg-surface-elevated p-5 ring-1 ${s.ring}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
          <span className="font-display text-base font-semibold text-ink">{c.name}</span>
          <span className="rounded-full border border-dashed border-ink-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            {ui.sampleTag}
          </span>
          <span className="flex flex-wrap gap-1.5">
            {c.channels.map((ch) => (
              <span
                key={ch}
                className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-ink-muted"
              >
                {ch}
              </span>
            ))}
          </span>
        </div>
        <div
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${s.chip}`}
        >
          <span className="opacity-70">{c.metric}</span>
          <span>{c.metricDelta}</span>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-surface p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{ui.cause}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">{c.cause}</p>
        </div>
        <div className="rounded-xl bg-accent-soft p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">{ui.action}</p>
          <p className="mt-1 text-sm font-medium leading-relaxed text-ink">{c.action}</p>
        </div>
      </div>
    </div>
  );
}

function StatPill({
  count,
  label,
  dot,
}: {
  count: number;
  label: string;
  dot: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated px-4 py-3">
      <span className={`h-3 w-3 rounded-full ${dot}`} />
      <span className="font-display text-2xl font-bold text-ink">{count}</span>
      <span className="text-sm text-ink-muted">{label}</span>
    </div>
  );
}

export default async function AgencyMonitorDemoPage() {
  const locale = await getRequestLocale();
  const ui = UI[locale];
  const shell = copy[locale].legalShell;
  const clients = getClients(locale);

  const dateStr = new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date("2026-08-29T08:00:00Z"));

  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="border-b border-border bg-surface-elevated">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="inline-flex items-center transition hover:opacity-90">
            <ViewtraceLogo className="h-8 w-auto sm:h-9" />
          </Link>
          <div className="flex items-center gap-3">
            <LegalLocaleToggle locale={locale} />
            <Link
              href="/"
              className="text-sm font-medium text-ink-muted transition hover:text-ink"
            >
              {shell.backToHome}
            </Link>
          </div>
        </div>
      </header>

      {/* サンプルデータであることを常時明示（実測値との誤認防止） */}
      <div className="sticky top-0 z-20 border-b border-amber-600/30 bg-amber-50">
        <div className="mx-auto flex max-w-5xl items-center gap-2.5 px-4 py-2.5 sm:px-6">
          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            {ui.sampleTag}
          </span>
          <p className="text-xs font-medium leading-snug text-amber-900">{ui.sampleBar}</p>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Title */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold uppercase tracking-wider text-surface">
            {ui.badge}
          </span>
          <span className="text-xs text-ink-muted">
            {ui.lastUpdated}: {dateStr}
          </span>
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {ui.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
          {ui.subtitle}
        </p>

        {/* Summary */}
        <div className="mt-8 rounded-3xl border border-border bg-surface-elevated p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-display text-4xl font-bold text-ink">32</span>
            <span className="text-sm text-ink-muted">{ui.monitored}</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StatPill count={3} label={ui.attention} dot="bg-red-500" />
            <StatPill count={7} label={ui.opportunity} dot="bg-amber-500" />
            <StatPill count={22} label={ui.normal} dot="bg-emerald-500" />
          </div>
          {/* Filter tabs (visual only) */}
          <div className="mt-5 flex flex-wrap gap-2">
            {ui.filters.map((f, i) => (
              <span
                key={f}
                className={
                  i === 0
                    ? "rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white"
                    : "rounded-full border border-border px-3 py-1.5 text-xs font-medium text-ink-muted"
                }
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Attention */}
        <section className="mt-10">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            {ui.attention}
          </h2>
          <div className="mt-4 space-y-4">
            {clients.attention.map((c) => (
              <ClientRow key={c.name} c={c} ui={ui} />
            ))}
          </div>
        </section>

        {/* Opportunities */}
        <section className="mt-10">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            {ui.opportunity}
          </h2>
          <div className="mt-4 space-y-4">
            {clients.opportunity.map((c) => (
              <ClientRow key={c.name} c={c} ui={ui} />
            ))}
          </div>
          <p className="mt-3 text-sm text-ink-muted">{ui.moreOpps}</p>
        </section>

        {/* Normal stripe */}
        <div className="mt-10 flex items-center gap-3 rounded-2xl border border-emerald-600/20 bg-emerald-50 px-5 py-4">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
          <p className="text-sm text-emerald-800">{ui.normalStripe}</p>
        </div>

        {/* Beta disclaimer + CTA */}
        <section className="mt-12 overflow-hidden rounded-3xl border border-accent/30 bg-accent-soft p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-wider text-accent">
            {ui.disclaimerTitle}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">{ui.disclaimer}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href="/contact?topic=agency-monitor"
              className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-accent-hover"
            >
              {ui.cta}
            </Link>
            <span className="text-xs font-medium text-ink-muted">{ui.ctaNote}</span>
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-ink-muted">{ui.poweredBy}</p>
      </main>
    </div>
  );
}
