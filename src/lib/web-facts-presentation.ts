import type {
  ObservationWebFactsV1,
  ObservationWebResourceFactV1,
} from "@/lib/observation-web-facts";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";

export type WebFactsTone = "ok" | "attention" | "neutral" | "unavailable";

export type WebFactsRow = {
  id: string;
  label: string;
  value: string;
  tone: WebFactsTone;
};

export type WebFactsBlock = {
  id: string;
  title: string;
  rows: WebFactsRow[];
};

export type WebFactsAttention = {
  id: string;
  title: string;
  detail: string;
};

export type WebFactsPresentation = {
  separation: string;
  http: { value: string; tone: WebFactsTone; url: string | null };
  sections: WebFactsBlock[];
  attentionTitle: string;
  attention: WebFactsAttention[];
  measuredLabel: string;
  measured: string;
  technicalLabel: string;
  technical: WebFactsBlock[];
  rawLabel: string;
  raw: WebFactsBlock[];
};

const HTTP_REASON: Record<number, string> = {
  200: "OK",
  201: "Created",
  204: "No Content",
  301: "Moved",
  302: "Found",
  304: "Not Modified",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
};

type Copy = {
  separation: string;
  web: string;
  server: string;
  https: string;
  secure: string;
  notSecure: string;
  robots: string;
  sitemap: string;
  security: string;
  dnsMail: string;
  dns: string;
  resolved: string;
  addresses: string;
  mail: string;
  spf: string;
  nameservers: string;
  found: string;
  notDetected: string;
  notAvailable: string;
  notVerifiable: string;
  notMeasured: string;
  attention: string;
  sitemapHost: string;
  httpStatus: string;
  httpsMissing: string;
  measured: string;
  technical: string;
  raw: string;
  headers: string;
  dnsRecords: string;
  mx: string;
  ns: string;
  txt: string;
  cname: string;
  caa: string;
  allow: string;
  disallow: string;
  userAgent: string;
  url: string;
  status: string;
  appLinks: string;
  apple: string;
  openid: string;
  mta: string;
  standards: string;
  htmlSample: string;
  measurement: string;
  resourceHashes: string;
  count: (n: number) => string;
};

const COPY: Record<"ja" | "en", Copy> = {
  ja: {
    separation: "スクリーンショットとは別です。指定地域からの画面ではありません。サーバーから直接取得した公開情報です。",
    web: "Web",
    server: "Server",
    https: "HTTPS",
    secure: "有効",
    notSecure: "HTTP のまま",
    robots: "robots.txt",
    sitemap: "Sitemap",
    security: "security.txt",
    dnsMail: "DNS とメール",
    dns: "DNS",
    resolved: "正常",
    addresses: "アドレス",
    mail: "メール",
    spf: "SPF",
    nameservers: "ネームサーバ",
    found: "あり",
    notDetected: "検出なし",
    notAvailable: "取得できず",
    notVerifiable: "確認できず",
    notMeasured: "未測定",
    attention: "注意",
    sitemapHost: "Sitemap が別のホストを指しています",
    httpStatus: "HTTP ステータス",
    httpsMissing: "HTTPS ではありません",
    measured: "取得",
    technical: "技術詳細",
    raw: "生の証拠",
    headers: "HTTP ヘッダ",
    dnsRecords: "DNS レコード",
    mx: "MX",
    ns: "NS",
    txt: "TXT",
    cname: "CNAME",
    caa: "CAA",
    allow: "Allow",
    disallow: "Disallow",
    userAgent: "User-agent",
    url: "URL",
    status: "状態",
    appLinks: "Android App Links",
    apple: "Apple App Site Association",
    openid: "OpenID",
    mta: "MTA-STS",
    standards: "その他の公開規格",
    htmlSample: "HTML サンプル",
    measurement: "取得元",
    resourceHashes: "ファイルのハッシュ",
    count: (n) => `${n}件`,
  },
  en: {
    separation: "Separate from the screenshot. Not the page seen from the requested region. Public records fetched directly from the server.",
    web: "Web",
    server: "Server",
    https: "HTTPS",
    secure: "Secure",
    notSecure: "Not HTTPS",
    robots: "robots.txt",
    sitemap: "Sitemap",
    security: "security.txt",
    dnsMail: "DNS & Mail",
    dns: "DNS",
    resolved: "Resolved",
    addresses: "Addresses",
    mail: "Mail",
    spf: "SPF",
    nameservers: "Nameservers",
    found: "Found",
    notDetected: "Not detected",
    notAvailable: "Not available",
    notVerifiable: "Not verifiable",
    notMeasured: "Not measured",
    attention: "Attention",
    sitemapHost: "Sitemap points to a different host",
    httpStatus: "HTTP status",
    httpsMissing: "HTTPS is not in use",
    measured: "Measured",
    technical: "Technical details",
    raw: "Raw evidence",
    headers: "HTTP headers",
    dnsRecords: "DNS records",
    mx: "MX records",
    ns: "NS records",
    txt: "TXT records",
    cname: "CNAME",
    caa: "CAA",
    allow: "Allow",
    disallow: "Disallow",
    userAgent: "User-agent",
    url: "URL",
    status: "Status",
    appLinks: "Android App Links",
    apple: "Apple App Site Association",
    openid: "OpenID",
    mta: "MTA-STS",
    standards: "Additional web standards",
    htmlSample: "HTML sample",
    measurement: "Measurement source",
    resourceHashes: "File hashes",
    count: (n) => (n === 1 ? "1 found" : `${n} found`),
  },
};

function hostnameOf(value: string, base?: string | null): string | null {
  try {
    return new URL(value, base ?? undefined).hostname.replace(/\.$/, "").toLowerCase();
  } catch {
    return null;
  }
}

function siteHost(host: string): string {
  return host.replace(/^www\./, "");
}

function mailProvider(mx: string[]): string | null {
  const hosts = mx.map((value) => value.replace(/^\d+\s+/, "").toLowerCase());
  if (hosts.some((host) => host.endsWith("google.com") || host.endsWith("googlemail.com"))) return "Google";
  if (hosts.some((host) => host.endsWith("outlook.com") || host.includes("protection.outlook"))) return "Microsoft";
  return null;
}

function nameserverProvider(records: string[]): string | null {
  const hosts = records.map((value) => value.toLowerCase());
  if (hosts.some((host) => host.endsWith("cloudflare.com"))) return "Cloudflare";
  if (hosts.some((host) => host.includes("awsdns"))) return "Amazon Route 53";
  if (hosts.some((host) => host.endsWith("domaincontrol.com"))) return "GoDaddy";
  if (hosts.some((host) => host.endsWith("googledomains.com") || host.endsWith("google.com"))) return "Google";
  return null;
}

function hasSpf(txt: string[]): boolean {
  return txt.some((value) => value.trim().toLowerCase().startsWith("v=spf1"));
}

function httpValue(status: number | null, copy: Copy): { value: string; tone: WebFactsTone } {
  if (status == null) return { value: copy.notMeasured, tone: "unavailable" };
  const reason = HTTP_REASON[status] ?? "";
  const label = reason ? `${status} · ${reason}` : String(status);
  if (status >= 200 && status < 300) return { value: `✓ ${label}`, tone: "ok" };
  if (status >= 400) return { value: label, tone: "attention" };
  return { value: label, tone: "neutral" };
}

function resourceWord(
  fact: ObservationWebResourceFactV1 | undefined,
  copy: Copy,
): { value: string; tone: WebFactsTone } {
  if (!fact) return { value: copy.notMeasured, tone: "unavailable" };
  if (fact.error === "dns_no_public_address" || fact.error === "forbidden_host") {
    return { value: copy.notVerifiable, tone: "unavailable" };
  }
  if (fact.error) return { value: copy.notAvailable, tone: "unavailable" };
  if (fact.present === true) return { value: `✓ ${copy.found}`, tone: "ok" };
  if (fact.present === false) return { value: copy.notDetected, tone: "neutral" };
  return { value: copy.notMeasured, tone: "unavailable" };
}

function statusLine(fact: ObservationWebResourceFactV1, copy: Copy): string {
  const word = resourceWord(fact, copy).value.replace(/^✓ /, "");
  const http = fact.status != null ? `HTTP ${fact.status}` : null;
  return [word, http].filter(Boolean).join(" · ");
}

function lines(values: string[]): string {
  return values.filter(Boolean).join("\n");
}

function differentSitemapHosts(facts: ObservationWebFactsV1): string[] {
  const pageHost = hostnameOf(facts.http.final_url ?? "") ?? facts.target_host.toLowerCase();
  const base = facts.robots.url || facts.http.final_url;
  const hosts = new Set<string>();
  for (const sitemap of facts.robots.directives.sitemaps) {
    const host = hostnameOf(sitemap, base);
    if (host && siteHost(host) !== siteHost(pageHost)) hosts.add(host);
  }
  return [...hosts];
}

function wellKnown(facts: ObservationWebFactsV1, key: ObservationWebResourceFactV1["key"]) {
  return facts.well_known.find((fact) => fact.key === key);
}

function detailRows(
  entries: Array<{ label: string; value: string | null | undefined }>,
): WebFactsRow[] {
  return entries.flatMap((entry, index) => {
    const value = entry.value?.trim();
    if (!value) return [];
    return [{ id: `${entry.label}-${index}`, label: entry.label, value, tone: "neutral" as const }];
  });
}

export function presentWebFacts(
  facts: ObservationWebFactsV1,
  locale: "ja" | "en",
): WebFactsPresentation {
  const copy = COPY[locale];
  const addresses = [...facts.dns.records.a, ...facts.dns.records.aaaa];
  const provider = mailProvider(facts.dns.records.mx);
  const nameservers = nameserverProvider(facts.dns.records.ns);
  const spf = hasSpf(facts.dns.records.txt);
  const sitemapHosts = differentSitemapHosts(facts);
  const sitemapCount = facts.robots.directives.sitemaps.length;
  const security = wellKnown(facts, "security_txt");
  const http = httpValue(facts.http.status, copy);
  const https = facts.http.final_url?.startsWith("https://")
    ? { value: copy.secure, tone: "ok" as const }
    : facts.http.final_url?.startsWith("http://")
      ? { value: copy.notSecure, tone: "attention" as const }
      : { value: copy.notMeasured, tone: "unavailable" as const };
  const robots = resourceWord(facts.robots, copy);
  const sitemap =
    facts.robots.error || facts.robots.present !== true
      ? resourceWord(facts.robots, copy)
      : sitemapCount === 0
        ? { value: copy.notDetected, tone: "neutral" as const }
        : sitemapHosts.length > 0
          ? { value: `⚠ ${copy.count(sitemapCount)}`, tone: "attention" as const }
          : { value: `✓ ${copy.count(sitemapCount)}`, tone: "ok" as const };

  const attention: WebFactsAttention[] = [];
  if (facts.http.status != null && facts.http.status >= 400) {
    attention.push({
      id: "http",
      title: `${copy.httpStatus} ${facts.http.status}`,
      detail: facts.http.final_url ?? "",
    });
  }
  if (facts.http.final_url?.startsWith("http://")) {
    attention.push({ id: "https", title: copy.httpsMissing, detail: facts.http.final_url });
  }
  if (sitemapHosts.length > 0) {
    attention.push({
      id: "sitemap-host",
      title: copy.sitemapHost,
      detail: sitemapHosts.join("\n"),
    });
  }

  const server = facts.http.headers.server?.trim();
  const observed = Number.isNaN(Date.parse(facts.observed_at))
    ? facts.observed_at
    : `${formatJaDateTime(facts.observed_at, locale)} JST`;

  const technical: WebFactsBlock[] = [
    {
      id: "headers",
      title: copy.headers,
      rows: detailRows(Object.entries(facts.http.headers).map(([label, value]) => ({ label, value }))),
    },
    {
      id: "addresses",
      title: copy.dnsRecords,
      rows: detailRows([{ label: "A / AAAA", value: lines(addresses) }]),
    },
    {
      id: "mx",
      title: copy.mx,
      rows: detailRows([{ label: "MX", value: lines(facts.dns.records.mx) }]),
    },
    {
      id: "ns",
      title: copy.ns,
      rows: detailRows([{ label: "NS", value: lines(facts.dns.records.ns) }]),
    },
    {
      id: "txt",
      title: copy.txt,
      rows: detailRows([{ label: "TXT", value: lines(facts.dns.records.txt) }]),
    },
    {
      id: "cname",
      title: copy.cname,
      rows: detailRows([{ label: "CNAME", value: lines(facts.dns.records.cname) }]),
    },
    {
      id: "caa",
      title: copy.caa,
      rows: detailRows([{ label: "CAA", value: lines(facts.dns.records.caa) }]),
    },
    {
      id: "robots",
      title: copy.robots,
      rows: detailRows([
        { label: copy.url, value: facts.robots.url },
        { label: copy.status, value: statusLine(facts.robots, copy) },
        { label: copy.userAgent, value: lines(facts.robots.directives.user_agents) },
        { label: copy.allow, value: lines(facts.robots.directives.allow) },
        { label: copy.disallow, value: lines(facts.robots.directives.disallow) },
        { label: "Sitemap", value: lines(facts.robots.directives.sitemaps) },
      ]),
    },
    {
      id: "standards",
      title: copy.standards,
      rows: [
        ["security_txt", copy.security],
        ["assetlinks_json", copy.appLinks],
        ["apple_app_site_association", copy.apple],
        ["openid_configuration", copy.openid],
        ["mta_sts_txt", copy.mta],
      ].flatMap(([key, label]) => {
        const fact = key === "security_txt" ? security : wellKnown(facts, key as ObservationWebResourceFactV1["key"]);
        if (!fact) return [];
        const reason = fact.error ? fact.error : null;
        return detailRows([
          { label, value: [statusLine(fact, copy), fact.url, reason].filter(Boolean).join("\n") },
        ]);
      }),
    },
  ].filter((block) => block.rows.length > 0);

  const hashRows = [facts.robots, ...facts.well_known].flatMap((fact) => {
    if (!fact.sha256) return [];
    return detailRows([{ label: fact.key, value: `${fact.sha256}\n${fact.bytes_read.toLocaleString()} bytes` }]);
  });

  const raw: WebFactsBlock[] = [
    {
      id: "html",
      title: copy.htmlSample,
      rows: detailRows([
        { label: "SHA-256", value: facts.html.sample_sha256 },
        { label: "bytes", value: facts.html.sample_bytes.toLocaleString() },
        { label: "hash_scope", value: facts.html.hash_scope },
        { label: "truncated", value: facts.html.sample_truncated ? "true" : "false" },
      ]),
    },
    {
      id: "source",
      title: copy.measurement,
      rows: detailRows([
        { label: "network_path", value: facts.network_path },
        { label: "resolver_scope", value: facts.dns.resolver_scope },
        { label: "via_proxy", value: facts.http.via_proxy == null ? null : String(facts.http.via_proxy) },
        { label: "observed_at", value: facts.observed_at },
        { label: "UTC", value: Number.isNaN(Date.parse(facts.observed_at)) ? null : formatUtcLabel(facts.observed_at) },
        { label: "dns_errors", value: lines(facts.dns.errors) },
      ]),
    },
    {
      id: "hashes",
      title: copy.resourceHashes,
      rows: hashRows,
    },
  ].filter((block) => block.rows.length > 0);

  return {
    separation: copy.separation,
    http: { ...http, url: facts.http.final_url },
    sections: [
      {
        id: "web",
        title: copy.web,
        rows: [
          { id: "server", label: copy.server, value: server || copy.notMeasured, tone: server ? "neutral" : "unavailable" },
          { id: "https", label: copy.https, value: https.value, tone: https.tone },
          { id: "robots", label: copy.robots, value: robots.value, tone: robots.tone },
          { id: "sitemap", label: copy.sitemap, value: sitemap.value, tone: sitemap.tone },
          { id: "security", label: copy.security, value: resourceWord(security, copy).value, tone: resourceWord(security, copy).tone },
        ],
      },
      {
        id: "dns",
        title: copy.dnsMail,
        rows: [
          {
            id: "dns",
            label: copy.dns,
            value: addresses.length > 0 ? `✓ ${copy.resolved}` : facts.dns.errors.length > 0 ? copy.notAvailable : copy.notDetected,
            tone: addresses.length > 0 ? "ok" : "unavailable",
          },
          { id: "addresses", label: copy.addresses, value: String(addresses.length), tone: "neutral" },
          {
            id: "mail",
            label: copy.mail,
            value: provider ?? (facts.dns.records.mx.length > 0 ? copy.count(facts.dns.records.mx.length) : copy.notDetected),
            tone: provider ? "ok" : "neutral",
          },
          {
            id: "spf",
            label: copy.spf,
            value: spf ? `✓ ${copy.found}` : copy.notDetected,
            tone: spf ? "ok" : "neutral",
          },
          {
            id: "ns",
            label: copy.nameservers,
            value: nameservers ?? (facts.dns.records.ns.length > 0 ? copy.count(facts.dns.records.ns.length) : copy.notDetected),
            tone: nameservers ? "ok" : "neutral",
          },
        ],
      },
    ],
    attentionTitle: copy.attention,
    attention,
    measuredLabel: copy.measured,
    measured: observed,
    technicalLabel: copy.technical,
    technical,
    rawLabel: copy.raw,
    raw,
  };
}
