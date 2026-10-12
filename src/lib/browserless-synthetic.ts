import {
  BROWSER_LIKE_ACCEPT_LANGUAGE,
  BROWSER_LIKE_USER_AGENT,
} from "@/lib/browser-fingerprint";
import { resolveGeoProxyUrl } from "@/lib/geo/proxy";
import {
  buildBrowserlessResidentialSearchParams,
  isBrowserlessConfigured,
  isBrowserlessProxyStateEnabled,
  isBrowserlessResidentialEnabled,
} from "@/lib/browserless-screenshot";
import { isValidObservationRegion, resolveBrowserlessResidentialTarget } from "@/lib/regions";
import { parseMeasuredProxyBytes } from "@/lib/observation-cost-signals";
import { isBlockedPreviewHost, normalizeUserUrlInput } from "@/lib/url-preview";
import {
  SYNTHETIC_MAX_CLICKS,
  SYNTHETIC_UNSAFE_PATTERN_SOURCE,
  parseSyntheticFromFunctionBody,
  type SyntheticInteractionV1,
} from "@/lib/observation-synthetic-interaction";

const DEFAULT_BROWSERLESS_FUNCTION = "https://production-sfo.browserless.io/function";
const FUNCTION_TIMEOUT_MS = 45_000;

export type BrowserlessSyntheticResult =
  | { ok: true; synthetic: SyntheticInteractionV1; durationMs: number; proxyBytes: number | null }
  | { ok: false; error: string; durationMs: number; proxyBytes: number | null; detail?: string };

function functionEndpointWithToken(): string | null {
  const token = process.env.BROWSERLESS_TOKEN?.trim();
  if (!token) return null;
  const screenshot = process.env.BROWSERLESS_SCREENSHOT_URL?.trim();
  let href = DEFAULT_BROWSERLESS_FUNCTION;
  if (screenshot) {
    try {
      const parsed = new URL(screenshot);
      parsed.pathname = parsed.pathname.replace(/\/screenshot\/?$/, "/function");
      if (!/function/i.test(parsed.pathname)) parsed.pathname = "/function";
      href = parsed.origin + parsed.pathname;
    } catch {
      href = DEFAULT_BROWSERLESS_FUNCTION;
    }
  }
  try {
    const endpoint = new URL(href);
    endpoint.searchParams.set("token", token);
    return endpoint.href;
  } catch {
    return null;
  }
}

function applyResidential(
  endpoint: URL,
  regionRaw: string,
  includeState: boolean,
  includeCity: boolean,
): boolean {
  const params = buildBrowserlessResidentialSearchParams(regionRaw, includeState, includeCity);
  if (!params) return false;
  for (const [key, value] of params.entries()) {
    endpoint.searchParams.set(key, value);
  }
  return true;
}

function readProxyBytes(headers: Headers): number | null {
  const names = [
    "x-proxy-bytes",
    "x-browserless-proxy-bytes",
    "browserless-proxy-bytes",
    "x-proxy-bandwidth",
  ];
  for (const name of names) {
    const parsed = parseMeasuredProxyBytes(headers.get(name));
    if (parsed != null) return parsed;
  }
  return null;
}

export function buildSyntheticFunctionCode(): string {
  const ua = JSON.stringify(BROWSER_LIKE_USER_AGENT);
  const lang = JSON.stringify(BROWSER_LIKE_ACCEPT_LANGUAGE);
  const unsafe = JSON.stringify(SYNTHETIC_UNSAFE_PATTERN_SOURCE);
  const max = String(SYNTHETIC_MAX_CLICKS);
  return `export default async function({ page, context }) {
  const url = String(context && context.url ? context.url : "");
  const UNSAFE_SOURCE = ${unsafe};
  const MAX = ${max};
  await page.setUserAgent(${ua});
  await page.setExtraHTTPHeaders({ "Accept-Language": ${lang} });
  await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
  const found = await page.evaluate((unsafeSource, maxClicks) => {
    const UNSAFE = new RegExp(unsafeSource, "i");
    function visible(el) {
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return false;
      const st = getComputedStyle(el);
      if (st.visibility === "hidden" || st.display === "none" || Number(st.opacity) === 0) return false;
      return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    }
    function cssPath(el) {
      if (el.id) return "#" + CSS.escape(el.id);
      const parts = [];
      let node = el;
      while (node && node.nodeType === 1 && parts.length < 5) {
        let sel = node.tagName.toLowerCase();
        const parent = node.parentElement;
        if (parent) {
          const same = [...parent.children].filter((c) => c.tagName === node.tagName);
          if (same.length > 1) sel += ":nth-of-type(" + (same.indexOf(node) + 1) + ")";
        }
        parts.unshift(sel);
        node = parent;
      }
      return parts.join(" > ");
    }
    const origin = location.origin;
    const nodes = Array.from(document.querySelectorAll("a, button, [role='button']"));
    let skipped = 0;
    const scored = [];
    for (const el of nodes) {
      if (!(el instanceof HTMLElement)) continue;
      if (!visible(el)) continue;
      const text = (el.innerText || el.getAttribute("aria-label") || "").replace(/\\s+/g, " ").trim().slice(0, 80);
      const href = el instanceof HTMLAnchorElement ? el.href : (el.getAttribute("href") || "");
      const type = (el.getAttribute("type") || "").toLowerCase();
      const blob = [text, href, el.id, String(el.className)].join(" ");
      if (type === "submit" || type === "reset") { skipped += 1; continue; }
      if (el.closest("form")) { skipped += 1; continue; }
      if (el.getAttribute("target") === "_blank") { skipped += 1; continue; }
      if (UNSAFE.test(blob)) { skipped += 1; continue; }
      if (href) {
        try {
          const u = new URL(href, location.href);
          if (u.origin !== origin) { skipped += 1; continue; }
        } catch {
          skipped += 1;
          continue;
        }
      }
      const inNav = Boolean(el.closest("nav, header, [role='navigation']"));
      const kind = inNav ? "nav" : (el.tagName.toLowerCase() === "a" ? "link" : "button");
      const label = text || (inNav ? "Navigation" : kind === "link" ? "Link" : "Button");
      scored.push({ selector: cssPath(el), label, kind, inNav });
    }
    scored.sort((a, b) => Number(b.inNav) - Number(a.inNav));
    const unique = [];
    const seen = new Set();
    for (const row of scored) {
      if (seen.has(row.selector)) continue;
      seen.add(row.selector);
      unique.push(row);
      if (unique.length >= maxClicks) break;
    }
    return { candidates: unique, skipped_unsafe: skipped };
  }, UNSAFE_SOURCE, MAX);
  const interactions = [];
  for (const c of found.candidates || []) {
    const before = page.url();
    try {
      await page.evaluate(() => { window.__vtClickStart = performance.now(); });
      await page.click(c.selector, { timeout: 4000 });
      const latency_ms = await page.evaluate(() => new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve(Math.round(performance.now() - (window.__vtClickStart || 0)));
          });
        });
      }));
      const navigated = page.url() !== before;
      interactions.push({ label: c.label, kind: c.kind, latency_ms, navigated, error: null });
      if (navigated) {
        await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      }
    } catch {
      interactions.push({ label: c.label, kind: c.kind, latency_ms: null, navigated: false, error: "click_failed" });
      try { await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 }); } catch (_) {}
    }
  }
  return { data: { interactions, skipped_unsafe: found.skipped_unsafe || 0 }, type: "application/json" };
}`;
}

async function runOnce(params: {
  url: string;
  region?: string;
  disableProxy?: boolean;
  residentialState?: boolean;
  residentialCity?: boolean;
}): Promise<BrowserlessSyntheticResult> {
  const endpointHref = functionEndpointWithToken();
  if (!endpointHref) {
    return { ok: false, error: "browserless_not_configured", durationMs: 0, proxyBytes: null };
  }

  const target = normalizeUserUrlInput(params.url);
  if (!target) return { ok: false, error: "invalid_url", durationMs: 0, proxyBytes: null };
  try {
    const parsed = new URL(target);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: "invalid_url", durationMs: 0, proxyBytes: null };
    }
    if (isBlockedPreviewHost(parsed.hostname)) {
      return { ok: false, error: "forbidden_host", durationMs: 0, proxyBytes: null };
    }
  } catch {
    return { ok: false, error: "invalid_url", durationMs: 0, proxyBytes: null };
  }

  const disableProxy = params.disableProxy === true;
  const regionRaw = params.region?.trim() ?? "";
  const hasGeoTemplate = Boolean(process.env.VIEWTRACE_GEO_PROXY_URL_TEMPLATE?.trim());
  const hasGeoFixed = Boolean(process.env.VIEWTRACE_GEO_PROXY_URL?.trim());
  const wantsExternal = hasGeoTemplate || hasGeoFixed;
  const geoProxy = disableProxy
    ? null
    : resolveGeoProxyUrl(hasGeoTemplate ? regionRaw : regionRaw || undefined);
  if (wantsExternal && !disableProxy && !geoProxy) {
    return { ok: false, error: "geo_proxy_misconfigured", durationMs: 0, proxyBytes: null };
  }

  const endpoint = new URL(endpointHref);
  endpoint.searchParams.set("timeout", String(FUNCTION_TIMEOUT_MS));
  if (geoProxy) {
    endpoint.searchParams.set("externalProxyServer", geoProxy);
  } else if (
    !disableProxy &&
    isBrowserlessResidentialEnabled() &&
    regionRaw &&
    isValidObservationRegion(regionRaw)
  ) {
    applyResidential(
      endpoint,
      regionRaw,
      params.residentialState === true,
      params.residentialCity === true,
    );
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FUNCTION_TIMEOUT_MS);
  const startedAt = Date.now();
  let upstream: Response;
  try {
    upstream = await fetch(endpoint.href, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        code: buildSyntheticFunctionCode(),
        context: { url: target },
      }),
      signal: ac.signal,
    });
  } catch {
    clearTimeout(timer);
    return {
      ok: false,
      error: "browserless_network_error",
      durationMs: Date.now() - startedAt,
      proxyBytes: null,
    };
  } finally {
    clearTimeout(timer);
  }

  const durationMs = Date.now() - startedAt;
  const proxyBytes = readProxyBytes(upstream.headers);
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return {
      ok: false,
      error: "browserless_error",
      durationMs,
      proxyBytes,
      detail: detail.slice(0, 500),
    };
  }

  let raw: unknown;
  try {
    raw = await upstream.json();
  } catch {
    return { ok: false, error: "unexpected_response", durationMs, proxyBytes };
  }

  const measuredAt = new Date().toISOString();
  const synthetic = parseSyntheticFromFunctionBody(raw, {
    requestedUrl: target,
    measuredAt,
    durationMs,
    proxyBytes,
  });
  return { ok: true, synthetic, durationMs, proxyBytes };
}

function geoRequested(regionRaw: string | undefined, disableProxy: boolean): boolean {
  if (disableProxy) return false;
  if (process.env.VIEWTRACE_GEO_PROXY_URL_TEMPLATE?.trim() || process.env.VIEWTRACE_GEO_PROXY_URL?.trim()) {
    return true;
  }
  if (!regionRaw?.trim()) return false;
  return isBrowserlessResidentialEnabled() && isValidObservationRegion(regionRaw);
}

function retryableDeny(result: BrowserlessSyntheticResult): boolean {
  if (result.ok) return false;
  return result.error === "browserless_error";
}

/** 撮影と同じ順: 都市 →（任意）州 → 国 → プロキシなし。Observed geo は書き換えない。 */
export async function runBrowserlessSyntheticWithProxyRetry(params: {
  url: string;
  region?: string;
}): Promise<BrowserlessSyntheticResult> {
  if (!isBrowserlessConfigured()) {
    return { ok: false, error: "browserless_not_configured", durationMs: 0, proxyBytes: null };
  }

  const geo = geoRequested(params.region, false);
  const target = resolveBrowserlessResidentialTarget(params.region ?? "");
  const hasUsState = Boolean(target?.stateCode);
  const tryCity = geo && hasUsState && Boolean(target?.city);
  const tryState = geo && hasUsState && isBrowserlessProxyStateEnabled() && !tryCity;

  if (tryCity) {
    const city = await runOnce({ ...params, residentialCity: true, residentialState: false });
    if (city.ok || !retryableDeny(city)) return city;
  }
  if (tryState) {
    const state = await runOnce({ ...params, residentialState: true, residentialCity: false });
    if (state.ok || !retryableDeny(state)) return state;
  }
  if (geo) {
    const country = await runOnce({
      ...params,
      residentialState: false,
      residentialCity: false,
      disableProxy: false,
    });
    if (country.ok || !retryableDeny(country)) return country;
    return runOnce({ ...params, disableProxy: true });
  }
  return runOnce(params);
}
