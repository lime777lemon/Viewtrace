/** LP の「ライブ確認」用。OG / title を HTML から取得。スクリーンショットは `url-preview-fetch` + Microlink で補完。 */

const MAX_HTML_BYTES = 900_000;

export function normalizeUserUrlInput(input: string): string | null {
  const raw = input.trim().replace(/\.+$/, "");
  if (!raw) return null;
  try {
    if (/^https?:\/\//i.test(raw)) {
      const u = new URL(raw);
      if (u.protocol !== "http:" && u.protocol !== "https:") return null;
      u.hash = "";
      return u.href;
    }
    const candidate = `https://${raw}`;
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

  if (h === "[::1]" || h.startsWith("[fe80:") || h.startsWith("[fc") || h.startsWith("[fd")) return true;

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
  const title = ogTitle || twTitle || rawTitle || null;

  const ogImage = metaContent(html, "og:image");
  const twImage = metaContent(html, "twitter:image");
  const rawImg = ogImage || twImage;
  const image = rawImg ? resolveUrl(rawImg, base) : null;

  return { title, image };
}

export async function readHtmlHeadForPreview(body: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!body) return "";
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    while (buf.length < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      if (/<\/head>/i.test(buf)) break;
    }
  } finally {
    reader.releaseLock();
  }
  return buf;
}
