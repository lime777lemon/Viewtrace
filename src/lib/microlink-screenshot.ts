/**
 * OG 画像が無いページ向けに、Microlink API でビューポートのスクリーンショット URL を取得する。
 * @see https://microlink.io/docs/api/parameters/screenshot
 *
 * 任意: MICROLINK_API_KEY（レート上限緩和）
 * 無効化: VIEWTRACE_DISABLE_SCREENSHOT=1
 */

const MICROLINK_TIMEOUT_VIEWPORT_MS = 25_000;
const MICROLINK_TIMEOUT_FULL_PAGE_MS = 55_000;

/**
 * Chromium stitches `fullPage` internally and corrupts the shot past about
 * 16384 device pixels, painting the top of the page again where the footer
 * should be. Microlink's default scale is 2, so a normal desktop page crosses
 * that limit. Scale 1 keeps the same page under it. Do not inject a page
 * script here: that path returned the Open Graph card instead of the page.
 */
export const MICROLINK_FULL_PAGE_VIEWPORT = {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
} as const;

export async function fetchMicrolinkScreenshotUrl(
  pageUrl: string,
  options: { fullPage?: boolean; viewport?: { width: number; height: number } } = {},
): Promise<string | null> {
  const fullPage = options.fullPage === true;
  if (process.env.VIEWTRACE_DISABLE_SCREENSHOT === "1") return null;

  try {
    const parsed = new URL(pageUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  } catch {
    return null;
  }

  const api = new URL("https://api.microlink.io/");
  api.searchParams.set("url", pageUrl);
  api.searchParams.set("screenshot", "true");
  api.searchParams.set("meta", "false");
  if (fullPage) {
    api.searchParams.set("screenshot.fullPage", "true");
    api.searchParams.set(
      "viewport.width",
      String(options.viewport?.width ?? MICROLINK_FULL_PAGE_VIEWPORT.width),
    );
    api.searchParams.set(
      "viewport.height",
      String(options.viewport?.height ?? MICROLINK_FULL_PAGE_VIEWPORT.height),
    );
    api.searchParams.set(
      "viewport.deviceScaleFactor",
      String(MICROLINK_FULL_PAGE_VIEWPORT.deviceScaleFactor),
    );
  }

  const ac = new AbortController();
  const t = setTimeout(
    () => ac.abort(),
    fullPage ? MICROLINK_TIMEOUT_FULL_PAGE_MS : MICROLINK_TIMEOUT_VIEWPORT_MS,
  );

  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    const key = process.env.MICROLINK_API_KEY?.trim();
    if (key) headers["x-api-key"] = key;

    const res = await fetch(api.href, { signal: ac.signal, headers });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      status?: string;
      data?: { screenshot?: { url?: string } };
    };

    if (json.status !== "success") return null;
    const u = json.data?.screenshot?.url;
    if (typeof u !== "string" || u.length > 2048) return null;
    if (!/^https?:\/\//i.test(u)) return null;
    return u;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
