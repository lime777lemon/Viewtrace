import { NextResponse } from "next/server";
import { AUDIT_ACTION, appendAuditEventAsService } from "@/lib/audit-log";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildCaptureConditionsFromBrowserless } from "@/lib/capture-conditions";
import { runBrowserlessScreenshotWithProxyRetry } from "@/lib/browserless-screenshot";
import { runUrlPreviewFetch } from "@/lib/url-preview-fetch";
import { htmlHeadSignalsHasAny } from "@/lib/url-preview";
import { shouldNotifyWatchOnMetadata } from "@/lib/observation-html-signals-readout";
import { getPngDimensions } from "@/lib/png-dimensions";
import type { Observation } from "@/lib/demo/observations";
import { computeObservationContentHash } from "@/lib/observation-content-hash";
import {
  buildPublicVerifyUrlForObservation,
  generateObservationVerifyToken,
} from "@/lib/observation-verify-token";
import {
  clampRepeatCount,
  computeNextRunAfter,
  isDailyWatchDueOnCronDay,
  parseWatchFrequency,
  parseWatchNotifyMode,
  parseWatchNotifyOnMetadata,
  startOfUtcDay,
  type WatchFrequency,
  type WatchNotifyMode,
} from "@/lib/observation-watch-schedule";
import { uploadObservationSnapshotPng } from "@/lib/observation-snapshot-storage";
import {
  screenshotCompareField,
  shouldNotifyWatchOnScreenshot,
} from "@/lib/observation-compare";
import { findPreviousObservationForCompare } from "@/lib/observation-previous";
import {
  normalizeObservationWebhookUrl,
  postObservationWebhook,
} from "@/lib/observation-webhook";
import { sendResendEmail, isResendConfigured } from "@/lib/resend";
import {
  buildObservationCompareOpenUrl,
  buildObservationRecordOpenUrls,
} from "@/lib/observation-record-open-urls";
import { getAppOriginForEmailLinks } from "@/lib/site";
import { getPlan, parsePlanId, type PlanDefinition } from "@/lib/plans";
import {
  canStartObservationBatch,
  countObservationsThisUtcMonth,
  remainingObservations,
} from "@/lib/observation-quota";

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

/** 定期観測の失敗メール・記録メモ用（内部エラーコードは出さない） */
function cronFailureMessageForUser(
  errorCode: string,
  stage: "screenshot" | "save",
): { ja: string; en: string } {
  if (stage === "save") {
    return {
      ja: "記録の保存に失敗しました",
      en: "Could not save the record",
    };
  }
  void errorCode;
  return {
    ja: "スクリーンショットの取得に失敗しました",
    en: "Screenshot capture failed",
  };
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

  /**
   * Vercel Cron: hourly (`0 * * * *`) so Pro の 6 時間スロットに間に合う。
   * daily Watch の基準は UTC 0:00。遅延を拾うため 1 時間先まで対象にする。
   * 「今日（UTC）の定刻スロットを未実行」の daily は `next_run_at` が未来でも実行する。
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

  const watchDueFilter = `next_run_at.is.null,next_run_at.lte.${horizonIso},and(schedule_frequency.eq.daily,or(last_run_at.is.null,last_run_at.lt.${todayStartIso}))`;
  const watchSelectWithMetadata =
    "id,user_id,url,region,enabled,last_notified_at,schedule_frequency,repeat_count,notify_mode,notify_on_metadata,snapshot_full_page,next_run_at,last_run_at,webhook_url,plan_id";
  const watchSelectLegacy =
    "id,user_id,url,region,enabled,last_notified_at,schedule_frequency,repeat_count,notify_mode,snapshot_full_page,next_run_at,last_run_at,webhook_url,plan_id";
  let watches: Record<string, unknown>[] | null = null;
  const { data: watchRowsWithMetadata, error: watchSelectError } = await svc
    .from("observation_watches")
    .select(watchSelectWithMetadata)
    .eq("enabled", true)
    .or(watchDueFilter)
    .order("next_run_at", { ascending: true, nullsFirst: true })
    .limit(40);
  let error = watchSelectError;
  if (error && /notify_on_metadata/i.test(error.message)) {
    const fallback = await svc
      .from("observation_watches")
      .select(watchSelectLegacy)
      .eq("enabled", true)
      .or(watchDueFilter)
      .order("next_run_at", { ascending: true, nullsFirst: true })
      .limit(40);
    watches = (fallback.data ?? []) as Record<string, unknown>[];
    error = fallback.error;
  } else {
    watches = (watchRowsWithMetadata ?? []) as Record<string, unknown>[];
  }

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  }

  let ran = 0;
  let notified = 0;
  let failureNotified = 0;
  let quotaSkipped = 0;
  let quotaSkipNotified = 0;

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
    const { userEmail, url, region, watchId, stage, errorCode } = params;
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
    const userMsg = cronFailureMessageForUser(errorCode, stage);

    const subject = "Viewtrace: scheduled observation failed / 定期自動観測に失敗";
    const text = [
      "Scheduled auto-observation did not complete.",
      "定期自動観測を完了できませんでした（記録は追加されていません）。",
      "",
      `URL: ${url}`,
      `Region / 地域: ${region}`,
      `Stage / 段階: ${stageEn} / ${stageJa}`,
      `Message / 内容: ${userMsg.en} / ${userMsg.ja}`,
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
      `<p><strong>Message</strong> / 内容<br/>${escapeHtml(userMsg.en)} / ${escapeHtml(userMsg.ja)}</p>`,
      `<p><a href="${escapeHtml(dashboardUrl)}" style="color:#2563eb;text-decoration:underline;">Open dashboard / ダッシュボードを開く</a></p>`,
      emailAccountHintHtml(userEmail),
    ].join("");

    const res = await sendResendEmail({ to: userEmail, subject, text, html });
    if (res.ok) return true;
    console.warn("[cron] failure email failed", { watchId, error: res.error });
    return false;
  }

  const planCache = new Map<string, PlanDefinition>();
  async function planForUser(userId: string, watchPlanId: string): Promise<PlanDefinition> {
    const cached = planCache.get(userId);
    if (cached) return cached;
    const { data, error } = await svc.from("users").select("plan").eq("id", userId).maybeSingle();
    const fromUsers =
      !error && data && typeof (data as { plan?: unknown }).plan === "string"
        ? parsePlanId(String((data as { plan: string }).plan))
        : null;
    const plan = getPlan(fromUsers ?? parsePlanId(watchPlanId || undefined));
    planCache.set(userId, plan);
    return plan;
  }

  async function sendCronQuotaSkipEmail(params: {
    userEmail: string | null;
    userId: string;
    required: number;
    remaining: number;
  }): Promise<boolean> {
    const { userEmail, userId, required, remaining } = params;
    if (!userEmail) {
      console.warn("[cron] quota skip email skipped: user_email_missing", { userId });
      return false;
    }
    if (!isResendConfigured()) {
      console.warn("[cron] quota skip email skipped: resend_not_configured", { userId });
      return false;
    }
    const checkoutUrl = `${getAppOriginForEmailLinks()}/checkout?plan=starter`;
    const subject = "Viewtrace: scheduled run skipped / 定期観測をスキップしました";
    const text = [
      `${required} required`,
      `${remaining} remaining`,
      "Scheduled run skipped",
      "",
      "You've reached your monthly Observation limit. Upgrade to continue.",
      "今月の Observation 上限のため、今回の定期実行は行いません。続けるにはプランをアップグレードしてください。",
      "",
      `Dashboard / ダッシュボード: ${dashboardUrl}`,
      `Upgrade / アップグレード: ${checkoutUrl}`,
      "",
      emailAccountHintText(userEmail),
    ].join("\n");
    const html = [
      `<p><strong>${required} required</strong><br/>${remaining} remaining<br/>Scheduled run skipped</p>`,
      "<p>You've reached your monthly Observation limit. Upgrade to continue.</p>",
      "<p>今月の Observation 上限のため、今回の定期実行は行いません。続けるにはプランをアップグレードしてください。</p>",
      `<p><a href="${escapeHtml(dashboardUrl)}" style="color:#2563eb;text-decoration:underline;">Open dashboard / ダッシュボードを開く</a></p>`,
      `<p><a href="${escapeHtml(checkoutUrl)}" style="color:#2563eb;text-decoration:underline;">Upgrade / アップグレード</a></p>`,
      emailAccountHintHtml(userEmail),
    ].join("");
    const res = await sendResendEmail({ to: userEmail, subject, text, html });
    if (res.ok) return true;
    console.warn("[cron] quota skip email failed", { userId, error: res.error });
    return false;
  }

  type DueWatch = {
    watchId: string;
    userId: string;
    url: string;
    region: string;
    freq: WatchFrequency;
    repeatCount: number;
    maxDailyRepeats: number;
  };

  const skipWatchIds = new Set<string>();
  const remainingByUser = new Map<string, number>();
  const dueByUser = new Map<string, DueWatch[]>();

  for (const w of watches ?? []) {
    const row = w as unknown as Record<string, unknown>;
    const url = getString(row, "url");
    const region = getString(row, "region");
    const watchId = getString(row, "id");
    const userId = getString(row, "user_id");
    if (!url || !region || !watchId || !userId) continue;

    const watchPlanId = getString(row, "plan_id");
    const plan = await planForUser(userId, watchPlanId);
    const freq = parseWatchFrequency(getString(row, "schedule_frequency")) ?? ("daily" as WatchFrequency);
    const repeatCount = clampRepeatCount(freq, getNum(row, "repeat_count", 1), plan.watchMaxDailyRepeats);
    const nextRunAtRaw = getString(row, "next_run_at");
    const lastRunAtRaw = getString(row, "last_run_at");
    const dueByNextRun =
      !nextRunAtRaw || new Date(nextRunAtRaw).getTime() <= new Date(horizonIso).getTime();
    const dueByDailyAnchor =
      freq === "daily" &&
      isDailyWatchDueOnCronDay(now, lastRunAtRaw || null, repeatCount, plan.watchMaxDailyRepeats);
    if (!dueByNextRun && !dueByDailyAnchor) continue;

    const entry: DueWatch = {
      watchId,
      userId,
      url,
      region,
      freq,
      repeatCount,
      maxDailyRepeats: plan.watchMaxDailyRepeats,
    };
    const list = dueByUser.get(userId) ?? [];
    list.push(entry);
    dueByUser.set(userId, list);
  }

  for (const [userId, list] of dueByUser) {
    const plan = planCache.get(userId) ?? getPlan("freeplan");
    const used = await countObservationsThisUtcMonth(svc, userId, now);
    if (used == null || !plan.autoObservationWatch) {
      for (const item of list) {
        skipWatchIds.add(item.watchId);
        const nextRun = computeNextRunAfter(now, item.freq, item.repeatCount, item.maxDailyRepeats).toISOString();
        await svc
          .from("observation_watches")
          .update({ last_run_at: now.toISOString(), next_run_at: nextRun })
          .eq("id", item.watchId);
      }
      quotaSkipped += list.length;
      await appendAuditEventAsService(svc, userId, {
        scope: "system",
        action: "observation.cron_quota_skipped",
        meta: {
          required: list.length,
          remaining: used == null ? null : remainingObservations(used, plan.monthlyObservations),
          reason: used == null ? "count_failed" : "watch_not_on_plan",
        },
      });
      continue;
    }

    const remaining = remainingObservations(used, plan.monthlyObservations);
    remainingByUser.set(userId, remaining);
    if (canStartObservationBatch(remaining, list.length)) continue;

    for (const item of list) {
      skipWatchIds.add(item.watchId);
      const nextRun = computeNextRunAfter(now, item.freq, item.repeatCount, item.maxDailyRepeats).toISOString();
      await svc
        .from("observation_watches")
        .update({ last_run_at: now.toISOString(), next_run_at: nextRun })
        .eq("id", item.watchId);
    }
    quotaSkipped += list.length;
    await appendAuditEventAsService(svc, userId, {
      scope: "system",
      action: "observation.cron_quota_skipped",
      meta: {
        required: list.length,
        remaining,
        reason: "insufficient_remaining",
      },
    });
    const userEmail = await getUserEmail(userId);
    const sent = await sendCronQuotaSkipEmail({
      userEmail,
      userId,
      required: list.length,
      remaining,
    });
    if (sent) quotaSkipNotified += 1;
  }

  for (const w of watches ?? []) {
    ran += 1;
    const row = w as unknown as Record<string, unknown>;
    const url = getString(row, "url");
    const region = getString(row, "region");
    const watchId = getString(row, "id");
    const userId = getString(row, "user_id");
    const notifyMode: WatchNotifyMode = parseWatchNotifyMode(getString(row, "notify_mode")) ?? "always";
    const notifyOnMetadata = parseWatchNotifyOnMetadata(row.notify_on_metadata);
    const fullPage = getBool(row, "snapshot_full_page", false);
    const webhookUrl = normalizeObservationWebhookUrl(getString(row, "webhook_url") || null);

    if (!url || !region || !watchId || !userId) continue;
    if (skipWatchIds.has(watchId)) continue;

    const watchPlanId = getString(row, "plan_id");
    const plan = await planForUser(userId, watchPlanId);
    const freq = parseWatchFrequency(getString(row, "schedule_frequency")) ?? ("daily" as WatchFrequency);
    const repeatCount = clampRepeatCount(freq, getNum(row, "repeat_count", 1), plan.watchMaxDailyRepeats);
    const nextRunAtRaw = getString(row, "next_run_at");
    const lastRunAtRaw = getString(row, "last_run_at");
    const dueByNextRun =
      !nextRunAtRaw || new Date(nextRunAtRaw).getTime() <= new Date(horizonIso).getTime();
    const dueByDailyAnchor =
      freq === "daily" &&
      isDailyWatchDueOnCronDay(now, lastRunAtRaw || null, repeatCount, plan.watchMaxDailyRepeats);
    if (!dueByNextRun && !dueByDailyAnchor) continue;

    const remaining = remainingByUser.get(userId) ?? 0;
    if (remaining < 1) {
      skipWatchIds.add(watchId);
      quotaSkipped += 1;
      const nextRun = computeNextRunAfter(now, freq, repeatCount, plan.watchMaxDailyRepeats).toISOString();
      await svc
        .from("observation_watches")
        .update({ last_run_at: now.toISOString(), next_run_at: nextRun })
        .eq("id", watchId);
      continue;
    }

    const userEmail = await getUserEmail(userId);

    const shot = await runBrowserlessScreenshotWithProxyRetry({ url, region, fullPage });

    const nextRun = computeNextRunAfter(new Date(), freq, repeatCount, plan.watchMaxDailyRepeats).toISOString();

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

    const note = truncateObservationNote(
      blobUrl ? "自動観測（定期）" : "自動観測（スクリーンショットの保存に失敗）",
    );

    let htmlSignals;
    try {
      const preview = await runUrlPreviewFetch(url, {
        screenshotFallback: false,
        regionValue: region,
        retryWithoutProxyOnFailure: true,
      });
      if (preview.ok && htmlHeadSignalsHasAny(preview.htmlSignals)) {
        htmlSignals = preview.htmlSignals;
      }
    } catch {
      htmlSignals = undefined;
    }

    const pngDims = await getPngDimensions(shot.png);
    let captureConditions = buildCaptureConditionsFromBrowserless({
      capturedAt,
      regionInput: region,
      regionLabel: region,
      fullPageRequested: fullPage,
      viaResidential: shot.viaResidential ?? false,
      viaExternalProxy: shot.viaExternalProxy ?? false,
      usedRetryWithoutProxy: shot.usedRetryWithoutProxy ?? false,
      residentialStateApplied: shot.residentialStateApplied ?? false,
      durationMs: shot.durationMs ?? null,
      estimatedTimeUnits: shot.estimatedTimeUnits ?? null,
      proxyBytes: shot.proxyBytes ?? null,
      proxyBytesMeasuredAttempts: shot.proxyBytesMeasuredAttempts ?? null,
      fallback: shot.usedRetryWithoutProxy ?? false,
      attempts: shot.attempts ?? null,
      attemptsLog: shot.attemptsLog ?? null,
      storageFormat: "webp",
      webpQuality: 86,
      imageWidthPx: pngDims?.width ?? null,
      imageHeightPx: pngDims?.height ?? null,
      snapshotBytes: snapshotBytesStored,
      snapshotContentType: snapshotContentTypeStored,
      snapshotSha256Present: Boolean(snapshotSha256Stored),
    });
    if (htmlSignals) {
      captureConditions = { ...captureConditions, html_signals: htmlSignals };
    }

    const obsForHash: Observation = {
      id: obsId,
      url,
      regionValue: region,
      regionLabel: region,
      capturedAt,
      status: blobUrl ? "success" : "failure",
      note,
      snapshotImageUrl: blobUrl ?? undefined,
      snapshotSha256: snapshotSha256Stored ?? undefined,
      snapshotPhash: snapshotPhashStored ?? undefined,
      captureConditions,
      events: undefined,
    };
    const contentHash = computeObservationContentHash(obsForHash);
    const verifyToken = generateObservationVerifyToken();

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
      capture_conditions: captureConditions,
      verify_token: verifyToken,
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

    remainingByUser.set(userId, Math.max(0, remaining - 1));

    const { openUrl } = buildObservationRecordOpenUrls(getAppOriginForEmailLinks(), obsId);
    const previous = blobUrl
      ? await findPreviousObservationForCompare(svc, {
          userId,
          url,
          region,
          beforeCapturedAt: capturedAt,
          excludeId: obsId,
        })
      : null;
    const screenshot = previous ? screenshotCompareField(previous, obsForHash) : null;
    const compareOpenUrl = previous
      ? buildObservationCompareOpenUrl(getAppOriginForEmailLinks(), previous.id, obsId)
      : null;

    if (webhookUrl) {
      const posted = await postObservationWebhook(webhookUrl, {
        event: "observation.auto_saved",
        observationId: obsId,
        url,
        region,
        capturedAt,
        status: blobUrl ? "success" : "failure",
        snapshotUrl: blobUrl ?? undefined,
        snapshotSha256: snapshotSha256Stored ?? undefined,
        screenshotVerdict: screenshot?.verdict,
        previousObservationId: previous?.id,
        compareUrl: compareOpenUrl ?? undefined,
        recordUrl: openUrl,
        verifyUrl: buildPublicVerifyUrlForObservation(verifyToken),
      });
      if (!posted) {
        console.warn("[cron] webhook post failed", { watchId, userId });
      }
    }

    let emailedThisRun = false;
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
          compareOpenUrl ? `Open compare / 比較を開く: ${compareOpenUrl}` : "",
          "",
          emailAccountHintText(userEmail),
        ]
          .filter((line) => line !== "")
          .join("\n");
        const html = [
          "<p>A new scheduled observation was recorded.</p>",
          "<p>新しい定期自動観測の記録が追加されました。</p>",
          `<p><strong>URL</strong><br/>${escapeHtml(url)}</p>`,
          `<p><strong>Region</strong> / 地域<br/>${escapeHtml(region)}</p>`,
          blobUrl
            ? `<p><a href="${escapeHtml(blobUrl)}">Snapshot link</a></p>`
            : "<p>Snapshot was not stored to Blob; open the dashboard for details.</p>",
          observationRecordLinkHtml(openUrl),
          compareOpenUrl ? observationCompareLinkHtml(compareOpenUrl) : "",
          emailAccountHintHtml(userEmail),
        ].join("");

        const res = await sendResendEmail({ to: userEmail, subject, text, html });
        if (res.ok) {
          notified += 1;
          emailedThisRun = true;
          await markWatchNotified(watchId);
        } else {
          console.warn("[cron] email failed", { watchId, userId, error: res.error });
        }
      }
    }

    if (
      notifyMode === "change_only" &&
      screenshot &&
      shouldNotifyWatchOnScreenshot(screenshot.verdict) &&
      compareOpenUrl
    ) {
      if (!userEmail) {
        console.warn("[cron] email skipped: user_email_missing", { watchId, userId });
      } else if (!isResendConfigured()) {
        console.warn("[cron] email skipped: resend_not_configured", { watchId, userId });
      } else {
        const subject = "Viewtrace: Screenshot difference detected";
        const text = [
          "Screenshot difference detected",
          "前回の Observation とスクリーンショットの内容が異なります。ページ自体が変更されたとは限りません。",
          "",
          `URL: ${url}`,
          `Region / 地域: ${region}`,
          "",
          `Open compare / 比較を開く: ${compareOpenUrl}`,
          `Open record / 記録を開く: ${openUrl}`,
          "",
          emailAccountHintText(userEmail),
        ].join("\n");
        const html = [
          "<p><strong>Screenshot difference detected</strong></p>",
          "<p>前回の Observation とスクリーンショットの内容が異なります。ページ自体が変更されたとは限りません。</p>",
          `<p><strong>URL</strong><br/>${escapeHtml(url)}</p>`,
          `<p><strong>Region</strong> / 地域<br/>${escapeHtml(region)}</p>`,
          observationCompareLinkHtml(compareOpenUrl),
          observationRecordLinkHtml(openUrl),
          emailAccountHintHtml(userEmail),
        ].join("");

        const res = await sendResendEmail({ to: userEmail, subject, text, html });
        if (res.ok) {
          notified += 1;
          emailedThisRun = true;
          await markWatchNotified(watchId);
        } else {
          console.warn("[cron] email failed", { watchId, userId, error: res.error });
        }
      }
    }

    const metadataNotify = shouldNotifyWatchOnMetadata({
      notifyOnMetadata,
      alreadyNotifiedThisRun: emailedThisRun,
      previous: previous?.captureConditions?.html_signals,
      current: captureConditions.html_signals,
    });
    if (metadataNotify.send && compareOpenUrl) {
      if (!userEmail) {
        console.warn("[cron] email skipped: user_email_missing", { watchId, userId });
      } else if (!isResendConfigured()) {
        console.warn("[cron] email skipped: resend_not_configured", { watchId, userId });
      } else {
        const fields = metadataNotify.fields.join(" / ");
        const subject = "Viewtrace: Metadata difference recorded";
        const text = [
          "Metadata difference recorded",
          "前回の Observation と title / canonical / noindex が異なります。順位やページ全体の診断ではありません。",
          "",
          `Changed / 差: ${fields}`,
          `URL: ${url}`,
          `Region / 地域: ${region}`,
          "",
          `Open compare / 比較を開く: ${compareOpenUrl}`,
          `Open record / 記録を開く: ${openUrl}`,
          "",
          emailAccountHintText(userEmail),
        ].join("\n");
        const html = [
          "<p><strong>Metadata difference recorded</strong></p>",
          "<p>前回の Observation と title / canonical / noindex が異なります。順位やページ全体の診断ではありません。</p>",
          `<p><strong>Changed</strong> / 差<br/>${escapeHtml(fields)}</p>`,
          `<p><strong>URL</strong><br/>${escapeHtml(url)}</p>`,
          `<p><strong>Region</strong> / 地域<br/>${escapeHtml(region)}</p>`,
          observationCompareLinkHtml(compareOpenUrl),
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

  return okJson({ ran, notified, failureNotified, quotaSkipped, quotaSkipNotified });
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
function observationCompareLinkHtml(compareUrl: string): string {
  const primary = escapeHtml(compareUrl);
  return [
    '<p style="margin:12px 0;line-height:1.5;word-break:break-all;overflow-wrap:anywhere;-webkit-hyphens:none;hyphens:none;">',
    `<a href="${primary}" style="color:#2563eb;text-decoration:underline;word-break:break-all;overflow-wrap:anywhere;">Open compare / 比較を開く</a>`,
    "</p>",
    '<p style="margin:8px 0 0;font-size:13px;color:#444;line-height:1.45;word-break:break-all;overflow-wrap:anywhere;-webkit-hyphens:none;hyphens:none;">',
    primary,
    "</p>",
  ].join("");
}

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
