import {
  classifyHtmlHeadSignals,
  ogPreviewFromSignals,
  searchPreviewFromSignals,
  type HtmlSignalFactId,
} from "@/lib/observation-html-signals-readout";
import type { HtmlHeadSignalsV1 } from "@/lib/url-preview";
import { htmlHeadSignalsHasAny } from "@/lib/url-preview";

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
  };
}

type Props = {
  signals: HtmlHeadSignalsV1 | undefined;
  copy: ObservationHtmlHeadSignalsCopy;
  requestedUrl?: string;
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

function factLabel(
  id: HtmlSignalFactId,
  copy: ObservationHtmlHeadSignalsCopy,
  signals: HtmlHeadSignalsV1,
): string {
  switch (id) {
    case "noindex":
      return copy.blockerNoindex;
    case "http_error":
      return copy.blockerHttp.replace("{status}", String(signals.http_status ?? ""));
    case "canonical_mismatch":
      return copy.blockerCanonical;
    case "title_missing":
      return copy.gapTitle;
    case "description_missing":
      return copy.gapDescription;
    case "og_missing":
      return copy.gapOg;
  }
}

function FactList({
  heading,
  hint,
  ids,
  empty,
  copy,
  signals,
}: {
  heading: string;
  hint: string;
  ids: HtmlSignalFactId[];
  empty: string;
  copy: ObservationHtmlHeadSignalsCopy;
  signals: HtmlHeadSignalsV1;
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-surface px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{heading}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">{hint}</p>
      {ids.length === 0 ? (
        <p className="mt-2 text-sm text-ink">{empty}</p>
      ) : (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-ink">
          {ids.map((id) => (
            <li key={id}>{factLabel(id, copy, signals)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ObservationHtmlHeadSignalsPanel({ signals, copy, requestedUrl }: Props) {
  if (!signals || !htmlHeadSignalsHasAny(signals)) return null;

  const { blockers, gaps } = classifyHtmlHeadSignals(signals);
  const search = searchPreviewFromSignals(signals, requestedUrl);
  const og = ogPreviewFromSignals(signals);
  const jsonLd =
    signals.json_ld_types && signals.json_ld_types.length > 0
      ? signals.json_ld_types.join(", ")
      : "—";
  const ogDetected = Boolean(signals.og_title || signals.og_description || signals.og_image);
  const noindexLabel =
    signals.noindex === true
      ? copy.noindexPresent
      : signals.noindex === false
        ? copy.noindexAbsent
        : "—";
  const mismatchLabel =
    signals.canonical_mismatch === true
      ? copy.canonicalMismatch
      : signals.canonical_mismatch === false
        ? copy.canonicalMatch
        : "—";
  const httpLabel =
    signals.http_status != null && signals.http_status > 0 ? String(signals.http_status) : "—";
  const redirectState = redirected(requestedUrl, signals.final_url);
  const redirectLabel =
    redirectState === true ? copy.redirectYes : redirectState === false ? copy.redirectNo : "—";

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4 sm:col-span-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.title}</h2>
      <p className="mt-2 text-xs leading-relaxed text-ink-muted">{copy.hint}</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <FactList
          heading={copy.blockers}
          hint={copy.blockersHint}
          ids={blockers}
          empty={copy.bucketEmpty}
          copy={copy}
          signals={signals}
        />
        <FactList
          heading={copy.gaps}
          hint={copy.gapsHint}
          ids={gaps}
          empty={copy.bucketEmpty}
          copy={copy}
          signals={signals}
        />
        <div className="rounded-lg border border-border/80 bg-surface px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            {copy.recorded}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">{copy.recordedHint}</p>
        </div>
      </div>

      <details className="mt-4 rounded-lg border border-border/80 bg-surface px-3 py-2" open>
        <summary className="cursor-pointer text-xs font-semibold text-ink-muted">
          {copy.previewToggle}
        </summary>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              {copy.searchPreview}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">{copy.searchPreviewHint}</p>
            <div className="mt-2 rounded-lg border border-border bg-white px-3 py-2.5">
              <p className="text-sm font-medium text-[#1a0dab]">{search.title || "—"}</p>
              <p className="mt-0.5 text-xs text-[#006621]">{search.host || "—"}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#4d5156]">
                {search.description || "—"}
              </p>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              {copy.ogPreview}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">{copy.ogPreviewHint}</p>
            <div className="mt-2 rounded-lg border border-border bg-white px-3 py-2.5">
              <p className="text-sm font-semibold text-ink">{og.title || "—"}</p>
              <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-ink-muted">
                {og.description || "—"}
              </p>
              <p className="mt-2 break-all font-mono text-[11px] text-ink-muted">
                {og.imageUrl || "—"}
              </p>
              {og.twitterCard ? (
                <p className="mt-1 text-[11px] text-ink-muted">{og.twitterCard}</p>
              ) : null}
            </div>
          </div>
        </div>
      </details>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-ink-muted">{copy.httpStatus}</dt>
          <dd className="mt-0.5 font-mono text-sm text-ink">{httpLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{copy.htmlLang}</dt>
          <dd className="mt-0.5 text-sm text-ink">{dash(signals.html_lang)}</dd>
        </div>
        <div className="sm:col-span-2">
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
        <div>
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
    </div>
  );
}
