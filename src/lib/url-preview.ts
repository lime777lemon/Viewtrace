/** LP の「ライブ確認」用。OG / title を HTML から取得。スクリーンショットは `url-preview-fetch` + Microlink で補完。 */

export const MAX_HTML_PREVIEW_CHARS = 900_000;

/** 貼り付け由来の BOM・不可視文字・全角英数記号を整える */
function stripAndNormalizeUrlInput(input: string): string {
  return input
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[\u00A0\u3000]/g, " ")
    .trim()
    .replace(/\.+$/, "");
}

export function normalizeUserUrlInput(input: string): string | null {
  const raw = stripAndNormalizeUrlInput(input);
  if (!raw) return null;
  try {
    if (/^https?:\/\//i.test(raw)) {
      const u = new URL(raw.replace(/ /g, "%20"));
      if (u.protocol !== "http:" && u.protocol !== "https:") return null;
      u.hash = "";
      return u.href;
    }
    const candidate = `https://${raw.replace(/ /g, "%20")}`;
    const u = new URL(candidate);
    if (!u.hostname.includes(".")) return null;
    u.hash = "";
    return u.href;
  } catch {
    return null;
  }
}

export function isBlockedPreviewHost(hostname: string): boolean {
  const h = hostname.replace(/\.$/, "").toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h.endsWith(".local")) return true;
  if (h === "metadata.google.internal") return true;

  const ipv6 = h.replace(/^\[|\]$/g, "");
  if (
    ipv6 === "::" ||
    ipv6 === "::1" ||
    ipv6.startsWith("fc") ||
    ipv6.startsWith("fd") ||
    /^fe[89ab]/.test(ipv6) ||
    ipv6.startsWith("ff") ||
    ipv6.startsWith("2001:db8:")
  ) {
    return true;
  }
  const mappedV4 = ipv6.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mappedV4) return isBlockedPreviewHost(mappedV4[1]);

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = h.match(ipv4);
  if (m) {
    const [a, b, c, d] = m.slice(1, 5).map((x) => Number(x));
    if ([a, b, c, d].some((n) => n > 255)) return true;
    if (a === 127 || a === 0) return true;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; /* RFC6598 */
    if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
    if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return true;
    if (a === 203 && b === 0 && c === 113) return true;
    if (a >= 224) return true;
  }

  if (h === "169.254.169.254") return true;

  return false;
}

function resolveUrl(src: string, base: URL): string | null {
  try {
    const s = src.trim();
    if (!s) return null;
    if (s.startsWith("//")) return new URL(`https:${s}`).href;
    return new URL(s, base).href;
  } catch {
    return null;
  }
}

function metaContent(html: string, prop: string): string | null {
  const esc = prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${esc}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${esc}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${esc}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${esc}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    const v = m?.[1]?.trim();
    if (v) return v;
  }
  return null;
}

function clipSignal(value: string | null | undefined, max: number): string | null {
  const v = value?.replace(/\s+/g, " ").trim();
  if (!v) return null;
  return v.length > max ? v.slice(0, max) : v;
}

function linkRelHref(html: string, rel: string): string | null {
  const esc = rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<link[^>]+rel=["']${esc}["'][^>]+href=["']([^"']+)["']`, "i"),
    new RegExp(`<link[^>]+href=["']([^"']+)["'][^>]+rel=["']${esc}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    const v = m?.[1]?.trim();
    if (v) return v;
  }
  return null;
}

function jsonLdTypesFromHead(html: string): string[] {
  const types: string[] = [];
  const seen = new Set<string>();
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) && types.length < 8) {
    const raw = match[1]?.trim();
    if (!raw || raw.length > 80_000) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      const stack: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
      while (stack.length && types.length < 8) {
        const node = stack.pop();
        if (!node || typeof node !== "object") continue;
        const rec = node as Record<string, unknown>;
        const t = rec["@type"];
        if (typeof t === "string") {
          const clipped = clipSignal(t, 64);
          if (clipped && !seen.has(clipped.toLowerCase())) {
            seen.add(clipped.toLowerCase());
            types.push(clipped);
          }
        } else if (Array.isArray(t)) {
          for (const item of t) {
            if (typeof item !== "string") continue;
            const clipped = clipSignal(item, 64);
            if (clipped && !seen.has(clipped.toLowerCase())) {
              seen.add(clipped.toLowerCase());
              types.push(clipped);
            }
            if (types.length >= 8) break;
          }
        }
        const graph = rec["@graph"];
        if (Array.isArray(graph)) stack.push(...graph);
      }
    } catch {
      /* ignore invalid JSON-LD */
    }
  }
  return types;
}

/** 取得済み HTML head から読むシグナル。追加リクエストなし。診断スコアではない。 */
export type HtmlHeadSignalsV1 = {
  document_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  robots_meta: string | null;
  x_robots_tag: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  json_ld_types: string[];
  html_lang?: string | null;
  viewport?: string | null;
  twitter_card?: string | null;
  twitter_title?: string | null;
  twitter_description?: string | null;
  twitter_image?: string | null;
  http_status?: number | null;
  final_url?: string | null;
  /** `<h1` の件数。body を見ていないときは付けない。 */
  h1_count?: number | null;
  /** complete はレスポンス終端まで見た。partial は上限で打ち切った。 */
  body_scan?: "complete" | "partial";
  /** robots / X-Robots-Tag に noindex があるか。どちらも無いときは null。 */
  noindex?: boolean | null;
  /** canonical があるとき、最終 URL と一致しないか。canonical 無しは null。 */
  canonical_mismatch?: boolean | null;
};

function htmlLangAttr(html: string): string | null {
  const quoted = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i);
  if (quoted?.[1]) return clipSignal(quoted[1], 32);
  const bare = html.match(/<html\b[^>]*\blang=([^\s>]+)/i);
  return clipSignal(bare?.[1]?.replace(/["']/g, "") ?? null, 32);
}

function robotsTokenNoindex(...parts: Array<string | null | undefined>): boolean | null {
  const joined = parts.filter((p): p is string => Boolean(p && p.trim())).join(",");
  if (!joined.trim()) return null;
  return /\bnoindex\b/i.test(joined);
}

function urlsLooselyEqual(a: string, b: string): boolean {
  const norm = (raw: string): string | null => {
    try {
      const u = new URL(raw);
      u.hash = "";
      let path = u.pathname;
      if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
      return `${u.protocol}//${u.host.toLowerCase()}${path}${u.search}`;
    } catch {
      return null;
    }
  };
  const na = norm(a);
  const nb = norm(b);
  if (na && nb) return na === nb;
  return a.trim() === b.trim();
}

function resolveMaybeUrl(raw: string | null, base: URL | null): string | null {
  if (!raw) return null;
  if (base) return clipSignal(resolveUrl(raw, base) ?? raw, 2000);
  return clipSignal(raw, 2000);
}

export function countHtmlH1(html: string): number {
  const matches = html.match(/<h1\b/gi);
  return matches ? Math.min(matches.length, 20) : 0;
}

export function extractHtmlHeadSignals(
  html: string,
  responseUrl: string,
  xRobotsTag?: string | null,
  httpStatus?: number | null,
  bodyScan?: { html?: string; complete?: boolean },
): HtmlHeadSignalsV1 {
  let base: URL | null = null;
  try {
    base = new URL(responseUrl);
  } catch {
    base = null;
  }

  const titleTag = html.match(/<title[^>]*>([^<]{0,500})<\/title>/i);
  const documentTitle = clipSignal(titleTag?.[1] ?? null, 300);
  const ogTitle = clipSignal(metaContent(html, "og:title"), 300);
  const ogDescription = clipSignal(metaContent(html, "og:description"), 400);
  const metaDescription = clipSignal(metaContent(html, "description"), 400);
  const robotsMeta = clipSignal(metaContent(html, "robots"), 200);
  const xRobots = clipSignal(xRobotsTag, 500);
  const rawCanonical = linkRelHref(html, "canonical");
  let canonicalUrl: string | null = clipSignal(rawCanonical, 2000);
  if (canonicalUrl && base) {
    canonicalUrl = resolveUrl(canonicalUrl, base) ?? canonicalUrl;
  }
  const rawOgImage = metaContent(html, "og:image");
  const rawTwImage = metaContent(html, "twitter:image");
  const finalUrl = clipSignal(responseUrl, 2000);
  const status =
    typeof httpStatus === "number" && httpStatus > 0 ? httpStatus : null;
  const scannedBody = bodyScan?.html ?? "";
  const jsonLdTypes = jsonLdTypesFromHead(`${html}\n${scannedBody}`);

  return {
    document_title: documentTitle,
    meta_description: metaDescription,
    canonical_url: canonicalUrl,
    robots_meta: robotsMeta,
    x_robots_tag: xRobots,
    og_title: ogTitle,
    og_description: ogDescription,
    og_image: resolveMaybeUrl(rawOgImage, base),
    json_ld_types: jsonLdTypes,
    ...(bodyScan
      ? {
          h1_count: countHtmlH1(html) + countHtmlH1(scannedBody),
          body_scan: bodyScan.complete ? ("complete" as const) : ("partial" as const),
        }
      : {}),
    html_lang: htmlLangAttr(html),
    viewport: clipSignal(metaContent(html, "viewport"), 200),
    twitter_card: clipSignal(metaContent(html, "twitter:card"), 64),
    twitter_title: clipSignal(metaContent(html, "twitter:title"), 300),
    twitter_description: clipSignal(metaContent(html, "twitter:description"), 400),
    twitter_image: resolveMaybeUrl(rawTwImage, base),
    http_status: status,
    final_url: finalUrl,
    noindex: robotsTokenNoindex(robotsMeta, xRobots),
    canonical_mismatch:
      canonicalUrl && finalUrl ? !urlsLooselyEqual(canonicalUrl, finalUrl) : null,
  };
}

export function htmlHeadSignalsHasAny(signals: HtmlHeadSignalsV1): boolean {
  return Boolean(
    signals.document_title ||
      signals.meta_description ||
      signals.canonical_url ||
      signals.robots_meta ||
      signals.x_robots_tag ||
      signals.og_title ||
      signals.og_description ||
      signals.og_image ||
      (signals.json_ld_types?.length ?? 0) > 0 ||
      signals.html_lang ||
      signals.viewport ||
      signals.twitter_card ||
      signals.twitter_title ||
      signals.twitter_description ||
      signals.twitter_image ||
      (signals.http_status != null && signals.http_status > 0) ||
      signals.noindex === true ||
      signals.canonical_mismatch === true,
  );
}

export function decodeHtmlText(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return text || null;
}

export function extractHtmlPreviewMeta(
  html: string,
  responseUrl: string,
): { title: string | null; image: string | null } {
  let base: URL;
  try {
    base = new URL(responseUrl);
  } catch {
    return { title: null, image: null };
  }

  const ogTitle = metaContent(html, "og:title");
  const twTitle = metaContent(html, "twitter:title");
  const titleTag = html.match(/<title[^>]*>([^<]{0,500})<\/title>/i);
  const rawTitle = titleTag?.[1]?.replace(/\s+/g, " ").trim() ?? null;
  const title = decodeHtmlText(ogTitle || twTitle || rawTitle);

  const ogImage = metaContent(html, "og:image");
  const twImage = metaContent(html, "twitter:image");
  const rawImg = ogImage || twImage;
  const image = rawImg ? resolveUrl(rawImg, base) : null;

  return { title, image };
}

/** `</head>` より後に、H1 と JSON-LD を見るための上限。ハッシュ対象の head には混ぜない。 */
export const HTML_BODY_SCAN_CHARS = 400_000;

export type HtmlPreviewDocument = {
  head: string;
  body: string;
  complete: boolean;
};

export async function readHtmlPreviewDocument(
  body: ReadableStream<Uint8Array> | null,
): Promise<HtmlPreviewDocument> {
  if (!body) return { head: "", body: "", complete: true };
  const reader = body.getReader();
  const dec = new TextDecoder();
  let head = "";
  let scannedBody = "";
  let mode: "head" | "body" = "head";
  let complete = false;
  try {
    while (head.length < MAX_HTML_PREVIEW_CHARS && scannedBody.length < HTML_BODY_SCAN_CHARS) {
      const { done, value } = await reader.read();
      if (done) {
        complete = true;
        const tail = dec.decode();
        if (tail) {
          if (mode === "head") head += tail;
          else scannedBody += tail;
        }
        break;
      }
      const chunk = dec.decode(value, { stream: true });
      if (mode === "head") {
        head += chunk;
        if (/<\/head>/i.test(head) || head.length >= MAX_HTML_PREVIEW_CHARS) mode = "body";
      } else {
        scannedBody += chunk;
      }
    }
  } finally {
    reader.releaseLock();
  }
  if (!complete && mode === "head" && head.length >= MAX_HTML_PREVIEW_CHARS) complete = false;
  return {
    head: head.slice(0, MAX_HTML_PREVIEW_CHARS),
    body: scannedBody.slice(0, HTML_BODY_SCAN_CHARS),
    complete,
  };
}

export async function readHtmlHeadForPreview(body: ReadableStream<Uint8Array> | null): Promise<string> {
  return (await readHtmlPreviewDocument(body)).head;
}
