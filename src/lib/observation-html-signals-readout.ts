import type { HtmlHeadSignalsV1 } from "@/lib/url-preview";

export type HtmlSignalFactId =
  | "noindex"
  | "http_error"
  | "canonical_mismatch"
  | "title_missing"
  | "description_missing"
  | "og_missing";

export type WatchMetadataNotifyField = "title" | "canonical" | "noindex";

function text(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function hostFromUrl(value: string | null | undefined): string {
  const raw = value?.trim();
  if (!raw) return "";
  try {
    return new URL(raw).hostname.replace(/\.$/, "").toLowerCase();
  } catch {
    return "";
  }
}

/** 保存済み JSON の事実だけ。スコアや診断ではない。 */
export function classifyHtmlHeadSignals(signals: HtmlHeadSignalsV1): {
  blockers: HtmlSignalFactId[];
  gaps: HtmlSignalFactId[];
} {
  const blockers: HtmlSignalFactId[] = [];
  const gaps: HtmlSignalFactId[] = [];

  if (signals.noindex === true) blockers.push("noindex");
  if (typeof signals.http_status === "number" && signals.http_status >= 400) {
    blockers.push("http_error");
  }
  if (signals.canonical_mismatch === true) blockers.push("canonical_mismatch");

  if (!text(signals.document_title)) gaps.push("title_missing");
  if (!text(signals.meta_description)) gaps.push("description_missing");
  if (!text(signals.og_title) && !text(signals.og_description) && !text(signals.og_image)) {
    gaps.push("og_missing");
  }

  return { blockers, gaps };
}

export function searchPreviewFromSignals(
  signals: HtmlHeadSignalsV1,
  requestedUrl?: string,
): { title: string; description: string; host: string } {
  return {
    title: text(signals.document_title),
    description: text(signals.meta_description),
    host:
      hostFromUrl(signals.final_url) ||
      hostFromUrl(signals.canonical_url) ||
      hostFromUrl(requestedUrl),
  };
}

export function ogPreviewFromSignals(signals: HtmlHeadSignalsV1): {
  title: string;
  description: string;
  imageUrl: string;
  twitterCard: string;
} {
  return {
    title: text(signals.og_title) || text(signals.twitter_title),
    description: text(signals.og_description) || text(signals.twitter_description),
    imageUrl: text(signals.og_image) || text(signals.twitter_image),
    twitterCard: text(signals.twitter_card),
  };
}

function noindexFlag(value: boolean | null | undefined): boolean {
  return value === true;
}

/** title / canonical / noindex だけ。どちらも保存済み JSON が無いときは比較しない。 */
export function watchMetadataChanged(
  previous: HtmlHeadSignalsV1 | undefined,
  current: HtmlHeadSignalsV1 | undefined,
): { changed: boolean; fields: WatchMetadataNotifyField[] } {
  if (!previous || !current) return { changed: false, fields: [] };

  const fields: WatchMetadataNotifyField[] = [];
  if (text(previous.document_title) !== text(current.document_title)) fields.push("title");
  if (text(previous.canonical_url) !== text(current.canonical_url)) fields.push("canonical");
  if (noindexFlag(previous.noindex) !== noindexFlag(current.noindex)) fields.push("noindex");

  return { changed: fields.length > 0, fields };
}

/** スクショ通知をすでに送った実行では、メタ差分メールは重ねない。 */
export function shouldNotifyWatchOnMetadata(params: {
  notifyOnMetadata: boolean;
  alreadyNotifiedThisRun: boolean;
  previous: HtmlHeadSignalsV1 | undefined;
  current: HtmlHeadSignalsV1 | undefined;
}): { send: boolean; fields: WatchMetadataNotifyField[] } {
  if (!params.notifyOnMetadata || params.alreadyNotifiedThisRun) {
    return { send: false, fields: [] };
  }
  const result = watchMetadataChanged(params.previous, params.current);
  return { send: result.changed, fields: result.fields };
}
