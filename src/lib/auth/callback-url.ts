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
 * Supabase Dashboard → Authentication → URL Configuration:
 * 「Redirect URLs」に少なくとも `https://<本番ドメイン>/auth/callback` とローカル用 `http://localhost:<port>/auth/callback` を追加する。
 * クエリ付き URL はワイルドカード（例 `https://viewtrace.net/**`）も検討（[Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)）。
 * 未登録だと `redirect_to` が無効になり、メールの verify リンクで `redirect_to` が Site URL のみになり（`/auth/callback` が消える）、トップだけ開くことがある。
 *
 * 本番で `NEXT_PUBLIC_SITE_URL` が設定されているときは、この関数は **必ずそのオリジン** の `/auth/callback` を返す（ヘッダより優先）。
 *
 * Email Templates の「Confirm signup」は `supabase/templates/confirmation.html` に合わせる。
 * **推奨**: `href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup"`（サーバーで verifyOtp。別ブラウザ可）。
 * `{{ .ConfirmationURL }}` は PKCE 用で、サインアップと違う環境で開くと code verifier 不足になりやすい。
 * `{{ .SiteURL }}` のみにしない（Site URL 直下に落ち、callback を踏めなくなることがある）。
 *
 * テンプレートのソースファイル: `supabase/templates/confirmation.html`（ローカル CLI と同期。
 * ホスト済みプロジェクトは同ファイルの body を Dashboard → Confirm signup にコピーする）
 *
 * リンク完了後はアプリ側で `/auth/email-verified`（「認証成功」画面）へ誘導する（`next` が欠けても callback の既定で同じ）。
 *
 * Site URL 直下に `#access_token=…` だけ付いて戻る場合は、`SupabaseHomeAuthCapture` が fragment 処理へ回す。
 */
export async function getAuthEmailRedirectTo(): Promise<string> {
  // 本番では NEXT_PUBLIC_SITE_URL を最優先し、www / プロキシヘッダのブレで
  // `emailRedirectTo` が許可リストから外れて Site URL だけになるのを防ぐ。
  if (process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
    return `${trimTrailingSlash(resolveStaticSiteOrigin())}/auth/callback`;
  }

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
