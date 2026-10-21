import type { PageSeoSignalId, PageSeoSignalScore, PageSeoVerdict } from "@/lib/observation-page-seo-score";
import {
  pageSeoScoreFromRecord,
  type ObservationSeoFactV1,
  type ObservationSeoFactsV1,
  type SeoFactState,
} from "@/lib/observation-seo-facts";
import type { HtmlHeadSignalsV1 } from "@/lib/url-preview";

type Props = {
  facts: ObservationSeoFactsV1 | undefined;
  html?: HtmlHeadSignalsV1 | null;
  locale: string;
};

const FACT_LABELS: Record<ObservationSeoFactV1["id"], { ja: string; en: string }> = {
  document_title: { ja: "title", en: "title" },
  meta_description: { ja: "meta description", en: "meta description" },
  canonical: { ja: "canonical", en: "canonical" },
  canonical_vs_final: { ja: "canonical と最終 URL", en: "canonical vs final URL" },
  html_lang: { ja: "html lang", en: "html lang" },
  json_ld: { ja: "JSON-LD", en: "JSON-LD" },
  robots_meta: { ja: "meta robots", en: "meta robots" },
  x_robots_tag: { ja: "X-Robots-Tag", en: "X-Robots-Tag" },
  noindex: { ja: "noindex", en: "noindex" },
  nofollow: { ja: "nofollow", en: "nofollow" },
  http_status: { ja: "HTTP status", en: "HTTP status" },
  requested_vs_final: { ja: "要求 URL と最終 URL", en: "requested vs final URL" },
  robots_txt: { ja: "robots.txt", en: "robots.txt" },
  robots_txt_path: { ja: "この URL の robots 規則", en: "robots rule for this URL" },
  sitemap_declared: { ja: "Sitemap 宣言", en: "Sitemap declared" },
};

const SIGNAL_LABELS: Record<PageSeoSignalId, string> = {
  title: "Title",
  meta_description: "Meta description",
  canonical: "Canonical",
  indexability: "Indexability",
  robots_txt: "robots.txt",
  h1: "H1",
  lang: "lang",
  viewport: "viewport",
  http_status: "HTTP status",
  open_graph: "Open Graph",
  structured_data: "Structured data",
};

function stateLabel(state: SeoFactState, ja: boolean): string {
  const labels: Record<SeoFactState, { ja: string; en: string }> = {
    present: { ja: "あり", en: "Present" },
    absent: { ja: "なし", en: "Absent" },
    match: { ja: "一致", en: "Match" },
    mismatch: { ja: "不一致", en: "Differ" },
    allowed: { ja: "Disallow に非該当", en: "No matching disallow" },
    disallowed: { ja: "Disallow に該当", en: "Matching disallow" },
    unknown: { ja: "未記録", en: "Not recorded" },
  };
  return ja ? labels[state].ja : labels[state].en;
}

function sourceLabel(source: ObservationSeoFactV1["source"]): string {
  if (source === "html") return "HTML";
  if (source === "http") return "HTTP";
  return "robots.txt";
}

function verdictText(signal: PageSeoSignalScore, ja: boolean): string {
  const detail = signal.detail ?? "";
  if (signal.verdict === "not_measured") return ja ? "未測定" : "Not measured";
  const mark: Record<Exclude<PageSeoVerdict, "not_measured">, string> = {
    pass: "✓",
    partial: "⚠",
    fail: "✕",
  };
  const markText = mark[signal.verdict];
  return detail ? `${markText} ${detail}` : markText;
}

function scoreFill(verdict: PageSeoVerdict): string {
  if (verdict === "pass") return "#276248";
  if (verdict === "partial") return "#b45309";
  if (verdict === "fail") return "#be123c";
  return "transparent";
}

function ScoreRing({
  earned,
  possible,
  label,
}: {
  earned: number;
  possible: number;
  label: string;
}) {
  const size = 112;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = possible > 0 ? Math.min(1, Math.max(0, earned / possible)) : 0;
  const earnedLength = circumference * ratio;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      className="shrink-0"
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#e7e5e4"
        strokeWidth={stroke}
      />
      {possible > 0 ? (
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#276248"
          strokeWidth={stroke}
          strokeDasharray={`${earnedLength} ${circumference - earnedLength}`}
          strokeLinecap="butt"
          transform={`rotate(-90 ${center} ${center})`}
        />
      ) : null}
    </svg>
  );
}

export function ObservationSeoFactsPanel({ facts, html = null, locale }: Props) {
  if (!facts || facts.scope !== "single_url") return null;
  const ja = locale.startsWith("ja");
  const score = pageSeoScoreFromRecord(facts, html);
  return (
    <section className="rounded-xl border border-border bg-surface-elevated p-4 sm:col-span-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Page SEO Score</h2>
      <p className="mt-2 text-xs leading-relaxed text-ink-muted">
        {ja
          ? "この URL で測れた signal だけから決まる点数です。未測定は 0 点にせず、分母から外します。AI Score ではなく、サイト全体の点数でもありません。"
          : "A deterministic score from signals measured on this URL. Unmeasured signals are left out of the denominator, not scored as zero. This is not an AI score and not a site-wide score."}
      </p>

      {score ? (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-5">
            <ScoreRing
              earned={score.earned}
              possible={score.possible}
              label={
                score.score == null
                  ? ja
                    ? "Page SEO Score 未測定"
                    : "Page SEO Score not measured"
                  : `Page SEO Score ${score.score}/100. ${score.earned} / ${score.possible}`
              }
            />
            <div>
              <p className="font-display text-3xl font-semibold tabular-nums tracking-tight text-ink">
                {score.score == null ? "—" : score.score}
                <span className="text-base font-medium text-ink-muted">/100</span>
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {ja
                  ? `測定した ${score.measured_count} 信号から算出`
                  : `Based on ${score.measured_count} measured signal${score.measured_count === 1 ? "" : "s"}`}
              </p>
              <p className="text-xs text-ink-muted">
                {ja
                  ? `未測定 ${score.not_measured_count} 信号は円にも分母にも入っていません`
                  : `${score.not_measured_count} signal${score.not_measured_count === 1 ? "" : "s"} not measured, excluded from the ring`}
              </p>
              {score.possible > 0 ? (
                <p className="mt-1 font-mono text-[11px] text-ink-muted">
                  {score.earned} / {score.possible} × 100
                </p>
              ) : null}
            </div>
          </div>

          <ul className="mt-5 space-y-2.5">
            {score.signals.map((signal) => {
              const measured = signal.verdict !== "not_measured" && signal.earned != null && signal.weight > 0;
              const width = measured ? Math.round((signal.earned! / signal.weight) * 100) : 0;
              return (
                <li key={signal.id}>
                  <div className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="font-medium text-ink">{SIGNAL_LABELS[signal.id]}</span>
                    <span className="shrink-0 text-ink-muted">
                      {verdictText(signal, ja)}
                      {measured ? <span className="ml-2 font-mono text-ink">{signal.earned}/{signal.weight}</span> : null}
                    </span>
                  </div>
                  <div
                    className={`mt-1 h-2 overflow-hidden rounded-full ${
                      measured ? "bg-stone-200/80" : "border border-dashed border-stone-300 bg-transparent"
                    }`}
                    aria-hidden="true"
                  >
                    {measured ? (
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${width}%`, backgroundColor: scoreFill(signal.verdict) }}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <details className="mt-4">
        <summary className="cursor-pointer text-xs text-ink-muted">
          {ja ? "測定した事実" : "Measured facts"}
        </summary>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {facts.facts.map((item) => (
            <div key={item.id}>
              <dt className="text-xs text-ink-muted">{ja ? FACT_LABELS[item.id].ja : FACT_LABELS[item.id].en}</dt>
              <dd className="mt-0.5 text-sm text-ink">
                <span>
                  {item.id === "http_status" && item.value ? `HTTP ${item.value}` : stateLabel(item.state, ja)}
                </span>
                {item.value && item.id !== "http_status" ? (
                  <span className="mt-0.5 block break-all font-mono text-[11px] leading-relaxed text-ink-muted">
                    {item.value}
                  </span>
                ) : null}
                <span className="mt-0.5 block text-[11px] text-ink-muted">{sourceLabel(item.source)}</span>
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}
