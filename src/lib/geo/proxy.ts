import tls, { type ConnectionOptions } from "node:tls";
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
 *
 * TLS（プロキシ経由で origin の証明書チェーンが独自 CA になる場合）:
 * - `VIEWTRACE_GEO_PROXY_CA_PEM`: Bright Data 等から入手した PEM を **そのまま**（複数行可）
 *   - Vercel では 1 行にしたい場合は `\n` で改行をエスケープしても可
 * - Node のデフォルトルート CA に **追記**して検証する（通常の HTTPS も壊しにくい）
 */
function requestTlsWithOptionalProxyCa(): ConnectionOptions | undefined {
  const raw = process.env.VIEWTRACE_GEO_PROXY_CA_PEM?.trim();
  if (!raw) return undefined;
  const pem = raw.replace(/\\n/g, "\n").trim();
  if (!pem.includes("BEGIN")) return undefined;
  const ca: Buffer[] = tls.rootCertificates.map((c) => Buffer.from(c, "utf8"));
  ca.push(Buffer.from(pem, "utf8"));
  return { ca };
}

/**
 * Bright Data 等のプロキシ URL（HTTP CONNECT 用）。
 * - テンプレのみ: `regionValue` 必須（例 US-CA）
 * - 固定 URL のみ: `regionValue` 省略可
 */
export function resolveGeoProxyUrl(regionValue: string | undefined): string | null {
  const template = process.env.VIEWTRACE_GEO_PROXY_URL_TEMPLATE?.trim();
  const fixed = process.env.VIEWTRACE_GEO_PROXY_URL?.trim();

  if (template) {
    const rv = regionValue?.trim();
    if (!rv) return null;
    const { country, state } = parseRegion(rv);
    const proxyUrl = fillTemplate(template, {
      region: rv,
      country,
      state: state ?? "",
    }).trim();
    try {
      new URL(proxyUrl);
      return proxyUrl;
    } catch {
      return null;
    }
  }

  if (fixed) {
    try {
      new URL(fixed);
      return fixed;
    } catch {
      return null;
    }
  }

  return null;
}

export function getGeoProxyAgent(regionValue: string): {
  dispatcher: ProxyAgent;
  proxyUrl: string;
} | null {
  const proxyUrl = resolveGeoProxyUrl(regionValue);
  if (!proxyUrl) return null;

  const requestTls = requestTlsWithOptionalProxyCa();
  const dispatcher = requestTls
    ? new ProxyAgent({ uri: proxyUrl, requestTls })
    : new ProxyAgent(proxyUrl);

  return { dispatcher, proxyUrl };
}

