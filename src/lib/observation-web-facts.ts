import { createHash } from "node:crypto";
import {
  resolve4,
  resolve6,
  resolveCaa,
  resolveCname,
  resolveMx,
  resolveNs,
  resolveTxt,
} from "node:dns/promises";
import { isIP } from "node:net";
import { getDomain } from "tldts";
import { BROWSER_LIKE_HEADERS } from "@/lib/browser-fingerprint";
import { isBlockedPreviewHost } from "@/lib/url-preview";
import { ATTR, setSpanAttrs, urlHostAttr, withSpan } from "@/lib/otel/trace";

export const OBSERVATION_WEB_FACTS_SCHEMA_VERSION = 1 as const;
export const WEB_FACTS_RESOURCE_MAX_BYTES = 128 * 1024;
export const WEB_FACTS_DNS_RECORD_LIMIT = 20;
const WEB_FACTS_FETCH_TIMEOUT_MS = 5_000;
const WEB_FACTS_REDIRECT_LIMIT = 3;
const WEB_FACTS_VALUE_MAX_CHARS = 500;

export type ObservationWebFactError =
  | "dns_no_public_address"
  | "forbidden_host"
  | "invalid_url"
  | "network_error"
  | "redirect_limit"
  | "timeout";

export type ObservationWebResourceFactV1 = {
  key:
    | "robots_txt"
    | "security_txt"
    | "assetlinks_json"
    | "apple_app_site_association"
    | "openid_configuration"
    | "mta_sts_txt";
  url: string;
  alternate_url?: string;
  status: number | null;
  present: boolean | null;
  content_type: string | null;
  bytes_read: number;
  sha256: string | null;
  truncated: boolean;
  redirects: string[];
  error: ObservationWebFactError | null;
};

export type ObservationRobotsGroupV1 = {
  user_agents: string[];
  allow: string[];
  disallow: string[];
};

export type ObservationRobotsDirectivesV1 = {
  user_agents: string[];
  allow: string[];
  disallow: string[];
  sitemaps: string[];
  groups: ObservationRobotsGroupV1[];
};

export type ObservationDnsFactsV1 = {
  hostname: string;
  resolver_scope: "server_system";
  records: {
    a: string[];
    aaaa: string[];
    cname: string[];
    mx: string[];
    ns: string[];
    txt: string[];
    caa: string[];
  };
  errors: string[];
  truncated: boolean;
};

export type ObservationWebFactsPreviewV1 = {
  status: number;
  final_url: string;
  via_proxy: boolean;
  headers: Record<string, string>;
  html_sample_sha256: string | null;
  html_sample_bytes: number;
  html_sample_truncated: boolean;
};

export type ObservationWebFactsV1 = {
  schema_version: typeof OBSERVATION_WEB_FACTS_SCHEMA_VERSION;
  observed_at: string;
  target_host: string;
  network_path: "server_direct";
  note: "Separate from screenshot capture and requested region";
  html: {
    sample_sha256: string | null;
    sample_bytes: number;
    sample_truncated: boolean;
    hash_scope: "head_or_prefix";
  };
  http: {
    status: number | null;
    final_url: string | null;
    via_proxy: boolean | null;
    headers: Record<string, string>;
  };
  dns: ObservationDnsFactsV1;
  robots: ObservationWebResourceFactV1 & {
    directives: ObservationRobotsDirectivesV1;
  };
  well_known: ObservationWebResourceFactV1[];
};

export type CollectObservationWebFactsInput = {
  target: string;
  observedAt: string;
  preview?: ObservationWebFactsPreviewV1;
};

const SAFE_HTTP_HEADERS = new Set([
  "cache-control",
  "content-language",
  "content-security-policy",
  "content-type",
  "location",
  "permissions-policy",
  "referrer-policy",
  "server",
  "strict-transport-security",
  "x-content-type-options",
  "x-frame-options",
  "x-robots-tag",
]);

function clip(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, WEB_FACTS_VALUE_MAX_CHARS);
}

function cap(values: string[]): { values: string[]; truncated: boolean } {
  const normalized = values.map(clip).filter(Boolean);
  return {
    values: normalized.slice(0, WEB_FACTS_DNS_RECORD_LIMIT),
    truncated: normalized.length > WEB_FACTS_DNS_RECORD_LIMIT,
  };
}

function errorCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err && typeof err.code === "string") {
    return err.code.slice(0, 80);
  }
  return err instanceof Error ? err.name.slice(0, 80) : "unknown";
}

async function settledStrings<T>(
  promise: Promise<T>,
  format: (value: T) => string[],
): Promise<{ values: string[]; error: string | null; truncated: boolean }> {
  try {
    const result = cap(format(await promise));
    return { ...result, error: null };
  } catch (err) {
    return { values: [], error: errorCode(err), truncated: false };
  }
}

export async function collectDnsFacts(hostname: string): Promise<ObservationDnsFactsV1> {
  const host = hostname.replace(/\.$/, "").toLowerCase();
  const [a, aaaa, cname, mx, ns, txt, caa] = await Promise.all([
    settledStrings(resolve4(host), (v) => v),
    settledStrings(resolve6(host), (v) => v),
    settledStrings(resolveCname(host), (v) => v),
    settledStrings(resolveMx(host), (v) =>
      v.map((record) => `${record.priority} ${record.exchange}`),
    ),
    settledStrings(resolveNs(host), (v) => v),
    settledStrings(resolveTxt(host), (v) => v.map((parts) => parts.join(""))),
    settledStrings(resolveCaa(host), (v) =>
      v.map((record) => `${record.critical} ${record.issue ?? record.issuewild ?? record.iodef ?? ""}`),
    ),
  ]);
  const results = { a, aaaa, cname, mx, ns, txt, caa };
  return {
    hostname: host,
    resolver_scope: "server_system",
    records: Object.fromEntries(
      Object.entries(results).map(([key, result]) => [key, result.values]),
    ) as ObservationDnsFactsV1["records"],
    errors: Object.entries(results)
      .filter(([, result]) => result.error && result.error !== "ENODATA" && result.error !== "ENOTFOUND")
      .map(([key, result]) => `${key}:${result.error}`),
    truncated: Object.values(results).some((result) => result.truncated),
  };
}

export function hasPublicObservationAddress(dns: ObservationDnsFactsV1): boolean {
  const addresses = [...dns.records.a, ...dns.records.aaaa];
  return addresses.some((address) => isIP(address) !== 0 && !isBlockedPreviewHost(address));
}

async function assertPublicHost(hostname: string): Promise<ObservationWebFactError | null> {
  if (isBlockedPreviewHost(hostname)) return "forbidden_host";
  const dns = await collectDnsFacts(hostname);
  return hasPublicObservationAddress(dns) ? null : "dns_no_public_address";
}

function classifyFetchError(err: unknown): ObservationWebFactError {
  if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) {
    return "timeout";
  }
  return "network_error";
}

async function readLimitedBody(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<{ bytes: Uint8Array; truncated: boolean }> {
  if (!body) return { bytes: new Uint8Array(), truncated: false };
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (total + value.byteLength > maxBytes) {
        chunks.push(value.slice(0, maxBytes - total));
        total = maxBytes;
        truncated = true;
        await reader.cancel();
        break;
      }
      chunks.push(value);
      total += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes, truncated };
}

function emptyResource(
  key: ObservationWebResourceFactV1["key"],
  url: string,
  error: ObservationWebFactError,
): ObservationWebResourceFactV1 {
  return {
    key,
    url,
    status: null,
    present: null,
    content_type: null,
    bytes_read: 0,
    sha256: null,
    truncated: false,
    redirects: [],
    error,
  };
}

async function fetchResourceFact(
  key: ObservationWebResourceFactV1["key"],
  initialUrl: string,
  maxBytes = WEB_FACTS_RESOURCE_MAX_BYTES,
  onBody?: (bytes: Uint8Array) => void,
): Promise<ObservationWebResourceFactV1> {
  let current: URL;
  try {
    current = new URL(initialUrl);
  } catch {
    return emptyResource(key, initialUrl, "invalid_url");
  }
  const redirects: string[] = [];
  for (let step = 0; step <= WEB_FACTS_REDIRECT_LIMIT; step += 1) {
    if (!["http:", "https:"].includes(current.protocol)) {
      return { ...emptyResource(key, initialUrl, "invalid_url"), redirects };
    }
    const hostError = await assertPublicHost(current.hostname);
    if (hostError) return { ...emptyResource(key, initialUrl, hostError), redirects };

    let response: Response;
    try {
      response = await fetch(current, {
        headers: BROWSER_LIKE_HEADERS,
        redirect: "manual",
        signal: AbortSignal.timeout(WEB_FACTS_FETCH_TIMEOUT_MS),
      });
    } catch (err) {
      return { ...emptyResource(key, initialUrl, classifyFetchError(err)), redirects };
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        return {
          ...emptyResource(key, initialUrl, "network_error"),
          status: response.status,
          redirects,
        };
      }
      if (step === WEB_FACTS_REDIRECT_LIMIT) {
        return { ...emptyResource(key, initialUrl, "redirect_limit"), redirects };
      }
      try {
        current = new URL(location, current);
        redirects.push(current.href.slice(0, 2_000));
        continue;
      } catch {
        return { ...emptyResource(key, initialUrl, "invalid_url"), redirects };
      }
    }

    if (response.status < 200 || response.status >= 300) {
      await response.body?.cancel();
      return {
        key,
        url: initialUrl,
        status: response.status,
        present: response.status === 404 ? false : null,
        content_type: response.headers.get("content-type")?.slice(0, 200) ?? null,
        bytes_read: 0,
        sha256: null,
        truncated: false,
        redirects,
        error: null,
      };
    }

    const { bytes, truncated } = await readLimitedBody(response.body, maxBytes);
    onBody?.(bytes);
    return {
      key,
      url: initialUrl,
      status: response.status,
      present: true,
      content_type: response.headers.get("content-type")?.slice(0, 200) ?? null,
      bytes_read: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      truncated,
      redirects,
      error: null,
    };
  }
  return { ...emptyResource(key, initialUrl, "redirect_limit"), redirects };
}

export function parseRobotsDirectives(text: string): ObservationRobotsDirectivesV1 {
  const out: ObservationRobotsDirectivesV1 = {
    user_agents: [],
    allow: [],
    disallow: [],
    sitemaps: [],
    groups: [],
  };
  let current: ObservationRobotsGroupV1 | null = null;
  let inAgents = false;
  const pushFlat = (list: string[], value: string) => {
    if (list.length < WEB_FACTS_DNS_RECORD_LIMIT && !list.includes(value)) list.push(value);
  };

  for (const rawLine of text.split(/\r?\n/).slice(0, 2_000)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const match = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!match) continue;
    const value = clip(match[2]);
    const key = match[1].toLowerCase();
    if (key === "user-agent") {
      if (!value) continue;
      if (!inAgents || !current || out.groups.length >= 40) {
        if (out.groups.length >= 40) {
          inAgents = false;
          current = null;
          continue;
        }
        current = { user_agents: [], allow: [], disallow: [] };
        out.groups.push(current);
        inAgents = true;
      }
      if (
        current &&
        current.user_agents.length < WEB_FACTS_DNS_RECORD_LIMIT &&
        !current.user_agents.includes(value)
      ) {
        current.user_agents.push(value);
      }
      pushFlat(out.user_agents, value);
      continue;
    }
    if (key === "allow" || key === "disallow" || key === "sitemap") inAgents = false;
    if (!value) continue;
    if (key === "allow" || key === "disallow") {
      if (!current) {
        if (out.groups.length >= 40) continue;
        current = { user_agents: [], allow: [], disallow: [] };
        out.groups.push(current);
      }
      const list = key === "allow" ? current.allow : current.disallow;
      if (list.length < WEB_FACTS_DNS_RECORD_LIMIT && !list.includes(value)) list.push(value);
      pushFlat(key === "allow" ? out.allow : out.disallow, value);
      continue;
    }
    if (key === "sitemap") pushFlat(out.sitemaps, value);
  }
  return out;
}

async function fetchRobotsFact(url: string): Promise<ObservationWebFactsV1["robots"]> {
  let directives: ObservationRobotsDirectivesV1 = {
    user_agents: [],
    allow: [],
    disallow: [],
    sitemaps: [],
    groups: [],
  };
  const fact = await fetchResourceFact(
    "robots_txt",
    url,
    WEB_FACTS_RESOURCE_MAX_BYTES,
    (bytes) => {
      directives = parseRobotsDirectives(new TextDecoder().decode(bytes));
    },
  );
  return { ...fact, directives };
}

export function filterPublicResponseHeaders(
  headers: Record<string, string> | undefined,
): Record<string, string> {
  if (!headers) return {};
  return Object.fromEntries(
    Object.entries(headers)
      .map(([key, value]) => [key.toLowerCase(), value] as const)
      .filter(([key]) => SAFE_HTTP_HEADERS.has(key) && key !== "set-cookie")
      .map(([key, value]) => [key, clip(value)]),
  );
}

export async function collectObservationWebFacts(
  input: CollectObservationWebFactsInput,
): Promise<ObservationWebFactsV1 | null> {
  return withSpan(
    "facts.web",
    {
      [ATTR.operation]: "web_facts",
      [ATTR.urlHost]: urlHostAttr(input.target),
      "viewtrace.facts.preview_provided": Boolean(input.preview),
    },
    async (span) => {
      const facts = await collectObservationWebFactsInner(input);
      setSpanAttrs(span, { [ATTR.ok]: facts !== null });
      return facts;
    },
  );
}

async function collectObservationWebFactsInner(
  input: CollectObservationWebFactsInput,
): Promise<ObservationWebFactsV1 | null> {
  let target: URL;
  try {
    target = new URL(input.target);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(target.protocol) || isBlockedPreviewHost(target.hostname)) {
    return null;
  }

  const origin = target.origin;
  const dns = await collectDnsFacts(target.hostname);
  const domain = getDomain(target.hostname, { allowPrivateDomains: false });
  const mtaStsUrl = domain
    ? `https://mta-sts.${domain}/.well-known/mta-sts.txt`
    : `${origin}/.well-known/mta-sts.txt`;

  const robotsUrl = `${origin}/robots.txt`;
  const resources = [
    ["security_txt", `${origin}/.well-known/security.txt`],
    ["assetlinks_json", `${origin}/.well-known/assetlinks.json`],
    ["apple_app_site_association", `${origin}/.well-known/apple-app-site-association`],
    ["openid_configuration", `${origin}/.well-known/openid-configuration`],
    ["mta_sts_txt", mtaStsUrl],
  ] as const;

  const [robots, ...wellKnown] = await Promise.all([
    fetchRobotsFact(robotsUrl),
    ...resources.map(([key, url]) => fetchResourceFact(key, url, 64 * 1024)),
  ]);

  const aasaIndex = wellKnown.findIndex((fact) => fact.key === "apple_app_site_association");
  if (aasaIndex >= 0 && wellKnown[aasaIndex].present !== true) {
    const rootAasaUrl = `${origin}/apple-app-site-association`;
    const rootFact = await fetchResourceFact("apple_app_site_association", rootAasaUrl, 64 * 1024);
    if (rootFact.present === true || wellKnown[aasaIndex].present === false) {
      rootFact.alternate_url = wellKnown[aasaIndex].url;
      wellKnown[aasaIndex] = rootFact;
    } else {
      wellKnown[aasaIndex].alternate_url = rootAasaUrl;
    }
  }

  return {
    schema_version: OBSERVATION_WEB_FACTS_SCHEMA_VERSION,
    observed_at: input.observedAt,
    target_host: target.hostname.toLowerCase(),
    network_path: "server_direct",
    note: "Separate from screenshot capture and requested region",
    html: {
      sample_sha256: input.preview?.html_sample_sha256 ?? null,
      sample_bytes: input.preview?.html_sample_bytes ?? 0,
      sample_truncated: input.preview?.html_sample_truncated ?? false,
      hash_scope: "head_or_prefix",
    },
    http: {
      status: input.preview?.status ?? null,
      final_url: input.preview?.final_url ?? null,
      via_proxy: input.preview?.via_proxy ?? null,
      headers: filterPublicResponseHeaders(input.preview?.headers),
    },
    dns,
    robots,
    well_known: wellKnown,
  };
}
