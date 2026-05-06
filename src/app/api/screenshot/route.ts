import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getPlan } from "@/lib/plans";
import { isBlockedPreviewHost, normalizeUserUrlInput } from "@/lib/url-preview";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_BROWSERLESS_SCREENSHOT = "https://production-sfo.browserless.io/screenshot";

function browserlessScreenshotUrl(): string | null {
  const token = process.env.BROWSERLESS_TOKEN?.trim();
  if (!token) return null;
  try {
    const parsed = new URL(
      process.env.BROWSERLESS_SCREENSHOT_URL?.trim() || DEFAULT_BROWSERLESS_SCREENSHOT,
    );
    parsed.searchParams.set("token", token);
    return parsed.href;
  } catch {
    return null;
  }
}

async function authorize(req: Request): Promise<boolean> {
  const session = await getSession();
  if (session) return true;
  const secret = process.env.VIEWTRACE_SCREENSHOT_SECRET?.trim();
  if (!secret) return false;
  const h = req.headers.get("authorization")?.trim() ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return Boolean(m && m[1] === secret);
}

/**
 * Browserless スクリーンショットをプロキシする（PNG）。
 *
 * 認証: ログイン済みセッション、または `VIEWTRACE_SCREENSHOT_SECRET` がある場合は
 * `Authorization: Bearer <secret>`（curl 用）。
 */
export async function POST(req: Request) {
  const endpoint = browserlessScreenshotUrl();
  if (!endpoint) {
    return NextResponse.json({ ok: false, error: "browserless_not_configured" }, { status: 503 });
  }

  if (!(await authorize(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const urlInput = typeof (body as { url?: unknown }).url === "string" ? (body as { url: string }).url : "";
  const target = normalizeUserUrlInput(urlInput);
  if (!target) {
    return NextResponse.json({ ok: false, error: "invalid_url" }, { status: 400 });
  }

  try {
    const parsed = new URL(target);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ ok: false, error: "invalid_url" }, { status: 400 });
    }
    if (isBlockedPreviewHost(parsed.hostname)) {
      return NextResponse.json({ ok: false, error: "forbidden_host" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_url" }, { status: 400 });
  }

  const session = await getSession();
  const wantFullPage = (body as { fullPage?: unknown }).fullPage === true;
  const allowFullPage = session ? getPlan(session.plan).snapshotFullPage : false;
  const fullPage = wantFullPage && allowFullPage;

  const payload: Record<string, unknown> = { url: target };
  if (fullPage) {
    payload.options = { fullPage: true };
  }

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 55_000);
  let upstream: Response;
  try {
    upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "image/png, application/json" },
      body: JSON.stringify(payload),
      signal: ac.signal,
    });
  } catch {
    clearTimeout(t);
    return NextResponse.json({ ok: false, error: "browserless_network_error" }, { status: 502 });
  } finally {
    clearTimeout(t);
  }

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "");
    return NextResponse.json(
      { ok: false, error: "browserless_error", status: upstream.status, detail: errText.slice(0, 500) },
      { status: 502 },
    );
  }

  const ct = upstream.headers.get("content-type") ?? "";
  if (!ct.includes("image")) {
    const text = await upstream.text().catch(() => "");
    return NextResponse.json(
      { ok: false, error: "unexpected_response", detail: text.slice(0, 500) },
      { status: 502 },
    );
  }

  const image = await upstream.arrayBuffer();
  return new Response(image, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
