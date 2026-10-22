import { classifyHtmlHeadSignals } from "@/lib/observation-html-signals-readout";
import { decodeHtmlText, type HtmlHeadSignalsV1 } from "@/lib/url-preview";

export type SearchSocialFact =
  | { kind: "http"; status: number }
  | { kind: "lang"; code: string }
  | { kind: "canonical"; matches: boolean }
  | { kind: "viewport" }
  | { kind: "noindex"; observed: boolean }
  | { kind: "redirect"; observed: boolean }
  | { kind: "social" }
  | { kind: "card"; value: string };

export type SearchSocialChangeId =
  | "search_title"
  | "search_description"
  | "social_title"
  | "social_description"
  | "social_image"
  | "twitter_title"
  | "twitter_image"
  | "canonical"
  | "noindex"
  | "http"
  | "lang";

export type SearchSocialChange = {
  id: SearchSocialChangeId;
  before: string;
  now: string;
  image: boolean;
};

export type SearchSocialMissingId = "title" | "description" | "og";

export type SearchSocialPresentation = {
  search: { title: string; host: string; description: string };
  social: { title: string; description: string; imageUrl: string; host: string };
  twitter: { title: string; description: string; imageUrl: string; card: string } | null;
  facts: SearchSocialFact[];
  structured: string[];
  recordedCount: number;
  missing: SearchSocialMissingId[];
  compared: boolean;
  changes: SearchSocialChange[];
};

const LANG_NAMES: Record<string, { ja: string; en: string }> = {
  en: { ja: "英語", en: "English" },
  ja: { ja: "日本語", en: "Japanese" },
  ko: { ja: "韓国語", en: "Korean" },
  zh: { ja: "中国語", en: "Chinese" },
  "zh-cn": { ja: "中国語", en: "Chinese" },
  "zh-tw": { ja: "中国語", en: "Chinese" },
  fr: { ja: "フランス語", en: "French" },
  de: { ja: "ドイツ語", en: "German" },
  es: { ja: "スペイン語", en: "Spanish" },
  pt: { ja: "ポルトガル語", en: "Portuguese" },
};

export function searchSocialLanguageName(code: string, locale: "ja" | "en"): string {
  const key = code.trim().toLowerCase();
  const named = LANG_NAMES[key] ?? LANG_NAMES[key.split("-")[0] ?? ""];
  return named ? named[locale] : code.trim();
}

function plain(value: string | null | undefined): string {
  return decodeHtmlText(value)?.replace(/\s+/g, " ").trim() ?? "";
}

function hostFrom(value: string | null | undefined): string {
  const raw = value?.trim();
  if (!raw) return "";
  try {
    return new URL(raw).hostname.replace(/\.$/, "").toLowerCase();
  } catch {
    return "";
  }
}

export function safeHttpUrl(value: string | null | undefined): string {
  const raw = value?.trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
  } catch {
    return "";
  }
  return "";
}

function redirected(requestedUrl: string | undefined, finalUrl: string | null | undefined): boolean | null {
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

function recordedCount(signals: HtmlHeadSignalsV1): number {
  const values = [
    signals.document_title,
    signals.meta_description,
    signals.canonical_url,
    signals.robots_meta,
    signals.x_robots_tag,
    signals.og_title,
    signals.og_description,
    signals.og_image,
    signals.html_lang,
    signals.viewport,
    signals.twitter_card,
    signals.twitter_title,
    signals.twitter_description,
    signals.twitter_image,
    signals.final_url,
  ];
  let count = values.filter((value) => Boolean(value?.trim())).length;
  if ((signals.json_ld_types?.length ?? 0) > 0) count += 1;
  if (typeof signals.http_status === "number" && signals.http_status > 0) count += 1;
  if (signals.noindex != null) count += 1;
  return count;
}

function pushChange(
  changes: SearchSocialChange[],
  id: SearchSocialChangeId,
  before: string,
  now: string,
  image = false,
) {
  if (before === now) return;
  changes.push({ id, before, now, image });
}

export function diffSearchSocial(
  previous: HtmlHeadSignalsV1,
  current: HtmlHeadSignalsV1,
): SearchSocialChange[] {
  const changes: SearchSocialChange[] = [];
  pushChange(changes, "search_title", plain(previous.document_title), plain(current.document_title));
  pushChange(changes, "search_description", plain(previous.meta_description), plain(current.meta_description));
  pushChange(changes, "social_title", plain(previous.og_title), plain(current.og_title));
  pushChange(changes, "social_description", plain(previous.og_description), plain(current.og_description));
  pushChange(changes, "social_image", safeHttpUrl(previous.og_image), safeHttpUrl(current.og_image), true);
  pushChange(changes, "twitter_title", plain(previous.twitter_title), plain(current.twitter_title));
  pushChange(changes, "twitter_image", safeHttpUrl(previous.twitter_image), safeHttpUrl(current.twitter_image), true);
  pushChange(changes, "canonical", plain(previous.canonical_url), plain(current.canonical_url));
  pushChange(
    changes,
    "noindex",
    previous.noindex === true ? "observed" : "not_observed",
    current.noindex === true ? "observed" : "not_observed",
  );
  pushChange(
    changes,
    "http",
    previous.http_status != null && previous.http_status > 0 ? String(previous.http_status) : "",
    current.http_status != null && current.http_status > 0 ? String(current.http_status) : "",
  );
  pushChange(changes, "lang", plain(previous.html_lang), plain(current.html_lang));
  return changes;
}

/** Saved html_signals only. No score and no extra fetch. */
export function presentSearchSocial(input: {
  signals: HtmlHeadSignalsV1;
  requestedUrl?: string;
  previous?: HtmlHeadSignalsV1 | null;
}): SearchSocialPresentation {
  const signals = input.signals;
  const searchHost =
    hostFrom(signals.final_url) || hostFrom(signals.canonical_url) || hostFrom(input.requestedUrl);
  const socialImage = safeHttpUrl(signals.og_image);
  const twitterImage = safeHttpUrl(signals.twitter_image);
  const socialTitle = plain(signals.og_title);
  const socialDescription = plain(signals.og_description);
  const twitterTitle = plain(signals.twitter_title);
  const twitterDescription = plain(signals.twitter_description);
  const twitterDiffers =
    Boolean(twitterTitle || twitterDescription || twitterImage || signals.twitter_card) &&
    (twitterTitle !== plain(signals.og_title) ||
      twitterDescription !== plain(signals.og_description) ||
      (twitterImage !== "" && twitterImage !== socialImage));

  const facts: SearchSocialFact[] = [];
  if (typeof signals.http_status === "number" && signals.http_status > 0) {
    facts.push({ kind: "http", status: signals.http_status });
  }
  if (plain(signals.html_lang)) facts.push({ kind: "lang", code: plain(signals.html_lang) });
  if (signals.canonical_mismatch === true) facts.push({ kind: "canonical", matches: false });
  if (signals.canonical_mismatch === false) facts.push({ kind: "canonical", matches: true });
  if (plain(signals.viewport)) facts.push({ kind: "viewport" });
  facts.push({ kind: "noindex", observed: signals.noindex === true });
  const redirect = redirected(input.requestedUrl, signals.final_url);
  if (redirect != null) facts.push({ kind: "redirect", observed: redirect });
  if (plain(signals.og_title) || plain(signals.og_description) || socialImage) facts.push({ kind: "social" });
  if (plain(signals.twitter_card)) facts.push({ kind: "card", value: plain(signals.twitter_card) });

  const gaps = classifyHtmlHeadSignals(signals).gaps;
  const missing: SearchSocialMissingId[] = [];
  if (gaps.includes("title_missing")) missing.push("title");
  if (gaps.includes("description_missing")) missing.push("description");
  if (gaps.includes("og_missing")) missing.push("og");

  return {
    search: {
      title: plain(signals.document_title),
      host: searchHost,
      description: plain(signals.meta_description),
    },
    social: {
      title: socialTitle,
      description: socialDescription,
      imageUrl: socialImage,
      host: searchHost,
    },
    twitter: twitterDiffers
      ? {
          title: twitterTitle,
          description: twitterDescription,
          imageUrl: twitterImage,
          card: plain(signals.twitter_card),
        }
      : null,
    facts,
    structured: signals.json_ld_types?.filter((type) => type.trim()) ?? [],
    recordedCount: recordedCount(signals),
    missing,
    compared: Boolean(input.previous),
    changes: input.previous ? diffSearchSocial(input.previous, signals) : [],
  };
}
