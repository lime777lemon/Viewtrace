function clip(s, max) {
  if (s == null) return null;
  const t = String(s).replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

function metaContent(html, name) {
  const attr = name.includes(":") ? "property" : "name";
  const re = new RegExp(
    `<meta\\b[^>]*(?:${attr}=["']${name}["'][^>]*content=["']([^"']*)["']|content=["']([^"']*)["'][^>]*${attr}=["']${name}["'])[^>]*>`,
    "i",
  );
  const m = html.match(re);
  return clip(m?.[1] || m?.[2] || null, 2000);
}

function linkRelHref(html, rel) {
  const re = new RegExp(
    `<link\\b[^>]*(?:rel=["']${rel}["'][^>]*href=["']([^"']+)["']|href=["']([^"']+)["'][^>]*rel=["']${rel}["'])[^>]*>`,
    "i",
  );
  const m = html.match(re);
  return clip(m?.[1] || m?.[2] || null, 2000);
}

export function extractHtmlHeadSignals(html, responseUrl, httpStatus) {
  const titleTag = html.match(/<title[^>]*>([^<]{0,500})<\/title>/i);
  const robotsMeta = metaContent(html, "robots");
  const canonicalUrl = linkRelHref(html, "canonical");
  const finalUrl = clip(responseUrl, 2000);
  const lang = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1] ?? null;
  const noindex = robotsMeta ? /\bnoindex\b/i.test(robotsMeta) : null;

  return {
    document_title: clip(titleTag?.[1] ?? null, 300),
    meta_description: clip(metaContent(html, "description"), 400),
    canonical_url: canonicalUrl,
    robots_meta: robotsMeta,
    x_robots_tag: null,
    og_title: clip(metaContent(html, "og:title"), 300),
    og_description: clip(metaContent(html, "og:description"), 400),
    og_image: clip(metaContent(html, "og:image"), 2000),
    json_ld_types: [],
    html_lang: clip(lang, 32),
    viewport: clip(metaContent(html, "viewport"), 200),
    twitter_card: clip(metaContent(html, "twitter:card"), 64),
    twitter_title: clip(metaContent(html, "twitter:title"), 300),
    twitter_description: clip(metaContent(html, "twitter:description"), 400),
    twitter_image: clip(metaContent(html, "twitter:image"), 2000),
    http_status: typeof httpStatus === "number" && httpStatus > 0 ? httpStatus : null,
    final_url: finalUrl,
    noindex,
    canonical_mismatch: canonicalUrl && finalUrl ? canonicalUrl !== finalUrl : null,
  };
}
