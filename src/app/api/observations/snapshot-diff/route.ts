import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { computeSnapshotDiffRatio, formatDiffRatioPercent } from "@/lib/snapshot-diff";

export const runtime = "nodejs";
export const maxDuration = 60;

function isHttpsUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const currentUrl =
    typeof (body as { currentUrl?: unknown }).currentUrl === "string"
      ? (body as { currentUrl: string }).currentUrl.trim()
      : "";
  const previousUrl =
    typeof (body as { previousUrl?: unknown }).previousUrl === "string"
      ? (body as { previousUrl: string }).previousUrl.trim()
      : "";

  if (!currentUrl || !previousUrl || !isHttpsUrl(currentUrl) || !isHttpsUrl(previousUrl)) {
    return NextResponse.json({ ok: false, error: "invalid_urls" }, { status: 400 });
  }

  const ratio = await computeSnapshotDiffRatio(currentUrl, previousUrl);
  if (ratio === null) {
    return NextResponse.json({ ok: false, error: "diff_failed" }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    ratio,
    ratioLabel: formatDiffRatioPercent(ratio),
  });
}
