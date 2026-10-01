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
  };
}

type Props = {
  signals: HtmlHeadSignalsV1 | undefined;
  copy: ObservationHtmlHeadSignalsCopy;
};

function dash(value: string | null | undefined): string {
  const v = value?.trim();
  return v ? v : "—";
}

function withLength(value: string | null | undefined, charsLabel: string): string {
  const v = value?.trim();
  if (!v) return "—";
  return `${v} (${[...v].length} ${charsLabel})`;
}

export function ObservationHtmlHeadSignalsPanel({ signals, copy }: Props) {
  if (!signals || !htmlHeadSignalsHasAny(signals)) return null;

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

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4 sm:col-span-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.title}</h2>
      <p className="mt-2 text-xs leading-relaxed text-ink-muted">{copy.hint}</p>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
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
