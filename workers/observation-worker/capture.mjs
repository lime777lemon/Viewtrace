/**
 * Playwright capture for Viewtrace Observation Worker.
 * Requested region is targeting only. Observed comes from an egress lookup
 * through the same browser context (same proxy). Provider labels are not Observed.
 */
import { chromium } from "playwright";
import { extractHtmlHeadSignals } from "./html-signals.mjs";
import {
  parseRegion,
  playwrightProxyFromUrl,
  resolveResidentialProxyUrl,
} from "./proxy.mjs";

export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";
export const ACCEPT_LANGUAGE = "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7";
const VIEWPORT = { width: 1280, height: 800 };
const GOTO_TIMEOUT_MS = 30_000;

export function isBlockedHost(url) {
  try {
    const h = new URL(url).hostname.replace(/\.$/, "").toLowerCase();
    if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return true;
    if (h === "127.0.0.1" || h === "0.0.0.0" || h === "::1") return true;
    if (h.endsWith(".internal") || h === "metadata.google.internal") return true;
    const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (m) {
      const [a, b] = m.slice(1).map(Number);
      if (a === 10 || a === 127 || a === 0) return true;
      if (a === 169 && b === 254) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
    }
    return false;
  } catch {
    return true;
  }
}

const US_STATE_NAME_TO_ABBR = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
};

function regionCodeFromLookup(raw) {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (/^[A-Z]{2}$/.test(t)) return t;
  const mapped = US_STATE_NAME_TO_ABBR[t.toLowerCase()];
  return mapped ?? null;
}

function emptyObserved() {
  return { ip: null, country: null, region: null, city: null };
}

function parseCfTrace(text) {
  return {
    ip: text.match(/^ip=(.+)$/m)?.[1]?.trim() || null,
    country: text.match(/^loc=([A-Z]{2})$/m)?.[1] || null,
  };
}

async function readPageText(page, url) {
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 8_000 });
  const body = await page.evaluate(() => document.body?.innerText ?? "");
  return { body, status: response?.status() ?? null };
}

/**
 * Independent egress facts, using the same Chromium context (and therefore the
 * same residential proxy) as the screenshot. Requested state is never copied.
 */
async function lookupEgressThroughContext(page) {
  const observed = emptyObserved();
  try {
    const { body } = await readPageText(page, "https://cloudflare.com/cdn-cgi/trace");
    const cf = parseCfTrace(body);
    observed.ip = cf.ip;
    observed.country = cf.country;
  } catch {
    /* keep nulls */
  }
  try {
    const { body } = await readPageText(page, "https://ipinfo.io/json");
    const json = JSON.parse(body);
    if (typeof json.ip === "string" && json.ip && !observed.ip) observed.ip = json.ip;
    if (typeof json.country === "string" && json.country.length === 2) {
      observed.country = json.country.toUpperCase();
    }
    const regionCode =
      regionCodeFromLookup(json.region_code) || regionCodeFromLookup(json.region);
    if (regionCode) observed.region = regionCode;
    if (typeof json.city === "string" && json.city.trim()) {
      observed.city = json.city.trim().slice(0, 80);
    }
  } catch {
    /* country from CF is enough; state stays null if this fails */
  }
  return observed;
}

export async function captureObservation({ url, region, fullPage }) {
  const started = Date.now();
  const requested = parseRegion(region);
  const proxyUrl = resolveResidentialProxyUrl(region);
  const playwrightProxy = playwrightProxyFromUrl(proxyUrl);

  if (isBlockedHost(url)) {
    return {
      ok: false,
      error: "blocked_host",
      requested,
      observed: emptyObserved(),
      via_residential_proxy: Boolean(playwrightProxy),
      duration_ms: Date.now() - started,
    };
  }

  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    proxy: playwrightProxy ?? undefined,
  });

  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      userAgent: USER_AGENT,
      extraHTTPHeaders: { "Accept-Language": ACCEPT_LANGUAGE },
    });
    const page = await context.newPage();
    const observed = await lookupEgressThroughContext(page);

    const response = await page.goto(url, {
      waitUntil: "networkidle",
      timeout: GOTO_TIMEOUT_MS,
    });
    const httpStatus = response?.status() ?? null;
    const finalUrl = page.url();
    const png = await page.screenshot({ type: "png", fullPage: Boolean(fullPage) });
    const html = await page.content();
    const htmlSignals = extractHtmlHeadSignals(html, finalUrl, httpStatus);

    return {
      ok: true,
      png,
      requested,
      observed,
      html_signals: htmlSignals,
      http_status: httpStatus,
      final_url: finalUrl,
      via_residential_proxy: Boolean(playwrightProxy),
      viewport: VIEWPORT,
      duration_ms: Date.now() - started,
      proxy_bytes: null,
    };
  } finally {
    await browser.close();
  }
}
