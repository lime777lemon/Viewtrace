import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getPlan } from "@/lib/plans";
import { isBlockedPreviewHost, normalizeUserUrlInput } from "@/lib/url-preview";
import { runUrlPreviewFetch } from "@/lib/url-preview-fetch";

export const runtime = "nodejs";
/** Microlink スクリーンショットは数秒〜数十秒かかることがある */
export const maxDuration = 60;

export async function POST(req: Request) {
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
  const fullPageScreenshot = session ? getPlan(session.plan).snapshotFullPage : false;

  const result = await runUrlPreviewFetch(target, {
    screenshotFallback: true,
    fullPageScreenshot,
  });
  if (!result.ok) {
    const status =
      result.error.startsWith("forbidden") ? 403 : result.error === "invalid_url" ? 400 : 502;
    if (status >= 500) {
      // 502 を返す時は本番ログに原因（fetch_failed:NNN / network_error / timeout など）を残す
      console.warn("[url-preview-api] upstream failure", {
        target,
        error: result.error,
        status,
      });
    }
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    canonicalUrl: result.canonicalUrl,
    title: result.title,
    image: result.image,
    html: result.html,
  });
}
