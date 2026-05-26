import { NextResponse } from "next/server";
import { AUDIT_ACTION, appendAuditEventAsService } from "@/lib/audit-log";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runBrowserlessScreenshot } from "@/lib/browserless-screenshot";
import type { Observation } from "@/lib/demo/observations";
import { computeObservationContentHash } from "@/lib/observation-content-hash";
import {
  clampRepeatCount,
  computeNextRunAfter,
  isDailyWatchDueOnCronDay,
  parseWatchFrequency,
  parseWatchNotifyMode,
  startOfUtcDay,
  type WatchFrequency,
  type WatchNotifyMode,
} from "@/lib/observation-watch-schedule";
import { uploadObservationSnapshotPng } from "@/lib/observation-snapshot-storage";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { sendResendEmail, isResendConfigured } from "@/lib/resend";
import { buildObservationRecordOpenUrls } from "@/lib/observation-record-open-urls";
import { getAppOriginForEmailLinks } from "@/lib/site";

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

/** Align with client-side `isObservation` guard (note length under 500). */
const OBSERVATION_NOTE_MAX = 498;
function truncateObservationNote(s: string): string {
  if (s.length <= OBSERVATION_NOTE_MAX) return s;
  return `${s.slice(0, OBSERVATION_NOTE_MAX - 1)}…`;
}

function observationUrlHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
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
  /**
   * Vercel Cron: `0 0 * * *` = 00:00 UTC = 09:00 JST = 前日 20:00 ET (EDT)。
   * daily ウォッチは UTC 0:00 起点。Cron は数十分遅れることがあるため 1 時間先まで拾う。
   * さらに「今日（UTC）の定刻スロットを未実行」の daily は `next_run_at` が未来でも実行する。
   */
  const SCHEDULE_HORIZON_MS = 60 * 60 * 1000;
  const now = new Date();
  const horizonIso = new Date(now.getTime() + SCHEDULE_HORIZON_MS).toISOString();
  const todayStartIso = startOfUtcDay(now).toISOString();

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
    .or(
      `next_run_at.is.null,next_run_at.lte.${horizonIso},and(schedule_frequency.eq.daily,or(last_run_at.is.null,last_run_at.lt.${todayStartIso}))`,
    )
    .order("next_run_at", { ascending: true, nullsFirst: true })
    .limit(40);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  }

  let ran = 0;
  let notified = 0;
  let failureNotified = 0;

  const dashboardUrl = `${getAppOriginForEmailLinks()}/dashboard/observations`;

  async function markWatchNotified(watchId: string): Promise<void> {
    await svc
      .from("observation_watches")
      .update({ last_notified_at: new Date().toISOString() })
      .eq("id", watchId);
  }

  async function sendCronWatchFailureEmail(params: {
    userEmail: string | null;
    url: string;
    region: string;
    watchId: string;
    stage: "screenshot" | "save";
    errorCode: string;
    errorDetail?: string;
  }): Promise<boolean> {
    const { userEmail, url, region, watchId, stage, errorCode, errorDetail } = params;
    if (!userEmail) {
      console.warn("[cron] failure email skipped: user_email_missing", { watchId });
      return false;
    }
    if (!isResendConfigured()) {
      console.warn("[cron] failure email skipped: resend_not_configured", { watchId });
      return false;
    }

    const stageJa = stage === "screenshot" ? "スクリーンショット取得" : "記録の保存";
    const stageEn = stage === "screenshot" ? "Screenshot capture" : "Saving the record";
    const detailLine = errorDetail?.trim() ? `\nDetail / 詳細: ${errorDetail.trim().slice(0, 400)}` : "";

    const subject = "Viewtrace: scheduled observation failed / 定期自動観測に失敗";
    const text = [
      "Scheduled auto-observation did not complete.",
      "定期自動観測を完了できませんでした（記録は追加されていません）。",
      "",
      `URL: ${url}`,
      `Region / 地域: ${region}`,
      `Stage / 段階: ${stageEn} / ${stageJa}`,
      `Error / エラー: ${errorCode}${detailLine}`,
      "",
      `Dashboard / ダッシュボード: ${dashboardUrl}`,
      "",
      emailAccountHintText(userEmail),
    ].join("\n");

    const html = [
      "<p>Scheduled auto-observation did not complete.</p>",
      "<p>定期自動観測を完了できませんでした（記録は追加されていません）。</p>",
      `<p><strong>URL</strong><br/>${escapeHtml(url)}</p>`,
      `<p><strong>Region</strong> / 地域<br/>${escapeHtml(region)}</p>`,
      `<p><strong>Stage</strong> / 段階<br/>${escapeHtml(stageEn)} / ${escapeHtml(stageJa)}</p>`,
      `<p><strong>Error</strong> / エラー<br/><code style="word-break:break-all;">${escapeHtml(errorCode)}</code></p>`,
      errorDetail?.trim()
        ? `<p style="font-size:13px;color:#666;word-break:break-all;"><strong>Detail</strong> / 詳細<br/>${escapeHtml(errorDetail.trim().slice(0, 400))}</p>`
        : "",
      `<p><a href="${escapeHtml(dashboardUrl)}" style="color:#2563eb;text-decoration:underline;">Open dashboard / ダッシュボードを開く</a></p>`,
      emailAccountHintHtml(userEmail),
    ].join("");

    const res = await sendResendEmail({ to: userEmail, subject, text, html });
    if (res.ok) return true;
    console.warn("[cron] failure email failed", { watchId, error: res.error });
    return false;
  }

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

    const nextRunAtRaw = getString(row, "next_run_at");
    const lastRunAtRaw = getString(row, "last_run_at");
    const dueByNextRun =
      !nextRunAtRaw || new Date(nextRunAtRaw).getTime() <= new Date(horizonIso).getTime();
    const dueByDailyAnchor =
      freq === "daily" && isDailyWatchDueOnCronDay(now, lastRunAtRaw || null, repeatCount);
    if (!dueByNextRun && !dueByDailyAnchor) continue;

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
      const failedAt = new Date().toISOString();
      await svc
        .from("observation_watches")
        .update({ last_run_at: failedAt, next_run_at: nextRun })
        .eq("id", watchId);

      await appendAuditEventAsService(svc, userId, {
        scope: "system",
        action: "observation.cron_auto_failed",
        meta: {
          stage: "screenshot",
          status: "failure",
          urlHost: observationUrlHost(url),
          region,
          watchId,
          error: shot.error,
          detail: shot.detail?.slice(0, 300),
        },
      });

      const sent = await sendCronWatchFailureEmail({
        userEmail,
        url,
        region,
        watchId,
        stage: "screenshot",
        errorCode: shot.error,
        errorDetail:
          typeof shot.detail === "string"
            ? shot.detail
            : shot.upstreamStatus
              ? `upstream HTTP ${shot.upstreamStatus}`
              : undefined,
      });
      if (sent) {
        failureNotified += 1;
        await markWatchNotified(watchId);
      }
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

    const note = truncateObservationNote(
      blobUrl ? "自動観測（定期）" : `自動観測（画像保存に失敗${blobFailureNote}）`,
    );

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

    const { error: insertObsError } = await svc.from("observations").insert({
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

    if (insertObsError) {
      console.error("[cron] observation insert failed", {
        watchId,
        userId,
        obsId,
        message: insertObsError.message,
      });
      await svc
        .from("observation_watches")
        .update({ last_run_at: capturedAt, next_run_at: nextRun })
        .eq("id", watchId);

      await appendAuditEventAsService(svc, userId, {
        scope: "system",
        action: "observation.cron_auto_failed",
        meta: {
          stage: "save",
          status: "failure",
          urlHost: observationUrlHost(url),
          region,
          watchId,
          error: "observation_insert_failed",
          detail: insertObsError.message.slice(0, 300),
        },
      });

      const sent = await sendCronWatchFailureEmail({
        userEmail,
        url,
        region,
        watchId,
        stage: "save",
        errorCode: "observation_insert_failed",
        errorDetail: insertObsError.message,
      });
      if (sent) {
        failureNotified += 1;
        await markWatchNotified(watchId);
      }
      continue;
    }

    /**
     * 監査ログにも追記する。手動の `appendUserObservation` と違って Cron は service_role
     * クライアントなので `auth.getUser()` でユーザーを引けず、これまでは audit_events が
     * 空のまま「定期観測が記録に残らない」と見える gap になっていた。
     * 失敗してもメール通知へ進む（best-effort）。
     */
    await appendAuditEventAsService(svc, userId, {
      scope: "observation",
      action: AUDIT_ACTION.OBSERVATION_RECORD,
      observationId: obsId,
      meta: {
        result: "saved",
        status: blobUrl ? "success" : "failure",
        urlHost: observationUrlHost(url),
        region,
        source: "cron_auto",
        watchId,
        snapshotStored: Boolean(blobUrl),
      },
    });

    await svc
      .from("observation_watches")
      .update({ last_run_at: capturedAt, next_run_at: nextRun })
      .eq("id", watchId);

    const { openUrl } = buildObservationRecordOpenUrls(getAppOriginForEmailLinks(), obsId);

    if (notifyMode === "always") {
      if (!userEmail) {
        console.warn("[cron] email skipped: user_email_missing", { watchId, userId });
      } else if (!isResendConfigured()) {
        console.warn("[cron] email skipped: resend_not_configured", { watchId, userId });
      } else {
        const subject = "Viewtrace: scheduled observation / 定期自動観測";
        const text = [
          "A new scheduled observation was recorded.",
          "新しい定期自動観測の記録が追加されました。",
          "",
          `URL: ${url}`,
          `Region / 地域: ${region}`,
          blobUrl ? `Snapshot / スナップショット: ${blobUrl}` : "Snapshot: not stored (check dashboard).",
          "",
          `Open record / 記録を開く: ${openUrl}`,
          "",
          emailAccountHintText(userEmail),
        ].join("\n");
        const html = [
          "<p>A new scheduled observation was recorded.</p>",
          "<p>新しい定期自動観測の記録が追加されました。</p>",
          `<p><strong>URL</strong><br/>${escapeHtml(url)}</p>`,
          `<p><strong>Region</strong> / 地域<br/>${escapeHtml(region)}</p>`,
          blobUrl
            ? `<p><a href="${escapeHtml(blobUrl)}">Snapshot link</a></p>`
            : "<p>Snapshot was not stored to Blob; open the dashboard for details.</p>",
          observationRecordLinkHtml(openUrl),
          emailAccountHintHtml(userEmail),
        ].join("");

        const res = await sendResendEmail({ to: userEmail, subject, text, html });
        if (res.ok) {
          notified += 1;
          await markWatchNotified(watchId);
        } else {
          console.warn("[cron] email failed", { watchId, userId, error: res.error });
        }
      }
    }

    if (notifyMode === "change_only" && blobUrl) {
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
        if (!userEmail) {
          console.warn("[cron] email skipped: user_email_missing", { watchId, userId });
        } else if (!isResendConfigured()) {
          console.warn("[cron] email skipped: resend_not_configured", { watchId, userId });
        } else {
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
            `Open record / 記録を開く: ${openUrl}`,
            "",
            emailAccountHintText(userEmail),
          ].join("\n");

          const html = [
            "<p>差分が大きい変更を検知しました。</p>",
            `<p><strong>URL</strong><br/>${escapeHtml(url)}</p>`,
            `<p><strong>地域</strong><br/>${escapeHtml(region)}</p>`,
            `<p><strong>差分率</strong><br/>${Math.round(ratio * 1000) / 10}%</p>`,
            `<p><a href="${escapeHtml(a.snapshot_image_url)}">最新スナップショット</a></p>`,
            `<p><a href="${escapeHtml(b.snapshot_image_url)}">前回スナップショット</a></p>`,
            observationRecordLinkHtml(openUrl),
            emailAccountHintHtml(userEmail),
          ].join("");

          const res = await sendResendEmail({ to: userEmail, subject, text, html });
          if (res.ok) {
            notified += 1;
            await markWatchNotified(watchId);
          } else {
            console.warn("[cron] email failed", { watchId, userId, error: res.error });
          }
        }
      }
    }
  }

  return okJson({ ran, notified, failureNotified });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 複数アカウント運用時に「届いた宛先と違うアカウントでログイン中だった」事故を防ぐ。
 * リンクを踏む直前に、その端末でどのアドレスにログインすべきか提示する。
 */
function emailAccountHintText(recipientEmail: string): string {
  return `※ このリンクは ${recipientEmail} でログインした状態でタップしてください（別アカウントでログインしていると 「アカウント不一致」 画面が表示されます）。 / Please tap this link while signed in as ${recipientEmail}.`;
}

function emailAccountHintHtml(recipientEmail: string): string {
  const safe = escapeHtml(recipientEmail);
  return [
    '<p style="margin:14px 0 0;padding:10px 12px;background:#f6faf2;border:1px solid #c9e1c4;border-radius:8px;font-size:12px;line-height:1.55;color:#1f3a23;word-break:break-all;overflow-wrap:anywhere;">',
    "※ このリンクは <strong>",
    safe,
    "</strong> でログインした状態でタップしてください（別アカウントでログインしていると「アカウント不一致」画面が表示されます）。<br/>",
    'Please tap this link while signed in as <strong>',
    safe,
    "</strong>.",
    "</p>",
  ].join("");
}

/**
 * 主リンクは `/api/open/observation?id=`（パスが短く iOS で壊れにくく、API で 302→ダッシュボード）。
 * クリックできない環境向けに、同じ短い URL をプレーンテキストでも併記する。
 */
function observationRecordLinkHtml(openUrl: string): string {
  const primary = escapeHtml(openUrl);
  return [
    '<p style="margin:12px 0;line-height:1.5;word-break:break-all;overflow-wrap:anywhere;-webkit-hyphens:none;hyphens:none;">',
    `<a href="${primary}" style="color:#2563eb;text-decoration:underline;word-break:break-all;overflow-wrap:anywhere;">Open record / 記録を開く</a>`,
    "</p>",
    '<p style="margin:8px 0 0;font-size:13px;color:#444;line-height:1.45;word-break:break-all;overflow-wrap:anywhere;-webkit-hyphens:none;hyphens:none;">',
    primary,
    "</p>",
  ].join("");
}
