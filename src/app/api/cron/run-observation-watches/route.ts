import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runBrowserlessScreenshot } from "@/lib/browserless-screenshot";
import type { Observation } from "@/lib/demo/observations";
import { computeObservationContentHash } from "@/lib/observation-content-hash";
import {
  clampRepeatCount,
  computeNextRunAfter,
  parseWatchFrequency,
  parseWatchNotifyMode,
  type WatchFrequency,
  type WatchNotifyMode,
} from "@/lib/observation-watch-schedule";
import { uploadObservationSnapshotPng } from "@/lib/observation-snapshot-storage";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { sendResendEmail } from "@/lib/resend";
import { siteOrigin } from "@/lib/site";

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
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

/** Vercel Cron は GET + `x-vercel-cron: 1`。手動は Bearer CRON_SECRET。CRON_SECRET は POST 先頭で必須。 */
function authorizeCronRequest(req: Request, secret: string): boolean {
  if (getBearer(req) === secret) return true;
  if (req.headers.get("x-vercel-cron") === "1" && process.env.VERCEL === "1") return true;
  return false;
}

function getString(o: Record<string, unknown>, k: string): string {
  const v = o[k];
  return typeof v === "string" ? v : "";
}

function getBool(o: Record<string, unknown>, k: string, fallback: boolean): boolean {
  const v = o[k];
  if (typeof v === "boolean") return v;
  return fallback;
}

function getNum(o: Record<string, unknown>, k: string, fallback: number): number {
  const v = o[k];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ ok: false, error: "cron_secret_missing" }, { status: 503 });
  }
  if (!authorizeCronRequest(req, secret)) return unauthorized();

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "supabase_admin_not_configured" }, { status: 503 });
  }

  const svc = admin;

  const threshold = Number(process.env.OBS_DIFF_THRESHOLD ?? 0.07);
  const nowIso = new Date().toISOString();

  const emailCache = new Map<string, string | null>();
  async function getUserEmail(userId: string): Promise<string | null> {
    if (emailCache.has(userId)) return emailCache.get(userId) ?? null;
    const { data, error } = await svc.auth.admin.getUserById(userId);
    const email = !error && data.user?.email ? data.user.email.trim() : null;
    emailCache.set(userId, email);
    return email;
  }

  async function computePngDiffRatio(aUrl: string, bUrl: string): Promise<number | null> {
    try {
      const [aRes, bRes] = await Promise.all([fetch(aUrl), fetch(bUrl)]);
      if (!aRes.ok || !bRes.ok) return null;
      const [aBuf, bBuf] = await Promise.all([aRes.arrayBuffer(), bRes.arrayBuffer()]);
      const aPng = PNG.sync.read(Buffer.from(aBuf));
      const bPng = PNG.sync.read(Buffer.from(bBuf));
      const width = Math.min(aPng.width, bPng.width);
      const height = Math.min(aPng.height, bPng.height);
      if (width <= 0 || height <= 0) return null;

      const aCropped = new PNG({ width, height });
      const bCropped = new PNG({ width, height });
      PNG.bitblt(aPng, aCropped, 0, 0, width, height, 0, 0);
      PNG.bitblt(bPng, bCropped, 0, 0, width, height, 0, 0);

      const diff = new PNG({ width, height });
      const diffPixels = pixelmatch(aCropped.data, bCropped.data, diff.data, width, height, {
        threshold: 0.1,
      });
      const total = width * height;
      return total > 0 ? diffPixels / total : null;
    } catch (e) {
      console.warn("[cron] diff failed", e);
      return null;
    }
  }

  const { data: watches, error } = await svc
    .from("observation_watches")
    .select(
      "id,user_id,url,region,enabled,last_notified_at,schedule_frequency,repeat_count,notify_mode,snapshot_full_page,next_run_at,last_run_at",
    )
    .eq("enabled", true)
    .or(`next_run_at.is.null,next_run_at.lte.${nowIso}`)
    .order("next_run_at", { ascending: true, nullsFirst: true })
    .limit(40);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  }

  let ran = 0;
  let notified = 0;

  for (const w of watches ?? []) {
    ran += 1;
    const row = w as unknown as Record<string, unknown>;
    const url = getString(row, "url");
    const region = getString(row, "region");
    const watchId = getString(row, "id");
    const userId = getString(row, "user_id");
    const freq = parseWatchFrequency(getString(row, "schedule_frequency")) ?? ("daily" as WatchFrequency);
    const repeatCount = clampRepeatCount(freq, getNum(row, "repeat_count", 1));
    const notifyMode: WatchNotifyMode = parseWatchNotifyMode(getString(row, "notify_mode")) ?? "always";
    const fullPage = getBool(row, "snapshot_full_page", false);

    if (!url || !region || !watchId || !userId) continue;

    const userEmail = await getUserEmail(userId);

    let shot = await runBrowserlessScreenshot({ url, region, fullPage });
    if (
      !shot.ok &&
      shot.error === "browserless_error" &&
      typeof shot.detail === "string" &&
      /third-party proxy/i.test(shot.detail)
    ) {
      shot = await runBrowserlessScreenshot({ url, region, fullPage, disableProxy: true });
    }

    const nextRun = computeNextRunAfter(new Date(), freq, repeatCount).toISOString();

    if (!shot.ok) {
      console.warn("[cron] screenshot failed", { watchId, url, region, error: shot.error, detail: shot.detail });
      await svc
        .from("observation_watches")
        .update({ last_run_at: new Date().toISOString(), next_run_at: nextRun })
        .eq("id", watchId);
      continue;
    }

    const obsId = crypto.randomUUID();
    const blobResult = await uploadObservationSnapshotPng(obsId, shot.png, {
      format: "webp",
      webpQuality: 86,
      includePerceptualHash: true,
    });
    const blobUrl = blobResult.ok ? blobResult.url : null;
    const snapshotSha256Stored = blobResult.ok ? blobResult.snapshotSha256 : null;
    const snapshotPhashStored = blobResult.ok ? blobResult.snapshotPhash : null;
    const snapshotBytesStored = blobResult.ok ? blobResult.snapshotBytes : null;
    const snapshotContentTypeStored = blobResult.ok ? blobResult.snapshotContentType : null;
    const capturedAt = new Date().toISOString();

    const blobFailureNote = (() => {
      if (blobResult.ok) return "";
      if (blobResult.code === "token_missing") {
        return " — BLOB_READ_WRITE_TOKEN 未設定のため Blob に保存できません";
      }
      if (blobResult.code === "url_too_long") {
        return " — Blob の返却URLが長すぎるため保存できませんでした";
      }
      return blobResult.message ? ` — ${blobResult.message}` : "";
    })();

    const note = blobUrl ? "自動観測（定期）" : `自動観測（画像保存に失敗${blobFailureNote}）`;

    const obsForHash: Observation = {
      id: obsId,
      url,
      regionValue: region,
      regionLabel: region,
      capturedAt,
      status: blobUrl ? "success" : "failure",
      note,
      snapshotImageUrl: blobUrl ?? undefined,
      events: undefined,
    };
    const contentHash = computeObservationContentHash(obsForHash);

    await svc.from("observations").insert({
      id: obsId,
      user_id: userId,
      url,
      region,
      region_label: region,
      status: blobUrl ? "success" : "failure",
      note,
      snapshot_image_url: blobUrl,
      captured_at: capturedAt,
      updated_at: capturedAt,
      content_hash: contentHash,
      snapshot_sha256: snapshotSha256Stored,
      snapshot_phash: snapshotPhashStored,
      snapshot_bytes: snapshotBytesStored,
      snapshot_content_type: snapshotContentTypeStored,
    });

    await svc
      .from("observation_watches")
      .update({ last_run_at: capturedAt, next_run_at: nextRun })
      .eq("id", watchId);

    const detailUrl = `${siteOrigin}/dashboard/observations/${obsId}`;

    if (notifyMode === "always" && userEmail) {
      const subject = "Viewtrace: scheduled observation / 定期自動観測";
      const text = [
        "A new scheduled observation was recorded.",
        "新しい定期自動観測の記録が追加されました。",
        "",
        `URL: ${url}`,
        `Region / 地域: ${region}`,
        blobUrl ? `Snapshot / スナップショット: ${blobUrl}` : "Snapshot: not stored (check dashboard).",
        "",
        `Open record / 記録を開く: ${detailUrl}`,
      ].join("\n");
      const html = [
        "<p>A new scheduled observation was recorded.</p>",
        "<p>新しい定期自動観測の記録が追加されました。</p>",
        `<p><strong>URL</strong><br/>${escapeHtml(url)}</p>`,
        `<p><strong>Region</strong> / 地域<br/>${escapeHtml(region)}</p>`,
        blobUrl
          ? `<p><a href="${escapeHtml(blobUrl)}">Snapshot link</a></p>`
          : "<p>Snapshot was not stored to Blob; open the dashboard for details.</p>",
        `<p><a href="${escapeHtml(detailUrl)}">Open record / 記録を開く</a></p>`,
      ].join("");

      const res = await sendResendEmail({ to: userEmail, subject, text, html });
      if (res.ok) {
        notified += 1;
        await svc
          .from("observation_watches")
          .update({ last_notified_at: new Date().toISOString() })
          .eq("id", watchId);
      } else {
        console.warn("[cron] email failed", { watchId, error: res.error });
      }
    }

    if (notifyMode === "change_only" && blobUrl && userEmail) {
      const { data: recent } = await svc
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

      const ratio = await computePngDiffRatio(a.snapshot_image_url, b.snapshot_image_url);
      await svc.from("observation_watches").update({ last_diff_ratio: ratio }).eq("id", watchId);

      if (ratio !== null && ratio >= threshold) {
        const subject = `Viewtrace: 変化を検知しました（${Math.round(ratio * 1000) / 10}%）`;
        const text = [
          "差分が大きい変更を検知しました。",
          "",
          `URL: ${url}`,
          `地域: ${region}`,
          `差分率: ${Math.round(ratio * 1000) / 10}%`,
          "",
          `最新スナップショット: ${a.snapshot_image_url}`,
          `前回スナップショット: ${b.snapshot_image_url}`,
          "",
          `記録: ${detailUrl}`,
        ].join("\n");

        const res = await sendResendEmail({ to: userEmail, subject, text });
        if (res.ok) {
          notified += 1;
          await svc
            .from("observation_watches")
            .update({ last_notified_at: new Date().toISOString() })
            .eq("id", watchId);
        } else {
          console.warn("[cron] email failed", { watchId, error: res.error });
        }
      }
    }
  }

  return okJson({ ran, notified });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
