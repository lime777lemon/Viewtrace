import { ProxyAgent } from "undici";

function parseRegion(regionValue: string): { country: string; state: string | null } {
  const v = regionValue.trim();
  if (!v) return { country: "", state: null };
  const m = v.match(/^([A-Z]{2})(?:-([A-Z]{2}))?$/i);
  if (!m) return { country: v, state: null };
  return { country: m[1]!.toUpperCase(), state: m[2] ? m[2].toUpperCase() : null };
}

function fillTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (_m, k: string) => vars[k] ?? "");
}

/**
 * 地域別の出口IPを持つHTTPプロキシを設定できる場合にのみ有効化される。
 *
 * - `VIEWTRACE_GEO_PROXY_URL`: 全地域共通のプロキシURL
 * - `VIEWTRACE_GEO_PROXY_URL_TEMPLATE`: 地域変数を埋め込めるテンプレート
 *   - 例: `http://user-country-{country}-state-{state}:{password}@proxy.example.com:10000`
 *   - `US-CA` → country=US, state=CA / `GB`・`JP` など → country のみ（state は空文字）
 *   - `{region}` は生の値（例 `US-CA`, `GB`）
 */
export function getGeoProxyAgent(regionValue: string): {
  dispatcher: ProxyAgent;
  proxyUrl: string;
} | null {
  const template = process.env.VIEWTRACE_GEO_PROXY_URL_TEMPLATE?.trim();
  const fixed = process.env.VIEWTRACE_GEO_PROXY_URL?.trim();

  const { country, state } = parseRegion(regionValue);
  const proxyUrl = template
    ? fillTemplate(template, {
        region: regionValue,
        country,
        state: state ?? "",
      }).trim()
    : fixed ?? "";

  if (!proxyUrl) return null;
  try {
    // validate
    // eslint-disable-next-line no-new
    new URL(proxyUrl);
  } catch {
    return null;
  }

  return { dispatcher: new ProxyAgent(proxyUrl), proxyUrl };
}

