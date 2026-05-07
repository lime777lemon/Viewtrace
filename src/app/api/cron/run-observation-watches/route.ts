import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runBrowserlessScreenshot } from "@/lib/browserless-screenshot";
import { uploadObservationSnapshotPng } from "@/lib/observation-snapshot-storage";

export const runtime = "nodejs";
export const maxDuration = 300;

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

function okJson(extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: true, ...extra });
}

function getBearer(req: Request): string | null {
  const h = req.headers.get("authorization")?.trim() ?? "";
  const m = h.match(/^Bearer\\s+(.+)$/i);
  return m ? m[1] : null;
}

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return unauthorized();
  if (getBearer(req) !== secret) return unauthorized();

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "supabase_admin_not_configured" }, { status: 503 });
  }

  const threshold = Number(process.env.OBS_DIFF_THRESHOLD ?? 0.07);

  function getString(o: Record<string, unknown>, k: string): string {
    const v = o[k];
    return typeof v === "string" ? v : "";
  }

  function getOptionalString(o: Record<string, unknown>, k: string): string | null {
    const v = o[k];
    return typeof v === "string" ? v : null;
  }

  // Fetch enabled watches with user email for notifications.
  const { data: watches, error } = await admin
    .from("observation_watches")
    .select("id,user_id,url,region,enabled,last_notified_at,public_users:users(email)")
    .eq("enabled", true)
    .limit(200);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  }

  let ran = 0;
  for (const w of watches ?? []) {
    ran += 1;
    const row = w as unknown as Record<string, unknown>;
    const url = getString(row, "url");
    const region = getString(row, "region");
    const watchId = getString(row, "id");
    const userId = getString(row, "user_id");
    const publicUsers = row["public_users"];
    const userEmail =
      publicUsers && typeof publicUsers === "object"
        ? getOptionalString(publicUsers as Record<string, unknown>, "email") ?? ""
        : "";

    if (!url || !region || !watchId || !userId) continue;

    // Capture screenshot via Browserless (fullPage=true for Pro watches)
    const shot = await runBrowserlessScreenshot({ url, region, fullPage: true });
    if (!shot.ok) {
      await admin
        .from("observation_watches")
        .update({ last_run_at: new Date().toISOString() })
        .eq("id", watchId);
      continue;
    }

    const obsId = crypto.randomUUID();
    const blobUrl = await uploadObservationSnapshotPng(obsId, shot.png);
    const capturedAt = new Date().toISOString();

    // Record observation row (best-effort)
    await admin.from("observations").insert({
      id: obsId,
      user_id: userId,
      url,
      region,
      region_label: region,
      status: blobUrl ? "success" : "failure",
      note: blobUrl ? "自動観測（毎日）" : "自動観測（画像保存に失敗）",
      snapshot_image_url: blobUrl,
      captured_at: capturedAt,
      updated_at: capturedAt,
    });

    await admin
      .from("observation_watches")
      .update({ last_run_at: capturedAt })
      .eq("id", watchId);

    // Without a saved URL, we cannot diff/notify.
    if (!blobUrl || !userEmail) continue;

    // Fetch latest 2 observations for same url+region.
    const { data: recent } = await admin
      .from("observations")
      .select("id,snapshot_image_url,captured_at")
      .eq("user_id", userId)
      .eq("url", url)
      .eq("region", region)
      .not("snapshot_image_url", "is", null)
      .order("captured_at", { ascending: false })
      .limit(2);
    if (!recent || recent.length < 2) continue;

    const [a, b] = recent;
    if (!a.snapshot_image_url || !b.snapshot_image_url) continue;

    // Diff is implemented in a later todo; placeholder: do not notify.
    void threshold;
    void a;
    void b;

    // TODO(diff-engine): compute ratio and notify if >= threshold
    await admin
      .from("observation_watches")
      .update({ last_diff_ratio: null })
      .eq("id", watchId);
  }

  return okJson({ ran });
}

