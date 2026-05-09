import { headers } from "next/headers";
import { siteDomain, siteOrigin } from "@/lib/site";

function trimTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

/**
 * GET /login など Origin が無いリクエストでも、実際にユーザーが開いているホストを使う（Vercel 本番ドメイン）。
 * さもないと emailRedirectTo が VERCEL_URL（*.vercel.app）や古い env に寄り、Supabase の Redirect URLs と不一致になりメール送信が失敗することがある。
 */
function originFromForwardedHeaders(h: Headers): string | null {
  const hostRaw = h.get("x-forwarded-host") ?? h.get("host");
  const host = hostRaw?.split(",")[0]?.trim();
  if (!host) return null;

  const protoRaw = h.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const isLocal =
    host === "localhost" || host.startsWith("localhost:") || host.startsWith("127.0.0.1:");

  let proto: string;
  if (protoRaw === "https" || protoRaw === "http") {
    proto = protoRaw;
  } else if (isLocal) {
    proto = "http";
  } else {
    proto = "https";
  }

  try {
    const origin = `${proto}://${host}`;
    return isAllowedRedirectOrigin(origin) ? trimTrailingSlash(origin) : null;
  } catch {
    return null;
  }
}

/** 環境変数のみ（Server Action 外でも利用可） */
export function resolveStaticSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return trimTrailingSlash(explicit);
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    return `https://${host}`;
  }
  return siteOrigin;
}

function isAllowedRedirectOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.host;
    if (host === siteDomain || host.endsWith(`.${siteDomain}`)) return true;
    if (host === "localhost" || host.startsWith("localhost:")) return true;
    if (host.startsWith("127.0.0.1:")) return true;
    if (host.endsWith(".vercel.app")) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * サインアップ確認メールの「続きの URL」（/auth/callback）に使うベースオリジン。
 * フォーム送信時の Origin が取れる場合はそれを優先（ローカル別ポート・Preview で emailRedirectTo が本番固定になるのを防ぐ）。
 *
 * メールテンプレートは `{{ .RedirectTo }}` をそのまま href のベースにし、
 * `&token_hash={{ .TokenHash }}&type=email` を付けると別端末でも確認できる（Dashboard の Email Templates を編集）。
 */
export async function getAuthEmailRedirectTo(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin && isAllowedRedirectOrigin(origin)) {
    return `${trimTrailingSlash(origin)}/auth/callback`;
  }
  const referer = h.get("referer");
  if (referer) {
    try {
      const o = new URL(referer).origin;
      if (isAllowedRedirectOrigin(o)) {
        return `${trimTrailingSlash(o)}/auth/callback`;
      }
    } catch {
      /* ignore */
    }
  }
  const fromForwarded = originFromForwardedHeaders(h);
  if (fromForwarded) {
    return `${fromForwarded}/auth/callback`;
  }
  return `${resolveStaticSiteOrigin()}/auth/callback`;
}
