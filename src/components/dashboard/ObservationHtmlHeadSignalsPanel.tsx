import { SavedSocialImage } from "@/components/dashboard/SavedSocialImage";
import { auditEvidenceDomId } from "@/lib/observation-ai-audit";
import {
  pageSeoFromSignals,
  type PageSeoDerivedV1,
  type PageSeoSignalId,
  type PageSeoSignalResult,
} from "@/lib/measurement-record";
import {
  presentSearchSocial,
  searchSocialLanguageName,
  type SearchSocialChange,
  type SearchSocialFact,
  type SearchSocialMissingId,
} from "@/lib/search-social-presentation";
import type { HtmlHeadSignalsV1 } from "@/lib/url-preview";
import { htmlHeadSignalsHasAny } from "@/lib/url-preview";
import type { ObservationWebFactsV1 } from "@/lib/observation-web-facts";

export type ObservationHtmlHeadSignalsCopy = {
  title: string;
  hint: string;
  documentTitle: string;
  metaDescription: string;
  chars: string;
  canonical: string;
  canonicalMismatch: string;
  canonicalMatch: string;
  robotsMeta: string;
  xRobots: string;
  noindex: string;
  noindexPresent: string;
  noindexAbsent: string;
  htmlLang: string;
  viewport: string;
  httpStatus: string;
  finalUrl: string;
  redirect: string;
  redirectYes: string;
  redirectNo: string;
  openGraph: string;
  openGraphDetected: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  jsonLd: string;
  blockers: string;
  gaps: string;
  recorded: string;
  blockersHint: string;
  gapsHint: string;
  recordedHint: string;
  bucketEmpty: string;
  blockerNoindex: string;
  blockerHttp: string;
  blockerCanonical: string;
  gapTitle: string;
  gapDescription: string;
  gapOg: string;
  searchPreview: string;
  searchPreviewHint: string;
  ogPreview: string;
  ogPreviewHint: string;
  previewToggle: string;
  searchCard: string;
  socialCard: string;
  pageInfo: string;
  structuredData: string;
  fieldsRecorded: string;
  fieldsClear: string;
  fieldsMissing: string;
  fieldsMissingOne: string;
  changes: string;
  changesOne: string;
  unchangedSince: string;
  changeBefore: string;
  changeNow: string;
  technical: string;
  pageResponded: string;
  noRedirect: string;
  redirectObserved: string;
  canonicalMatchesPage: string;
  canonicalDiffersPage: string;
  viewportDeclared: string;
  noindexNotObserved: string;
  noindexObserved: string;
  socialFound: string;
  largeCard: string;
  cardDeclared: string;
  changeSearchTitle: string;
  changeSearchDescription: string;
  changeSocialTitle: string;
  changeSocialDescription: string;
  changeSocialImage: string;
  changeTwitterTitle: string;
  changeTwitterImage: string;
  changeCanonical: string;
  changeNoindex: string;
  changeHttp: string;
  changeLang: string;
};

export function observationHtmlHeadCopyFrom(t: {
  htmlHeadTitle: string;
  htmlHeadHint: string;
  htmlHeadDocumentTitle: string;
  htmlHeadMetaDescription: string;
  htmlHeadChars: string;
  htmlHeadCanonical: string;
  htmlHeadCanonicalMismatch: string;
  htmlHeadCanonicalMatch: string;
  htmlHeadRobotsMeta: string;
  htmlHeadXRobots: string;
  htmlHeadNoindex: string;
  htmlHeadNoindexPresent: string;
  htmlHeadNoindexAbsent: string;
  htmlHeadLang: string;
  htmlHeadViewport: string;
  htmlHeadHttpStatus: string;
  htmlHeadFinalUrl: string;
  htmlHeadRedirect: string;
  htmlHeadRedirectYes: string;
  htmlHeadRedirectNo: string;
  htmlHeadOpenGraph: string;
  htmlHeadOpenGraphDetected: string;
  htmlHeadTwitterCard: string;
  htmlHeadTwitterTitle: string;
  htmlHeadTwitterDescription: string;
  htmlHeadTwitterImage: string;
  htmlHeadOgTitle: string;
  htmlHeadOgDescription: string;
  htmlHeadOgImage: string;
  htmlHeadJsonLd: string;
  htmlHeadBlockers: string;
  htmlHeadGaps: string;
  htmlHeadRecorded: string;
  htmlHeadBlockersHint: string;
  htmlHeadGapsHint: string;
  htmlHeadRecordedHint: string;
  htmlHeadBucketEmpty: string;
  htmlHeadBlockerNoindex: string;
  htmlHeadBlockerHttp: string;
  htmlHeadBlockerCanonical: string;
  htmlHeadGapTitle: string;
  htmlHeadGapDescription: string;
  htmlHeadGapOg: string;
  htmlHeadSearchPreview: string;
  htmlHeadSearchPreviewHint: string;
  htmlHeadOgPreview: string;
  htmlHeadOgPreviewHint: string;
  htmlHeadPreviewToggle: string;
  htmlHeadSearchCard: string;
  htmlHeadSocialCard: string;
  htmlHeadPageInfo: string;
  htmlHeadStructured: string;
  htmlHeadFieldsRecorded: string;
  htmlHeadFieldsClear: string;
  htmlHeadFieldsMissing: string;
  htmlHeadFieldsMissingOne: string;
  htmlHeadChanges: string;
  htmlHeadChangesOne: string;
  htmlHeadUnchangedSince: string;
  htmlHeadChangeBefore: string;
  htmlHeadChangeNow: string;
  htmlHeadTechnical: string;
  htmlHeadPageResponded: string;
  htmlHeadNoRedirect: string;
  htmlHeadRedirectObserved: string;
  htmlHeadCanonicalMatchesPage: string;
  htmlHeadCanonicalDiffersPage: string;
  htmlHeadViewportDeclared: string;
  htmlHeadNoindexNotObserved: string;
  htmlHeadNoindexObserved: string;
  htmlHeadSocialFound: string;
  htmlHeadLargeCard: string;
  htmlHeadCardDeclared: string;
  htmlHeadChangeSearchTitle: string;
  htmlHeadChangeSearchDescription: string;
  htmlHeadChangeSocialTitle: string;
  htmlHeadChangeSocialDescription: string;
  htmlHeadChangeSocialImage: string;
  htmlHeadChangeTwitterTitle: string;
  htmlHeadChangeTwitterImage: string;
  htmlHeadChangeCanonical: string;
  htmlHeadChangeNoindex: string;
  htmlHeadChangeHttp: string;
  htmlHeadChangeLang: string;
}): ObservationHtmlHeadSignalsCopy {
  return {
    title: t.htmlHeadTitle,
    hint: t.htmlHeadHint,
    documentTitle: t.htmlHeadDocumentTitle,
    metaDescription: t.htmlHeadMetaDescription,
    chars: t.htmlHeadChars,
    canonical: t.htmlHeadCanonical,
    canonicalMismatch: t.htmlHeadCanonicalMismatch,
    canonicalMatch: t.htmlHeadCanonicalMatch,
    robotsMeta: t.htmlHeadRobotsMeta,
    xRobots: t.htmlHeadXRobots,
    noindex: t.htmlHeadNoindex,
    noindexPresent: t.htmlHeadNoindexPresent,
    noindexAbsent: t.htmlHeadNoindexAbsent,
    htmlLang: t.htmlHeadLang,
    viewport: t.htmlHeadViewport,
    httpStatus: t.htmlHeadHttpStatus,
    finalUrl: t.htmlHeadFinalUrl,
    redirect: t.htmlHeadRedirect,
    redirectYes: t.htmlHeadRedirectYes,
    redirectNo: t.htmlHeadRedirectNo,
    openGraph: t.htmlHeadOpenGraph,
    openGraphDetected: t.htmlHeadOpenGraphDetected,
    twitterCard: t.htmlHeadTwitterCard,
    twitterTitle: t.htmlHeadTwitterTitle,
    twitterDescription: t.htmlHeadTwitterDescription,
    twitterImage: t.htmlHeadTwitterImage,
    ogTitle: t.htmlHeadOgTitle,
    ogDescription: t.htmlHeadOgDescription,
    ogImage: t.htmlHeadOgImage,
    jsonLd: t.htmlHeadJsonLd,
    blockers: t.htmlHeadBlockers,
    gaps: t.htmlHeadGaps,
    recorded: t.htmlHeadRecorded,
    blockersHint: t.htmlHeadBlockersHint,
    gapsHint: t.htmlHeadGapsHint,
    recordedHint: t.htmlHeadRecordedHint,
    bucketEmpty: t.htmlHeadBucketEmpty,
    blockerNoindex: t.htmlHeadBlockerNoindex,
    blockerHttp: t.htmlHeadBlockerHttp,
    blockerCanonical: t.htmlHeadBlockerCanonical,
    gapTitle: t.htmlHeadGapTitle,
    gapDescription: t.htmlHeadGapDescription,
    gapOg: t.htmlHeadGapOg,
    searchPreview: t.htmlHeadSearchPreview,
    searchPreviewHint: t.htmlHeadSearchPreviewHint,
    ogPreview: t.htmlHeadOgPreview,
    ogPreviewHint: t.htmlHeadOgPreviewHint,
    previewToggle: t.htmlHeadPreviewToggle,
    searchCard: t.htmlHeadSearchCard,
    socialCard: t.htmlHeadSocialCard,
    pageInfo: t.htmlHeadPageInfo,
    structuredData: t.htmlHeadStructured,
    fieldsRecorded: t.htmlHeadFieldsRecorded,
    fieldsClear: t.htmlHeadFieldsClear,
    fieldsMissing: t.htmlHeadFieldsMissing,
    fieldsMissingOne: t.htmlHeadFieldsMissingOne,
    changes: t.htmlHeadChanges,
    changesOne: t.htmlHeadChangesOne,
    unchangedSince: t.htmlHeadUnchangedSince,
    changeBefore: t.htmlHeadChangeBefore,
    changeNow: t.htmlHeadChangeNow,
    technical: t.htmlHeadTechnical,
    pageResponded: t.htmlHeadPageResponded,
    noRedirect: t.htmlHeadNoRedirect,
    redirectObserved: t.htmlHeadRedirectObserved,
    canonicalMatchesPage: t.htmlHeadCanonicalMatchesPage,
    canonicalDiffersPage: t.htmlHeadCanonicalDiffersPage,
    viewportDeclared: t.htmlHeadViewportDeclared,
    noindexNotObserved: t.htmlHeadNoindexNotObserved,
    noindexObserved: t.htmlHeadNoindexObserved,
    socialFound: t.htmlHeadSocialFound,
    largeCard: t.htmlHeadLargeCard,
    cardDeclared: t.htmlHeadCardDeclared,
    changeSearchTitle: t.htmlHeadChangeSearchTitle,
    changeSearchDescription: t.htmlHeadChangeSearchDescription,
    changeSocialTitle: t.htmlHeadChangeSocialTitle,
    changeSocialDescription: t.htmlHeadChangeSocialDescription,
    changeSocialImage: t.htmlHeadChangeSocialImage,
    changeTwitterTitle: t.htmlHeadChangeTwitterTitle,
    changeTwitterImage: t.htmlHeadChangeTwitterImage,
    changeCanonical: t.htmlHeadChangeCanonical,
    changeNoindex: t.htmlHeadChangeNoindex,
    changeHttp: t.htmlHeadChangeHttp,
    changeLang: t.htmlHeadChangeLang,
  };
}

type Props = {
  signals: HtmlHeadSignalsV1 | undefined;
  copy: ObservationHtmlHeadSignalsCopy;
  requestedUrl?: string;
  previous?: HtmlHeadSignalsV1 | null;
  webFacts?: ObservationWebFactsV1 | null;
  previousWebFacts?: ObservationWebFactsV1 | null;
  seo?: PageSeoDerivedV1 | null;
  previousSeo?: PageSeoDerivedV1 | null;
  locale?: "ja" | "en";
};

function redirected(
  requestedUrl: string | undefined,
  finalUrl: string | null | undefined,
): boolean | null {
  const a = requestedUrl?.trim();
  const b = finalUrl?.trim();
  if (!a || !b) return null;
  try {
    const left = new URL(a);
    const right = new URL(b);
    left.hash = "";
    right.hash = "";
    return left.href !== right.href;
  } catch {
    return a !== b;
  }
}

function dash(value: string | null | undefined): string {
  const v = value?.trim();
  return v ? v : "—";
}

function withLength(value: string | null | undefined, charsLabel: string): string {
  const v = value?.trim();
  if (!v) return "—";
  return `${v} (${[...v].length} ${charsLabel})`;
}

function countLine(n: number, many: string, one: string): string {
  return n === 1 ? one : many.replace("{n}", String(n));
}

function factText(fact: SearchSocialFact, copy: ObservationHtmlHeadSignalsCopy, locale: "ja" | "en"): string {
  switch (fact.kind) {
    case "http":
      return copy.pageResponded.replace("{status}", String(fact.status));
    case "lang":
      return searchSocialLanguageName(fact.code, locale);
    case "canonical":
      return fact.matches ? copy.canonicalMatchesPage : copy.canonicalDiffersPage;
    case "viewport":
      return copy.viewportDeclared;
    case "noindex":
      return fact.observed ? copy.noindexObserved : copy.noindexNotObserved;
    case "redirect":
      return fact.observed ? copy.redirectObserved : copy.noRedirect;
    case "social":
      return copy.socialFound;
    case "card":
      return fact.value === "summary_large_image"
        ? copy.largeCard
        : copy.cardDeclared.replace("{value}", fact.value);
  }
}

function changeLabel(id: SearchSocialChange["id"], copy: ObservationHtmlHeadSignalsCopy): string {
  switch (id) {
    case "search_title":
      return copy.changeSearchTitle;
    case "search_description":
      return copy.changeSearchDescription;
    case "social_title":
      return copy.changeSocialTitle;
    case "social_description":
      return copy.changeSocialDescription;
    case "social_image":
      return copy.changeSocialImage;
    case "twitter_title":
      return copy.changeTwitterTitle;
    case "twitter_image":
      return copy.changeTwitterImage;
    case "canonical":
      return copy.changeCanonical;
    case "noindex":
      return copy.changeNoindex;
    case "http":
      return copy.changeHttp;
    case "lang":
      return copy.changeLang;
  }
}

function changeValue(value: string, copy: ObservationHtmlHeadSignalsCopy): string {
  if (value === "observed") return copy.noindexObserved;
  if (value === "not_observed") return copy.noindexNotObserved;
  return value || "—";
}

function missingLabel(id: SearchSocialMissingId, copy: ObservationHtmlHeadSignalsCopy): string {
  if (id === "title") return copy.gapTitle;
  if (id === "description") return copy.gapDescription;
  return copy.gapOg;
}

function ShareCard({
  label,
  title,
  description,
  host,
  imageUrl,
  hint,
  titleId,
  descriptionId,
}: {
  label: string;
  title: string;
  description: string;
  host: string;
  imageUrl?: string;
  hint?: string;
  titleId?: string;
  descriptionId?: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-white">
      <p className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      {hint ? <p className="px-3 pt-1 text-xs leading-relaxed text-ink-muted">{hint}</p> : null}
      {imageUrl ? <div className="mt-3"><SavedSocialImage src={imageUrl} alt="" /></div> : null}
      <div className="px-3 py-3">
        <p id={titleId} className="text-sm font-medium text-[#1a0dab]">{title || "—"}</p>
        {host ? <p className="mt-0.5 text-xs text-[#006621]">{host}</p> : null}
        <p id={descriptionId} className="mt-1 line-clamp-3 text-xs leading-relaxed text-[#4d5156]">{description || "—"}</p>
      </div>
    </section>
  );
}

const SEO_SIGNAL_LABEL: Record<PageSeoSignalId, { ja: string; en: string }> = {
  title: { ja: "タイトル", en: "Title" },
  description: { ja: "説明文", en: "Description" },
  canonical: { ja: "カノニカル", en: "Canonical" },
  noindex: { ja: "noindex", en: "noindex" },
  lang: { ja: "言語", en: "Language" },
  viewport: { ja: "ビューポート", en: "Viewport" },
  http: { ja: "HTTP", en: "HTTP" },
  structured_data: { ja: "構造化データ", en: "Structured data" },
  social: { ja: "SNS", en: "Social" },
};

function seoStatusText(signal: PageSeoSignalResult, ja: boolean): string {
  if (signal.earned == null) return ja ? "未測定" : "Not measured";
  if (signal.id === "noindex" && signal.status === "observed_absent") {
    return ja ? "noindex は観測されませんでした" : "noindex was not observed";
  }
  if (signal.id === "noindex" && signal.status === "observed") {
    return ja ? "noindex が観測されました" : "noindex was observed";
  }
  if (signal.id === "canonical" && signal.status === "observed" && signal.earned === 0) {
    return ja ? "不一致" : "Mismatch";
  }
  if (signal.status === "observed_absent") return ja ? "記録なし" : "Not recorded";
  if (signal.status === "not_verifiable") return ja ? "確認できない" : "Not verifiable";
  return ja ? "記録あり" : "Recorded";
}

function seoBarColor(signal: PageSeoSignalResult): string {
  if (signal.earned == null) return "#a8a29e";
  if (signal.earned >= signal.weight) return "#276248";
  if (signal.earned > 0) return "#b45309";
  return "#be123c";
}

function SearchSocialScore({
  score,
  previousScore,
  locale,
}: {
  score: PageSeoDerivedV1;
  previousScore: PageSeoDerivedV1 | null;
  locale: "ja" | "en";
}) {
  const ja = locale === "ja";
  const measured = score.signals.filter((signal) => signal.earned != null);
  const excluded = score.signals.filter((signal) => signal.earned == null);
  const delta =
    previousScore?.score != null && score.score != null && previousScore.score !== score.score
      ? ja
        ? `前回 ${previousScore.score} → 今回 ${score.score}`
        : `Previous ${previousScore.score} → now ${score.score}`
      : previousScore?.score != null && score.score != null
        ? ja
          ? "前回の採点と同じです。"
          : "Same score as the previous capture."
        : null;

  return (
    <section className="mt-4 rounded-xl border border-border bg-white px-3 py-3" aria-label="Page SEO Score">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Page SEO Score</p>
          <p className="font-display text-3xl font-semibold tabular-nums text-ink">
            {score.score == null ? "—" : score.score}
            <span className="ml-1 text-base font-medium text-ink-muted">/ 100</span>
          </p>
        </div>
        <p className="max-w-xs text-xs leading-relaxed text-ink-muted">
          {ja
            ? `測定した ${score.measured_signals} 信号 · ${score.earned_points}/${score.possible_points} · ${score.scoring_version}。未測定は分母に入れていません。`
            : `${score.measured_signals} measured signals · ${score.earned_points}/${score.possible_points} · ${score.scoring_version}. Unmeasured signals stay out of the total.`}
        </p>
      </div>
      {delta ? <p className="mt-2 text-xs font-semibold text-ink">{delta}</p> : null}
      <ul className="mt-3 space-y-2">
        {measured.map((signal) => {
          const width = signal.weight > 0 ? Math.round(((signal.earned ?? 0) / signal.weight) * 100) : 0;
          return (
            <li key={signal.id}>
              <div className="flex items-baseline justify-between gap-3 text-sm text-ink">
                <span>{SEO_SIGNAL_LABEL[signal.id][locale]}</span>
                <span className="shrink-0 text-xs text-ink-muted">
                  {seoStatusText(signal, ja)} · {signal.earned ?? 0}/{signal.weight}
                </span>
              </div>
              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${width}%`, backgroundColor: seoBarColor(signal) }}
                />
              </span>
            </li>
          );
        })}
      </ul>
      {excluded.length > 0 ? (
        <p className="mt-3 text-xs text-ink-muted">
          {ja ? "未測定" : "Not measured"}
          {": "}
          {excluded.map((signal) => SEO_SIGNAL_LABEL[signal.id][locale]).join(" · ")}
        </p>
      ) : null}
    </section>
  );
}

export function ObservationHtmlHeadSignalsPanel({
  signals,
  copy,
  requestedUrl,
  previous,
  webFacts,
  previousWebFacts,
  seo,
  previousSeo,
  locale = "en",
}: Props) {
  if (!signals || !htmlHeadSignalsHasAny(signals)) return null;

  const view = presentSearchSocial({ signals, requestedUrl, previous });
  const seoScore = seo ?? pageSeoFromSignals(signals, webFacts);
  const previousSeoScore = previousSeo ?? (previous ? pageSeoFromSignals(previous, previousWebFacts) : null);
  const jsonLd = view.structured.length > 0 ? view.structured.join(", ") : "—";
  const ogDetected = Boolean(signals.og_title || signals.og_description || signals.og_image);
  const noindexLabel = signals.noindex === true ? copy.noindexPresent : signals.noindex === false ? copy.noindexAbsent : "—";
  const mismatchLabel =
    signals.canonical_mismatch === true
      ? copy.canonicalMismatch
      : signals.canonical_mismatch === false
        ? copy.canonicalMatch
        : "—";
  const httpLabel = signals.http_status != null && signals.http_status > 0 ? String(signals.http_status) : "—";
  const redirectState = redirected(requestedUrl, signals.final_url);
  const redirectLabel = redirectState === true ? copy.redirectYes : redirectState === false ? copy.redirectNo : "—";

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4 sm:col-span-2">
      <h2 className="text-sm font-semibold text-ink">{copy.title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">{copy.hint}</p>
      {seoScore ? (
        <SearchSocialScore score={seoScore} previousScore={previousSeoScore} locale={locale} />
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <ShareCard
          label={copy.searchCard}
          title={view.search.title}
          description={view.search.description}
          host={view.search.host}
          hint={copy.searchPreviewHint}
          titleId={auditEvidenceDomId("title")}
          descriptionId={auditEvidenceDomId("description")}
        />
        <section id={auditEvidenceDomId("og")} className="scroll-mt-28 overflow-hidden rounded-xl border border-border bg-white">
          <p className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{copy.socialCard}</p>
          <p className="px-3 pt-1 text-xs leading-relaxed text-ink-muted">{copy.ogPreviewHint}</p>
          {view.social.imageUrl ? (
            <div className="mt-3">
              <SavedSocialImage src={view.social.imageUrl} alt="" />
            </div>
          ) : null}
          <div className="px-3 py-3">
            <p className="text-sm font-semibold text-ink">{view.social.title || "—"}</p>
            {view.social.host ? <p className="mt-0.5 text-xs text-ink-muted">{view.social.host}</p> : null}
            <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-ink-muted">{view.social.description || "—"}</p>
          </div>
        </section>
      </div>
      {view.twitter ? (
        <div className="mt-3 max-w-md">
          <ShareCard
            label="Twitter / X"
            title={view.twitter.title}
            description={view.twitter.description}
            host={view.social.host}
            imageUrl={view.twitter.imageUrl}
          />
        </div>
      ) : null}

      {view.facts.length > 0 ? (
        <section className="mt-4" aria-label={copy.pageInfo}>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.pageInfo}</p>
          <ul className="mt-2 space-y-1 text-sm text-ink">
            {view.facts.map((fact) => (
              <li
                key={fact.kind === "card" ? `card:${fact.value}` : fact.kind}
                id={
                  fact.kind === "http"
                    ? auditEvidenceDomId("http_status")
                    : fact.kind === "lang"
                      ? auditEvidenceDomId("html_lang")
                      : fact.kind === "canonical"
                        ? auditEvidenceDomId("canonical")
                        : fact.kind === "noindex"
                          ? auditEvidenceDomId("noindex")
                          : undefined
                }
                className="scroll-mt-28"
              >
                {factText(fact, copy, locale)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {view.structured.length > 0 ? (
        <p className="mt-3 text-sm text-ink">
          <span className="text-ink-muted">{copy.structuredData}</span>
          {" · "}
          {view.structured.join(" · ")}
        </p>
      ) : null}

      <p className="mt-3 text-xs text-ink-muted">
        {copy.fieldsRecorded.replace("{n}", String(view.recordedCount))}
        {view.missing.length === 0 ? ` · ${copy.fieldsClear}` : ""}
      </p>
      {view.missing.length > 0 ? (
        <details className="mt-1">
          <summary className="cursor-pointer text-xs font-semibold text-ink">
            {countLine(view.missing.length, copy.fieldsMissing, copy.fieldsMissingOne)}
          </summary>
          <ul className="mt-1 list-disc pl-4 text-xs text-ink-muted">
            {view.missing.map((id) => (
              <li key={id}>{missingLabel(id, copy)}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {view.compared && view.changes.length === 0 ? (
        <p className="mt-3 text-xs text-ink-muted">{copy.unchangedSince}</p>
      ) : null}
      {view.changes.length > 0 ? (
        <section className="mt-4">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            {countLine(view.changes.length, copy.changes, copy.changesOne)}
          </p>
          <ul className="mt-2 space-y-3">
            {view.changes.map((change) => (
              <li key={change.id} className="rounded-lg border border-amber-200 bg-surface px-3 py-3 dark:border-amber-900/60">
                <p className="text-sm font-semibold text-ink">{changeLabel(change.id, copy)}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{copy.changeBefore}</p>
                    {change.image && change.before ? <SavedSocialImage src={change.before} alt="" /> : null}
                    <p className="mt-1 break-all text-xs text-ink">{change.image ? "" : changeValue(change.before, copy)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{copy.changeNow}</p>
                    {change.image && change.now ? <SavedSocialImage src={change.now} alt="" /> : null}
                    <p className="mt-1 break-all text-xs text-ink">{change.image ? "" : changeValue(change.now, copy)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-semibold text-ink-muted">{copy.technical}</summary>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-ink-muted">{copy.httpStatus}</dt>
          <dd className="mt-0.5 font-mono text-sm text-ink">{httpLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{copy.htmlLang}</dt>
          <dd className="mt-0.5 text-sm text-ink">{dash(signals.html_lang)}</dd>
        </div>
        <div id={auditEvidenceDomId("final_url")} className="scroll-mt-28 sm:col-span-2">
          <dt className="text-xs text-ink-muted">{copy.finalUrl}</dt>
          <dd className="mt-0.5 break-all font-mono text-xs text-ink">{dash(signals.final_url)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{copy.redirect}</dt>
          <dd className="mt-0.5 text-sm text-ink">{redirectLabel}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-ink-muted">{copy.documentTitle}</dt>
          <dd className="mt-0.5 text-sm text-ink">{withLength(signals.document_title, copy.chars)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-ink-muted">{copy.metaDescription}</dt>
          <dd className="mt-0.5 text-sm text-ink">
            {withLength(signals.meta_description, copy.chars)}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-ink-muted">{copy.canonical}</dt>
          <dd className="mt-0.5 break-all font-mono text-xs text-ink">{dash(signals.canonical_url)}</dd>
          <dd className="mt-0.5 text-xs text-ink-muted">{mismatchLabel}</dd>
        </div>
        <div id={auditEvidenceDomId("robots")} className="scroll-mt-28">
          <dt className="text-xs text-ink-muted">{copy.robotsMeta}</dt>
          <dd className="mt-0.5 break-all font-mono text-xs text-ink">{dash(signals.robots_meta)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{copy.xRobots}</dt>
          <dd className="mt-0.5 break-all font-mono text-xs text-ink">{dash(signals.x_robots_tag)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{copy.noindex}</dt>
          <dd className="mt-0.5 text-sm text-ink">{noindexLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{copy.viewport}</dt>
          <dd className="mt-0.5 break-all font-mono text-xs text-ink">{dash(signals.viewport)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{copy.openGraph}</dt>
          <dd className="mt-0.5 text-sm text-ink">{ogDetected ? copy.openGraphDetected : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{copy.twitterCard}</dt>
          <dd className="mt-0.5 text-sm text-ink">{dash(signals.twitter_card)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-ink-muted">{copy.ogTitle}</dt>
          <dd className="mt-0.5 text-sm text-ink">{dash(signals.og_title)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-ink-muted">{copy.ogDescription}</dt>
          <dd className="mt-0.5 text-sm text-ink">{dash(signals.og_description)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-ink-muted">{copy.ogImage}</dt>
          <dd className="mt-0.5 break-all font-mono text-xs text-ink">{dash(signals.og_image)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-ink-muted">{copy.twitterTitle}</dt>
          <dd className="mt-0.5 text-sm text-ink">{dash(signals.twitter_title)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-ink-muted">{copy.twitterDescription}</dt>
          <dd className="mt-0.5 text-sm text-ink">{dash(signals.twitter_description)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-ink-muted">{copy.twitterImage}</dt>
          <dd className="mt-0.5 break-all font-mono text-xs text-ink">{dash(signals.twitter_image)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-ink-muted">{copy.jsonLd}</dt>
          <dd className="mt-0.5 text-sm text-ink">{jsonLd}</dd>
        </div>
      </dl>
      </details>
    </div>
  );
}
