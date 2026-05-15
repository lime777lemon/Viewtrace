import type { NextRequest } from "next/server";

/** Cookie の domain / secure 判定用（ポートは除くホスト名のみ） */
export function parseHostnameForCookies(hostHeader: string | null): string {
  const raw = hostHeader?.split(",")[0]?.trim() ?? "localhost";
  if (raw.startsWith("[")) {
    const end = raw.indexOf("]");
    return end > 0 ? raw.slice(1, end) : raw;
  }
  return raw.split(":")[0] || "localhost";
}

export function isHttpsFromForwardedProto(protoHeader: string | null): boolean {
  const proto = protoHeader?.split(",")[0]?.trim().toLowerCase();
  if (proto === "https") return true;
  if (proto === "http") return false;
  return process.env.NODE_ENV === "production";
}

/**
 * Route Handler（/auth/callback）用。`request.url` の protocol だけに頼らず
 * x-forwarded-proto を優先する（Vercel 等で http と判定され Secure Cookie が付かない事故を防ぐ）。
 */
export function authCookieContextFromNextRequest(request: NextRequest): {
  host: string;
  isHttps: boolean;
} {
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const host = parseHostnameForCookies(forwardedHost ?? request.nextUrl.hostname);
  const forwardedProto =
    request.headers.get("x-forwarded-proto") ?? (request.nextUrl.protocol === "https:" ? "https" : "http");
  const isHttps = isHttpsFromForwardedProto(forwardedProto);
  return { host, isHttps };
}

/** Server Component / Server Action 用（headers() から） */
export function authCookieContextFromHeaders(h: {
  get(name: string): string | null;
}): { host: string; isHttps: boolean } {
  const forwardedHost = h.get("x-forwarded-host") ?? h.get("host");
  const host = parseHostnameForCookies(forwardedHost);
  const isHttps = isHttpsFromForwardedProto(h.get("x-forwarded-proto"));
  return { host, isHttps };
}
