import { NextResponse } from "next/server";
import type { Span } from "@opentelemetry/api";
import { AUDIT_ACTION, appendAuditEventAsService } from "@/lib/audit-log";
import {
  ATTR,
  markSpanResult,
  requestedStateAttr,
  setSpanAttrs,
  urlHostAttr,
  withSpan,
} from "@/lib/otel/trace";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runDueJourneyWatches } from "@/lib/journey-store";
import { runDueMonitoringWatches } from "@/lib/monitoring-watch-store";
import {
  applyRequestedDevice,
  buildCaptureConditionsFromBrowserless,
  buildCaptureConditionsFromPlaywrightWorker,
  REQUESTED_DEVICE_VIEWPORT,
} from "@/lib/capture-conditions";
import { runObservationPrimaryScreenshot } from "@/lib/observation-primary-capture";
import { recordStateCoverage } from "@/lib/state-coverage";
import { runUrlPreviewFetch } from "@/lib/url-preview-fetch";
import { stampMeasurement } from "@/lib/measurement-record";
import { seoFactsForObservation } from "@/lib/observation-seo-facts";
import { collectObservationWebFacts } from "@/lib/observation-web-facts";
import { isBrowserlessConfigured } from "@/lib/browserless-screenshot";
import { runBrowserlessScrollWithProxyRetry } from "@/lib/browserless-scroll-interaction";
import { buildRegionalCheckFromSession } from "@/lib/observation-regional-interaction";
import {
  interactionWatchPlan,
  persistRegionalInteractionCheck,
  stampDiscoveryFullAt,
  WATCH_INTERACTION_MIN_BUDGET_MS,
} from "@/lib/observation-watch-interaction";
import { changeAuditEmailSection } from "@/lib/observation-change-audit-email";
import {
  runWatchChangeAudit,
  WATCH_CHANGE_AUDIT_MIN_BUDGET_MS,
  watchChangeAuditTrigger,
} from "@/lib/observation-change-audit-run";
import {
  behaviorAlertEmailCopy,
  behaviorAlertTransitions,
  behaviorMapAlertDiffs,
  type BehaviorMapDiffV1,
  type BehaviorTransitionV1,
} from "@/lib/observation-behavior-diff";
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
import {
  pageSignalsScoreDelta,
  pageSignalsWatchEmailLines,
} from "@/lib/observation-page-signals";
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
  const cronStartedAt = Date.now();
  const CRON_BUDGET_MS = 270_000;
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
  let interactionRan = 0;
  let interactionSkipped = 0;
  let interactionAlerted = 0;
  let changeAuditRan = 0;
  let changeAuditSkipped = 0;

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

  /**
   * Watch 1 件の 1 実行 = trace 1 本（span `watch.run`）。
   * 子 span: capture.primary / browserless.* / blob.upload_snapshot / preview.fetch / facts.web /
   * browserless.interaction_check / resend.send。Supabase の REST 呼び出しは fetch 計装で自動。
   * 早期 return は以前の `continue` と同じ意味。
   */
  async function processWatch(row: Record<string, unknown>, span: Span): Promise<void> {
    const url = getString(row, "url");
    const region = getString(row, "region");
    const watchId = getString(row, "id");
    const userId = getString(row, "user_id");
    const notifyMode: WatchNotifyMode = parseWatchNotifyMode(getString(row, "notify_mode")) ?? "always";
    const notifyOnMetadata = parseWatchNotifyOnMetadata(row.notify_on_metadata);
    const webhookUrl = normalizeObservationWebhookUrl(getString(row, "webhook_url") || null);

    if (!url || !region || !watchId || !userId) {
      setSpanAttrs(span, { [ATTR.outcome]: "invalid_row" });
      return;
    }
    setSpanAttrs(span, {
      [ATTR.watchId]: watchId,
      [ATTR.userId]: userId,
      [ATTR.urlHost]: urlHostAttr(url),
      [ATTR.regionRequested]: region,
      [ATTR.stateRequested]: requestedStateAttr(region),
      "viewtrace.watch.notify_mode": notifyMode,
    });
    if (skipWatchIds.has(watchId)) {
      setSpanAttrs(span, { [ATTR.outcome]: "skipped_quota" });
      return;
    }

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
    if (!dueByNextRun && !dueByDailyAnchor) {
      setSpanAttrs(span, { [ATTR.outcome]: "not_due" });
      return;
    }

    const remaining = remainingByUser.get(userId) ?? 0;
    if (remaining < 1) {
      skipWatchIds.add(watchId);
      quotaSkipped += 1;
      const nextRun = computeNextRunAfter(now, freq, repeatCount, plan.watchMaxDailyRepeats).toISOString();
      await svc
        .from("observation_watches")
        .update({ last_run_at: now.toISOString(), next_run_at: nextRun })
        .eq("id", watchId);
      setSpanAttrs(span, { [ATTR.outcome]: "skipped_quota" });
      return;
    }

    setSpanAttrs(span, {
      "viewtrace.plan": plan.id,
      "viewtrace.watch.frequency": freq,
      "viewtrace.watch.repeat_count": repeatCount,
    });
    const userEmail = await getUserEmail(userId);
    const fullPage = plan.snapshotFullPage;
    const desktop = REQUESTED_DEVICE_VIEWPORT.desktop;
    const statePlan = /^US-[A-Z]{2}$/i.test(region)
      ? await interactionWatchPlan(svc, {
          userId,
          url,
          region,
          capturedAt: new Date().toISOString(),
          excludeId: "pending",
          htmlChanged: false,
        })
      : null;

    const primary = await runObservationPrimaryScreenshot({
      url,
      region,
      fullPage,
      viewport: {
        width: desktop.width,
        height: desktop.height,
        isMobile: false,
        hasTouch: false,
      },
      interaction: statePlan
        ? { url, prior: statePlan.prior, scan: statePlan.scan, environment: { device_class: "desktop" } }
        : undefined,
    });
    const shot = primary.result;
    setSpanAttrs(span, {
      [ATTR.engine]: primary.engine,
      "viewtrace.capture.ok": shot.ok,
      [ATTR.stateVerified]:
        primary.engine === "browserless" ? primary.result.stateVerified ?? null : null,
      [ATTR.fallbackLevel]:
        primary.engine === "browserless" ? primary.result.fallbackLevel ?? null : null,
      "viewtrace.interaction.in_session":
        primary.engine === "browserless" && primary.result.ok && Boolean(primary.result.interaction),
    });

    const nextRun = computeNextRunAfter(new Date(), freq, repeatCount, plan.watchMaxDailyRepeats).toISOString();

    if (!shot.ok) {
      markSpanResult(span, { ok: false, error: shot.error }, { [ATTR.outcome]: "screenshot_failed" });
      const failDetail = "detail" in shot && typeof shot.detail === "string" ? shot.detail : undefined;
      console.warn("[cron] screenshot failed", { watchId, url, region, error: shot.error, detail: failDetail });
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
          detail: failDetail?.slice(0, 300),
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
          "detail" in shot && typeof shot.detail === "string"
            ? shot.detail
            : "upstreamStatus" in shot && shot.upstreamStatus
              ? `upstream HTTP ${shot.upstreamStatus}`
              : undefined,
      });
      if (sent) {
        failureNotified += 1;
        await markWatchNotified(watchId);
      }
      return;
    }

    const obsId = crypto.randomUUID();
    setSpanAttrs(span, { [ATTR.observationId]: obsId });
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
    let previewForFacts: Awaited<ReturnType<typeof runUrlPreviewFetch>> | undefined;
    try {
      const preview = await runUrlPreviewFetch(url, {
        screenshotFallback: false,
        regionValue: region,
        retryWithoutProxyOnFailure: true,
      });
      previewForFacts = preview;
      if (preview.ok && htmlHeadSignalsHasAny(preview.htmlSignals)) {
        htmlSignals = preview.htmlSignals;
      }
    } catch {
      htmlSignals = undefined;
    }

    const pngDims = await getPngDimensions(shot.png);
    let captureConditions =
      primary.engine === "playwright_worker" && primary.result.ok
        ? buildCaptureConditionsFromPlaywrightWorker({
            capturedAt,
            regionInput: region,
            regionLabel: region,
            fullPageRequested: fullPage,
            observedCountry: primary.result.observed.country,
            observedState: primary.result.observed.region,
            viaResidentialProxy: primary.result.viaResidentialProxy,
            durationMs: primary.result.durationMs,
            storageFormat: "webp",
            webpQuality: 86,
            imageWidthPx: pngDims?.width ?? null,
            imageHeightPx: pngDims?.height ?? null,
            snapshotBytes: snapshotBytesStored,
            snapshotContentType: snapshotContentTypeStored,
            snapshotSha256Present: Boolean(snapshotSha256Stored),
          })
        : primary.engine === "browserless" && primary.result.ok
          ? buildCaptureConditionsFromBrowserless({
              capturedAt,
              regionInput: region,
              regionLabel: region,
              fullPageRequested: fullPage,
              viaResidential: primary.result.viaResidential ?? false,
              viaExternalProxy: primary.result.viaExternalProxy ?? false,
              usedRetryWithoutProxy: primary.result.usedRetryWithoutProxy ?? false,
              residentialStateApplied: primary.result.residentialStateApplied ?? false,
              stateVerified: primary.result.stateVerified === true,
              fallbackLevel: primary.result.fallbackLevel ?? null,
              geoAttempts: primary.result.geoAttempts ?? null,
              stateTargetingRejected: primary.result.stateTargetingRejected === true,
              verifiedMeasurements: primary.result.verifiedMeasurements,
              proxyProvider: primary.result.proxyProvider,
              durationMs: primary.result.durationMs ?? null,
              estimatedTimeUnits: primary.result.estimatedTimeUnits ?? null,
              proxyBytes: primary.result.proxyBytes ?? null,
              proxyBytesMeasuredAttempts: primary.result.proxyBytesMeasuredAttempts ?? null,
              fallback: primary.result.usedRetryWithoutProxy ?? false,
              attempts: primary.result.attempts ?? null,
              attemptsLog: primary.result.attemptsLog ?? null,
              storageFormat: "webp",
              webpQuality: 86,
              imageWidthPx: pngDims?.width ?? null,
              imageHeightPx: pngDims?.height ?? null,
              snapshotBytes: snapshotBytesStored,
              snapshotContentType: snapshotContentTypeStored,
              snapshotSha256Present: Boolean(snapshotSha256Stored),
            })
          : buildCaptureConditionsFromBrowserless({
              capturedAt,
              regionInput: region,
              regionLabel: region,
              fullPageRequested: fullPage,
              viaResidential: false,
              viaExternalProxy: false,
              usedRetryWithoutProxy: false,
              storageFormat: "webp",
              webpQuality: 86,
              imageWidthPx: pngDims?.width ?? null,
              imageHeightPx: pngDims?.height ?? null,
              snapshotBytes: snapshotBytesStored,
              snapshotContentType: snapshotContentTypeStored,
              snapshotSha256Present: Boolean(snapshotSha256Stored),
            });
    if (primary.engine === "playwright_worker" && primary.result.ok && primary.result.htmlSignals) {
      captureConditions = { ...captureConditions, html_signals: primary.result.htmlSignals };
    } else if (htmlSignals) {
      captureConditions = { ...captureConditions, html_signals: htmlSignals };
    }
    try {
      const preview = previewForFacts?.ok ? previewForFacts : undefined;
      const webFacts = await collectObservationWebFacts({
        target: url,
        observedAt: new Date().toISOString(),
        preview: preview
          ? {
              status: preview.status,
              final_url: preview.canonicalUrl,
              via_proxy: preview.viaProxy,
              headers: preview.headers,
              html_sample_sha256: preview.htmlSampleSha256,
              html_sample_bytes: preview.htmlSampleBytes,
              html_sample_truncated: preview.htmlSampleTruncated,
            }
          : undefined,
      });
      if (webFacts) captureConditions = { ...captureConditions, web_facts: webFacts };
      captureConditions = stampMeasurement(captureConditions);
    } catch (err) {
      console.warn("[cron] web facts unavailable", {
        watchId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    const seoFacts = seoFactsForObservation({
      requestedUrl: url,
      storedHtmlSignals: captureConditions.html_signals,
      preview: previewForFacts?.ok
        ? { ok: true, html: previewForFacts.html, htmlSignals: previewForFacts.htmlSignals }
        : { ok: false },
      webFacts: captureConditions.web_facts,
    });
    if (seoFacts) captureConditions = { ...captureConditions, seo_facts: seoFacts };
    captureConditions = applyRequestedDevice(captureConditions, "desktop");

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

    if (!insertObsError && primary.engine === "browserless" && primary.result.ok) {
      await recordStateCoverage(svc, {
        userId,
        url,
        region,
        capturedAt,
        observationId: obsId,
        stateVerified: primary.result.stateVerified === true,
        geoAttempts: primary.result.geoAttempts ?? 0,
        stateTargetingRejected: primary.result.stateTargetingRejected === true,
      });
    }

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
      markSpanResult(span, { ok: false, error: "observation_insert_failed" }, { [ATTR.outcome]: "insert_failed" });
      return;
    }
    setSpanAttrs(span, {
      [ATTR.outcome]: "saved",
      "viewtrace.observation.status": blobUrl ? "success" : "failure",
      "viewtrace.observation.snapshot_stored": Boolean(blobUrl),
    });

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
    const pageSignalsDelta = previous
      ? pageSignalsScoreDelta(previous.captureConditions?.html_signals, captureConditions.html_signals)
      : null;
    const pageSignalsEmail = pageSignalsDelta ? pageSignalsWatchEmailLines(pageSignalsDelta) : null;

    let behaviorAlerts: BehaviorTransitionV1[] = [];
    let behaviorMapAlerts: BehaviorMapDiffV1[] = [];
    if (blobUrl && statePlan && primary.engine === "browserless" && primary.result.ok && primary.result.interaction) {
      try {
        const check = buildRegionalCheckFromSession({
          raw: primary.result.interaction,
          requestedUrl: url,
          requestedRegion: region,
          measuredAt: capturedAt,
          durationMs: primary.result.durationMs ?? 0,
          proxyBytes: primary.result.proxyBytes ?? null,
        });
        stampDiscoveryFullAt(check, statePlan.lastFullDiscoveryAt);
        const persisted = await persistRegionalInteractionCheck(svc, {
          userId,
          observationId: obsId,
          url,
          region,
          capturedAt,
          check,
          billing: "watch_included",
        });
        if (persisted.saved) {
          interactionRan += 1;
          behaviorAlerts = behaviorAlertTransitions(persisted.diff);
          behaviorMapAlerts = behaviorMapAlertDiffs(persisted.diff);
        }
      } catch (err) {
        console.warn("[cron] state session interaction unavailable", {
          watchId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    } else if (blobUrl && statePlan) {
      interactionSkipped += 1;
    } else if (blobUrl) {
      const timeLeft = CRON_BUDGET_MS - (Date.now() - cronStartedAt);
      if (!isBrowserlessConfigured() || timeLeft < WATCH_INTERACTION_MIN_BUDGET_MS) {
        interactionSkipped += 1;
        console.warn("[cron] interaction check skipped", {
          watchId,
          reason: isBrowserlessConfigured() ? "time_budget" : "not_configured",
          timeLeft,
        });
      } else {
        try {
          const currentSha = captureConditions.web_facts?.html.sample_sha256 ?? null;
          const previousSha = previous?.captureConditions?.web_facts?.html.sample_sha256 ?? null;
          const htmlChanged = Boolean(currentSha && previousSha && currentSha !== previousSha);
          const watchPlan = await interactionWatchPlan(svc, {
            userId,
            url,
            region,
            capturedAt,
            excludeId: obsId,
            htmlChanged,
          });
          const interaction = await runBrowserlessScrollWithProxyRetry({
            url,
            region,
            prior: watchPlan.prior,
            scan: watchPlan.scan,
          });
          if (!interaction.ok) {
            console.warn("[cron] interaction check failed", {
              watchId,
              error: interaction.error,
              durationMs: interaction.durationMs,
              proxyBytes: interaction.proxyBytes,
            });
          } else {
            stampDiscoveryFullAt(interaction.check, watchPlan.lastFullDiscoveryAt);
            const persisted = await persistRegionalInteractionCheck(svc, {
              userId,
              observationId: obsId,
              url,
              region,
              capturedAt,
              check: interaction.check,
              billing: "watch_included",
            });
            if (persisted.saved) {
              interactionRan += 1;
              behaviorAlerts = behaviorAlertTransitions(persisted.diff);
              behaviorMapAlerts = behaviorMapAlertDiffs(persisted.diff);
              const detected = interaction.check.types.filter((row) => row.detected).length;
              const executed = interaction.check.types.filter(
                (row) =>
                  row.status === "working" ||
                  row.status === "no_change_observed" ||
                  row.status === "failed" ||
                  row.status === "blocked_for_safety" ||
                  row.status === "playback_not_verifiable",
              ).length;
              await appendAuditEventAsService(svc, userId, {
                scope: "observation",
                action: "observation.watch_interaction_check",
                observationId: obsId,
                meta: {
                  watchId,
                  region,
                  duration_ms: interaction.check.duration_ms,
                  proxy_bytes: interaction.check.proxy_bytes,
                  detected,
                  executed,
                  alerts: behaviorAlerts.length,
                  billing: "watch_included",
                },
              });
            }
          }
        } catch (err) {
          console.warn("[cron] interaction check unavailable", {
            watchId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    setSpanAttrs(span, {
      "viewtrace.compare.previous_found": Boolean(previous),
      "viewtrace.compare.screenshot_verdict": screenshot?.verdict ?? null,
      "viewtrace.behavior.alerts": behaviorAlerts.length,
      "viewtrace.behavior.map_alerts": behaviorMapAlerts.length,
    });

    /**
     * Change Audit（Evidence Interpreter）。Same なら走らない。Behavior Diff の Alert か Screenshot Changed のときだけ、
     * 保存済みの Observation / 直前 Compare / Behavior Diff を読んで、記録の下の「読み」を作る。再計測はしない。
     * Pro の上・月間上限あり。失敗しても Alert メール自体は止めない。
     */
    let changeAuditSection: { text: string[]; html: string } | null = null;
    const auditTrigger = watchChangeAuditTrigger({
      behaviorAlerts,
      behaviorMapAlerts,
      screenshotVerdict: screenshot?.verdict ?? null,
    });
    if (auditTrigger && blobUrl) {
      const timeLeft = CRON_BUDGET_MS - (Date.now() - cronStartedAt);
      if (timeLeft < WATCH_CHANGE_AUDIT_MIN_BUDGET_MS) {
        changeAuditSkipped += 1;
        console.warn("[cron] change audit skipped", { watchId, reason: "time_budget", timeLeft });
      } else {
        try {
          const auditResult = await runWatchChangeAudit(svc, {
            userId,
            plan,
            observation: obsForHash,
            previous,
            behaviorAlerts,
            behaviorMapAlerts,
            screenshotVerdict: screenshot?.verdict ?? null,
            locale: "ja",
          });
          if (auditResult.ran) {
            changeAuditRan += 1;
            changeAuditSection = changeAuditEmailSection(auditResult.audit, { locale: "ja", recordUrl: openUrl });
          } else if (auditResult.reason === "quota" || auditResult.reason === "plan") {
            changeAuditSkipped += 1;
          }
        } catch (err) {
          console.warn("[cron] change audit unavailable", {
            watchId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
    setSpanAttrs(span, { "viewtrace.change_audit.attached": Boolean(changeAuditSection) });

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
          pageSignalsEmail ? pageSignalsEmail.text : "",
          ...(changeAuditSection ? changeAuditSection.text : []),
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
          pageSignalsEmail ? pageSignalsEmail.html : "",
          changeAuditSection ? changeAuditSection.html : "",
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
          pageSignalsEmail ? pageSignalsEmail.text : "",
          ...(changeAuditSection ? changeAuditSection.text : []),
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
          pageSignalsEmail ? pageSignalsEmail.html : "",
          changeAuditSection ? changeAuditSection.html : "",
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
          pageSignalsEmail ? pageSignalsEmail.text : "",
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
          pageSignalsEmail ? pageSignalsEmail.html : "",
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

    if (behaviorAlerts.length > 0 || behaviorMapAlerts.length > 0) {
      if (!userEmail) {
        console.warn("[cron] behavior email skipped: user_email_missing", { watchId, userId });
      } else if (!isResendConfigured()) {
        console.warn("[cron] behavior email skipped: resend_not_configured", { watchId, userId });
      } else {
        const behaviorCopy = behaviorAlertEmailCopy({ region, alerts: behaviorAlerts, mapDiffs: behaviorMapAlerts });
        const text = [
          ...behaviorCopy.lines,
          ...(changeAuditSection ? changeAuditSection.text : []),
          "",
          compareOpenUrl ? `Open compare / 比較を開く: ${compareOpenUrl}` : "",
          `Open record / 記録を開く: ${openUrl}`,
          "",
          emailAccountHintText(userEmail),
        ]
          .filter((line) => line !== "")
          .join("\n");
        const html = [
          "<p><strong>Observed interaction behavior changed</strong></p>",
          ...behaviorCopy.lines.filter((line) => line !== "").map((line) => `<p>${escapeHtml(line)}</p>`),
          changeAuditSection ? changeAuditSection.html : "",
          compareOpenUrl ? observationCompareLinkHtml(compareOpenUrl) : "",
          observationRecordLinkHtml(openUrl),
          emailAccountHintHtml(userEmail),
        ].join("");
        const res = await sendResendEmail({
          to: userEmail,
          subject: behaviorCopy.subject,
          text,
          html,
        });
        if (res.ok) {
          notified += 1;
          interactionAlerted += 1;
          await markWatchNotified(watchId);
        } else {
          console.warn("[cron] behavior email failed", { watchId, userId, error: res.error });
        }
      }
    }
  }

  for (const w of watches ?? []) {
    ran += 1;
    await withSpan("watch.run", { [ATTR.source]: "watch" }, (span) => processWatch(w, span));
  }

  let monitoringRan = 0;
  let monitoringSkipped = 0;
  try {
    const monitoringResult = await runDueMonitoringWatches(svc, async (userId) => {
      const { data } = await svc.from("users").select("plan").eq("id", userId).maybeSingle();
      const planId = parsePlanId(typeof (data as { plan?: unknown } | null)?.plan === "string" ? String((data as { plan: string }).plan) : null);
      return getPlan(planId).monthlyObservations;
    });
    monitoringRan = monitoringResult.ran;
    monitoringSkipped = monitoringResult.skipped;
  } catch (err) {
    console.warn("[cron] monitoring watch unavailable", { error: err instanceof Error ? err.message : String(err) });
  }

  let journeyRan = 0;
  let journeySkipped = 0;
  try {
    const journeyResult = await runDueJourneyWatches(svc, async (userId) => {
      const { data } = await svc.from("users").select("plan").eq("id", userId).maybeSingle();
      const planId = parsePlanId(typeof (data as { plan?: unknown } | null)?.plan === "string" ? String((data as { plan: string }).plan) : null);
      return getPlan(planId).monthlyObservations;
    });
    journeyRan = journeyResult.ran;
    journeySkipped = journeyResult.skipped;
  } catch (err) {
    console.warn("[cron] journey watch unavailable", { error: err instanceof Error ? err.message : String(err) });
  }

  return okJson({
    ran,
    notified,
    failureNotified,
    quotaSkipped,
    quotaSkipNotified,
    interactionRan,
    interactionSkipped,
    interactionAlerted,
    changeAuditRan,
    changeAuditSkipped,
    journeyRan,
    journeySkipped,
    monitoringRan,
    monitoringSkipped,
  });
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
