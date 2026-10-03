import { chromium } from "playwright";

export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";

export async function lookupEgress() {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 4000);
  try {
    const res = await fetch("https://cloudflare.com/cdn-cgi/trace", {
      signal: ac.signal,
      headers: { "user-agent": USER_AGENT },
    });
    const text = await res.text();
    return {
      ip: text.match(/^ip=(.+)$/m)?.[1]?.trim() || null,
      observed_country: text.match(/^loc=([A-Z]{2})$/m)?.[1] || null,
    };
  } catch {
    return { ip: null, observed_country: null };
  } finally {
    clearTimeout(t);
  }
}

export async function captureUrl(url, fullPage) {
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      userAgent: USER_AGENT,
      extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7" },
    });
    const response = await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
    const png = await page.screenshot({ type: "png", fullPage });
    return {
      png,
      http_status: response?.status() ?? null,
      final_url: page.url(),
    };
  } finally {
    await browser.close();
  }
}
