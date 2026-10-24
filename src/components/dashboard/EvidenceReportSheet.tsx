import { ViewtraceLogo } from "@/components/brand/ViewtraceLogo";
import { ObservationAiAuditReadout } from "@/components/dashboard/ObservationAiAuditReadout";
import type { ObservationStatus } from "@/lib/demo/observations";
import type {
  EvidenceReportBehaviorRow,
  EvidenceReportFact,
  EvidenceReportFacts,
  EvidenceReportJourneyRow,
  EvidenceReportVerdict,
} from "@/lib/evidence-report";
import { formatJaDate } from "@/lib/format";
import type { ObservationAiAuditCopy } from "@/lib/observation-ai-audit-copy";
import type { ObservationAiAudit } from "@/lib/observation-ai-audit";
import { copy as messages, type Locale } from "@/lib/i18n";
import { journeyKindLabel } from "@/lib/journey-definition";
import { motionDriverFactLines } from "@/lib/motion-driver";
import type { InteractionCheckType } from "@/lib/observation-regional-interaction";
import type { ScrollInteractionStatus } from "@/lib/observation-scroll-interaction";

export type EvidenceReportCopy = {
  title: string;
  subtitle: string;
  disclaimer: string;
  fieldObservationId: string;
  fieldUrl: string;
  fieldCaptureTime: string;
  fieldCountry: string;
  fieldScreenshot: string;
  fieldSha256: string;
  fieldSha256Hint: string;
  fieldContentHash: string;
  fieldVerifyUrl: string;
  fieldStatus: string;
  statusSuccess: string;
  statusFailure: string;
  statusPending: string;
  noScreenshot: string;
  fieldRequested: string;
  fieldObserved: string;
  sectionReachability: string;
  fieldHttp: string;
  fieldFinalUrl: string;
  fieldPageTitle: string;
  fieldDns: string;
  fieldTls: string;
  unmeasured: string;
  sectionDetected: string;
  detectedHint: string;
  previousValue: string;
  thisValue: string;
  sectionBehavior: string;
  behaviorNote: string;
  sectionJourney: string;
  journeyNoSafeTarget: string;
  journeyIncomplete: string;
  auditInference: string;
};

function measured(value: string | null, unmeasured: string): string {
  return value?.trim() ? value : unmeasured;
}

const REPORT_VERDICT: Record<Locale, Record<EvidenceReportVerdict, string>> = {
  ja: { same: "同じ", changed: "内容が違う", incomparable: "比較できない" },
  en: { same: "Same", changed: "Changed", incomparable: "Not comparable" },
};

const REPORT_FACT: Record<Locale, Record<EvidenceReportFact["key"], string>> = {
  ja: {
    screenshot: "スクリーンショット",
    title: "タイトル",
    canonical: "正規 URL",
    robots: "robots 指定",
    ogImage: "Open Graph 画像",
  },
  en: {
    screenshot: "Screenshot",
    title: "Title",
    canonical: "Canonical",
    robots: "Robots",
    ogImage: "OG Image",
  },
};

const REPORT_BEHAVIOR: Record<Locale, Record<InteractionCheckType, string>> = {
  ja: {
    scroll: "スクロール",
    hover: "ホバー",
    menu: "メニュー",
    modal: "モーダル",
    accordion: "アコーディオン",
    tabs: "タブ",
    tooltip: "ツールチップ",
    form: "フォーム",
    drag: "ドラッグ",
    swipe: "スワイプ",
    cursor_follow: "カーソル追従",
    load_animation: "読み込み時の動き",
    css_animation: "CSS アニメーション",
    js_animation: "JS アニメーション",
    scroll_reveal: "スクロールで現れる",
    delayed: "遅れて出る内容",
    lazy_load: "遅延読み込み",
    carousel: "カルーセル",
    auto_carousel: "自動カルーセル",
    video: "動画",
    embedded_video: "埋め込み動画",
    lottie: "Lottie",
    svg_animation: "SVG アニメーション",
    canvas: "Canvas",
    webgl: "WebGL",
  },
  en: {
    scroll: "Scroll",
    hover: "Hover",
    menu: "Menu",
    modal: "Modal",
    accordion: "Accordion",
    tabs: "Tabs",
    tooltip: "Tooltip / Popover",
    form: "Form",
    drag: "Drag",
    swipe: "Swipe",
    cursor_follow: "Cursor-follow",
    load_animation: "Load animation",
    css_animation: "CSS animation",
    js_animation: "JS animation",
    scroll_reveal: "Scroll reveal",
    delayed: "Delayed content",
    lazy_load: "Lazy-load",
    carousel: "Carousel",
    auto_carousel: "Auto carousel",
    video: "Video",
    embedded_video: "Embedded video",
    lottie: "Lottie",
    svg_animation: "SVG animation",
    canvas: "Canvas",
    webgl: "WebGL",
  },
};

const REPORT_BEHAVIOR_STATUS: Record<Locale, Record<ScrollInteractionStatus, string>> = {
  ja: {
    working: "✅ 動作している",
    no_change_observed: "画面上の変化は観測されませんでした",
    failed: "実行エラー",
    not_measured: "未測定",
    not_detected: "未検出",
    blocked_for_safety: "安全のため未実行",
    playback_not_verifiable: "検出のみ（再生は確認できない）",
  },
  en: {
    working: "✅ Working",
    no_change_observed: "No rendered state change observed",
    failed: "Execution error",
    not_measured: "Not measured",
    not_detected: "Not detected",
    blocked_for_safety: "Blocked for safety",
    playback_not_verifiable: "Detected — playback not verifiable",
  },
};

const REPORT_JOURNEY_STATUS: Record<Locale, Record<Exclude<EvidenceReportJourneyRow["status"], "no_safe_target">, string>> = {
  ja: {
    pass: "成功",
    fail: "失敗",
    blocked_for_safety: "安全のため未実行",
    incomplete: "未完了",
  },
  en: {
    pass: "PASS",
    fail: "FAIL",
    blocked_for_safety: "Blocked for safety",
    incomplete: "Incomplete",
  },
};

function reportLocale(locale: string | undefined): Locale {
  return locale === "en" ? "en" : "ja";
}

function verdictLabel(verdict: EvidenceReportVerdict, locale: Locale): string {
  const table = REPORT_VERDICT[reportLocale(locale)] ?? REPORT_VERDICT.ja;
  return table[verdict] ?? REPORT_VERDICT.ja[verdict];
}

function behaviorLabel(type: InteractionCheckType, locale: Locale): string {
  const table = REPORT_BEHAVIOR[reportLocale(locale)] ?? REPORT_BEHAVIOR.ja;
  return table[type] ?? REPORT_BEHAVIOR.ja[type] ?? type;
}

function behaviorStatus(status: ScrollInteractionStatus, locale: Locale): string {
  const table = REPORT_BEHAVIOR_STATUS[reportLocale(locale)] ?? REPORT_BEHAVIOR_STATUS.ja;
  return table[status] ?? REPORT_BEHAVIOR_STATUS.ja[status] ?? status;
}

function behaviorClass(status: ScrollInteractionStatus): string {
  if (status === "working") return "font-semibold text-emerald-950";
  if (status === "failed") return "font-semibold text-red-800";
  if (status === "no_change_observed") return "font-semibold text-amber-950";
  if (status === "blocked_for_safety") return "font-semibold text-amber-800";
  return "text-ink-muted";
}

function journeyStatus(row: EvidenceReportJourneyRow, report: EvidenceReportCopy, locale: Locale): string {
  if (row.status === "no_safe_target") return report.journeyNoSafeTarget;
  const table = REPORT_JOURNEY_STATUS[reportLocale(locale)] ?? REPORT_JOURNEY_STATUS.ja;
  return table[row.status] ?? REPORT_JOURNEY_STATUS.ja[row.status] ?? report.unmeasured;
}

function journeyClass(status: EvidenceReportJourneyRow["status"]): string {
  if (status === "pass") return "font-semibold text-emerald-950";
  if (status === "fail") return "font-semibold text-red-800";
  if (status === "blocked_for_safety") return "font-semibold text-amber-800";
  return "text-ink-muted";
}

function factLabel(key: EvidenceReportFact["key"], locale: Locale): string {
  const table = REPORT_FACT[reportLocale(locale)] ?? REPORT_FACT.ja;
  return table[key] ?? REPORT_FACT.ja[key] ?? key;
}

type Props = {
  copy: EvidenceReportCopy;
  observationId: string;
  url: string;
  capturedLabel: string;
  status: ObservationStatus;
  snapshotImageUrl?: string;
  snapshotSha256?: string;
  contentHash?: string;
  verifyUrl: string;
  facts: EvidenceReportFacts;
  aiAudit?: ObservationAiAudit | null;
  aiAuditCopy?: ObservationAiAuditCopy;
  aiAuditGeneratedAtLabel?: string;
  locale?: Locale;
};

export function EvidenceReportSheet({
  copy,
  observationId,
  url,
  capturedLabel,
  status,
  snapshotImageUrl,
  snapshotSha256,
  contentHash,
  verifyUrl,
  facts,
  aiAudit = null,
  aiAuditCopy,
  aiAuditGeneratedAtLabel,
  locale = "en",
}: Props) {
  const statusLabel =
    status === "success"
      ? copy.statusSuccess
      : status === "failure"
        ? copy.statusFailure
        : copy.statusPending;

  const rows: {
    label: string;
    value: string;
    mono?: boolean;
    isUrl?: boolean;
    hint?: string;
  }[] = [
    { label: copy.fieldObservationId, value: observationId, mono: true },
    { label: copy.fieldCaptureTime, value: capturedLabel },
    { label: copy.fieldRequested, value: facts.region.requested || "—" },
    { label: copy.fieldObserved, value: facts.region.observed || copy.unmeasured },
    { label: copy.fieldStatus, value: statusLabel },
    { label: copy.fieldUrl, value: url, mono: true },
    {
      label: copy.fieldSha256,
      value: snapshotSha256?.trim() || "—",
      mono: true,
      hint: snapshotSha256?.trim() ? copy.fieldSha256Hint : undefined,
    },
    { label: copy.fieldContentHash, value: contentHash?.trim() || "—", mono: true },
    { label: copy.fieldVerifyUrl, value: verifyUrl, mono: true, isUrl: true },
  ];

  return (
    <article className="evidence-report-sheet mx-auto max-w-2xl px-4 pb-16 sm:px-6 sm:pb-20 print:pb-0">
      <div className="rounded-2xl border border-border bg-surface-elevated px-6 py-8 shadow-sm print:border-0 print:shadow-none sm:px-8 sm:py-10">
        <header className="border-b border-border pb-6">
          <ViewtraceLogo className="h-7 w-auto sm:h-8" priority={false} />
          <h1 className="mt-4 font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">{copy.subtitle}</p>
        </header>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {copy.fieldScreenshot}
          </p>
          <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface">
            {snapshotImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- evidence snapshot CDN/Blob
              <img
                src={snapshotImageUrl}
                alt=""
                className="max-h-[min(55vh,480px)] w-full object-contain object-top"
              />
            ) : (
              <p className="px-4 py-8 text-center text-sm text-ink-muted">{copy.noScreenshot}</p>
            )}
          </div>
        </div>

        <dl className="mt-6 divide-y divide-border">
          {rows.map((row) => (
            <div key={row.label} className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {row.label}
              </dt>
              <dd
                className={`text-sm text-ink ${row.mono ? "break-all font-mono text-xs leading-relaxed" : "leading-relaxed"}`}
              >
                {row.isUrl && row.value !== "—" ? (
                  <a href={row.value} className="text-accent underline-offset-2 hover:underline">
                    {row.value}
                  </a>
                ) : (
                  row.value
                )}
                {row.hint ? (
                  <p className="mt-1.5 font-sans text-xs leading-relaxed text-ink-muted">{row.hint}</p>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>

        <section className="mt-8 border-t border-border pt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{copy.sectionReachability}</h2>
          <dl className="mt-2 divide-y divide-border">
            {(
              [
                [copy.fieldHttp, facts.reachability.http],
                [copy.fieldFinalUrl, facts.reachability.finalUrl],
                [copy.fieldPageTitle, facts.reachability.pageTitle],
                [copy.fieldDns, facts.reachability.dns],
                [copy.fieldTls, facts.reachability.tls],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</dt>
                <dd className={`text-sm leading-relaxed text-ink ${value ? "break-all" : "text-ink-muted"}`}>
                  {measured(value, copy.unmeasured)}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {facts.detected ? (
          <DetectedFacts copy={copy} facts={facts} locale={locale} />
        ) : null}

        {facts.behavior ? (
          <section className="mt-8 border-t border-border pt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{copy.sectionBehavior}</h2>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">{copy.behaviorNote}</p>
            <ul className="mt-3 divide-y divide-border">
              {facts.behavior.map((row) => (
                <BehaviorLine key={row.type} row={row} locale={locale} />
              ))}
            </ul>
          </section>
        ) : null}

        {facts.journey ? (
          <section className="mt-8 border-t border-border pt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{copy.sectionJourney}</h2>
            <ul className="mt-3 divide-y divide-border">
              {facts.journey.map((row, index) => (
                <li key={`${row.label}-${row.status}-${index}`} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                  <p className="text-sm text-ink">{row.label ? journeyKindLabel(row.label, reportLocale(locale)) : copy.sectionJourney}</p>
                  <p className={`text-xs ${journeyClass(row.status)}`}>{journeyStatus(row, copy, locale)}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {aiAudit && aiAuditCopy && aiAuditGeneratedAtLabel ? (
          <div className="mt-8 border-t border-border pt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">{copy.auditInference}</p>
            <ObservationAiAuditReadout
              copy={aiAuditCopy}
              audit={aiAudit}
              locale={locale}
              generatedAtLabel={aiAuditGeneratedAtLabel}
            />
          </div>
        ) : null}

        <p className="mt-8 border-t border-border pt-6 text-xs leading-relaxed text-ink-muted">
          {copy.disclaimer}
        </p>
      </div>
    </article>
  );
}

function DetectedFacts({
  copy,
  facts,
  locale,
}: {
  copy: EvidenceReportCopy;
  facts: EvidenceReportFacts;
  locale: Locale;
}) {
  const detected = facts.detected;
  if (!detected) return null;
  const language = reportLocale(locale);
  const t = messages[language].observationCompare;
  const when = formatJaDate(detected.previousCapturedAt, language);
  return (
    <section className="mt-8 border-t border-border pt-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{copy.sectionDetected}</h2>
      <p className="mt-2 text-xs leading-relaxed text-ink-muted">{copy.detectedHint.replace("{when}", when)}</p>
      <div className="mt-3 divide-y divide-border">
        {detected.fields.map((field) => (
          <div key={field.key} className="py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-ink">{factLabel(field.key, locale)}</p>
              <p className="text-xs font-semibold text-ink">{verdictLabel(field.verdict, locale)}</p>
            </div>
            {field.hint ? <p className="mt-1 text-xs leading-relaxed text-ink-muted">{field.hint}</p> : null}
            <p className="mt-2 break-all text-xs leading-relaxed text-ink-muted">
              {copy.previousValue}: {field.previous.trim() || t.emptyValue}
            </p>
            <p className="mt-1 break-all text-xs leading-relaxed text-ink">
              {copy.thisValue}: {field.current.trim() || t.emptyValue}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BehaviorLine({ row, locale }: { row: EvidenceReportBehaviorRow; locale: Locale }) {
  const driverLines = row.driver ? motionDriverFactLines(row.driver, reportLocale(locale)) : [];
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-ink">{behaviorLabel(row.type, locale)}</p>
        <p className={`text-xs ${behaviorClass(row.status)}`}>{behaviorStatus(row.status, locale)}</p>
      </div>
      {row.lines?.length ? (
        <ul className="mt-2 space-y-1">
          {row.lines.map((line) => (
            <li key={line} className="text-xs leading-relaxed text-ink">{line}</li>
          ))}
        </ul>
      ) : null}
      {driverLines.length ? (
        <ul className="mt-2 space-y-1">
          {driverLines.map((line) => (
            <li key={line} className="text-xs leading-relaxed text-ink-muted">{line}</li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
