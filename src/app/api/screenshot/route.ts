import { NextResponse } from "next/server";
import { runBrowserlessScreenshot } from "@/lib/browserless-screenshot";
import { getSession } from "@/lib/auth/session";
import { getPlan } from "@/lib/plans";
import { isBlockedPreviewHost, normalizeUserUrlInput } from "@/lib/url-preview";

export const runtime = "nodejs";
export const maxDuration = 60;

async function authorize(req: Request): Promise<boolean> {
  const session = await getSession();
  if (session) return true;
  const secret = process.env.VIEWTRACE_SCREENSHOT_SECRET?.trim();
  if (!secret) return false;
  const h = req.headers.get("authorization")?.trim() ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return Boolean(m && m[1] === secret);
}

function jsonError(
  error: string,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

/**
 * Browserless スクリーンショットをプロキシする（PNG）。
 *
 * 認証: ログイン済みセッション、または `VIEWTRACE_SCREENSHOT_SECRET` がある場合は
 * `Authorization: Bearer <secret>`（curl 用）。
 *
 * 本番: 地域指定時は Browserless 内蔵 residential（`proxy=residential`）。
 * 任意で `VIEWTRACE_GEO_PROXY_*` があれば externalProxyServer を優先。
 */
export async function POST(req: Request) {
  if (!(await authorize(req))) {
    return jsonError("unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("invalid_json", 400);
  }

  const urlInput = typeof (body as { url?: unknown }).url === "string" ? (body as { url: string }).url : "";
  const target = normalizeUserUrlInput(urlInput);
  if (!target) {
    return jsonError("invalid_url", 400);
  }

  try {
    const parsed = new URL(target);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return jsonError("invalid_url", 400);
    }
    if (isBlockedPreviewHost(parsed.hostname)) {
      return jsonError("forbidden_host", 403);
    }
  } catch {
    return jsonError("invalid_url", 400);
  }

  const session = await getSession();
  const wantFullPage = (body as { fullPage?: unknown }).fullPage === true;
  const allowFullPage = session ? getPlan(session.plan).snapshotFullPage : false;
  const fullPage = wantFullPage && allowFullPage;

  const regionRaw =
    typeof (body as { region?: unknown }).region === "string"
      ? (body as { region: string }).region.trim()
      : "";

  const result = await runBrowserlessScreenshot({
    url: urlInput,
    region: regionRaw || undefined,
    fullPage,
  });

  if (!result.ok) {
    const e = result.error;
    if (e === "browserless_not_configured" || e === "geo_proxy_misconfigured") {
      return jsonError(e, 503);
    }
    if (e === "forbidden_host") {
      return jsonError(e, 403);
    }
    if (e === "invalid_url" || e === "region_required" || e === "invalid_region") {
      return jsonError(e, 400);
    }
    if (e === "browserless_error") {
      return jsonError(e, 502, { status: result.upstreamStatus, detail: result.detail });
    }
    if (e === "unexpected_response") {
      return jsonError(e, 502, { detail: result.detail });
    }
    return jsonError(e, 502, { detail: result.detail });
  }

  return new Response(result.png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
