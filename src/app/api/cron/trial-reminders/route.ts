import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendResendEmail, isResendConfigured } from "@/lib/resend";
import { getAppOriginForEmailLinks } from "@/lib/site";
import { TRIAL_CONFIG } from "@/lib/plans";

export const runtime = "nodejs";
export const maxDuration = 300;

const DAY_MS = 24 * 60 * 60 * 1000;
/** 終了◯日前以内に入ったら「終了間近」メールを一度だけ送る */
const ENDING_SOON_DAYS = 3;

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

function getBearer(req: Request): string | null {
  const h = req.headers.get("authorization")?.trim() ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

/** Vercel Cron は GET + `x-vercel-cron: 1`。手動は Bearer CRON_SECRET。 */
function authorizeCronRequest(req: Request, secret: string): boolean {
  if (getBearer(req) === secret) return true;
  if (req.headers.get("x-vercel-cron") === "1" && process.env.VERCEL === "1") return true;
  return false;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type ReminderKind = "ending_soon" | "ended";

function buildEmail(
  kind: ReminderKind,
  daysLeft: number,
  origin: string,
): { subject: string; text: string; html: string } {
  const upgradeUrl = `${origin}/checkout?plan=starter`;
  const settingsUrl = `${origin}/dashboard/settings`;
  const limit = TRIAL_CONFIG.freeObservations;

  if (kind === "ending_soon") {
    const subject = `Viewtrace: 無料トライアルはあと${daysLeft}日で終了します / Your trial ends in ${daysLeft} day(s)`;
    const text = [
      `無料トライアルはあと${daysLeft}日で終了します。`,
      "終了後は新しい観測（地域指定の記録）を作成できなくなります。過去の記録の閲覧は引き続き可能です。",
      "続けて使うには、Starter プランへのアップグレードがおすすめです。",
      "",
      `アップグレード: ${upgradeUrl}`,
      `プラン設定: ${settingsUrl}`,
      "",
      "— Viewtrace",
      "",
      `Your free trial ends in ${daysLeft} day(s).`,
      "After it ends you can no longer create new observations (geo-routed records); viewing past records still works.",
      `Upgrade: ${upgradeUrl}`,
    ].join("\n");
    const html = [
      `<p>無料トライアルは<strong>あと${daysLeft}日</strong>で終了します。</p>`,
      "<p>終了後は新しい観測（地域指定の記録）を作成できなくなります。過去の記録の閲覧は引き続き可能です。</p>",
      "<p>続けて使うには、Starter プランへのアップグレードがおすすめです。</p>",
      `<p><a href="${escapeHtml(upgradeUrl)}" style="display:inline-block;background:#276248;color:#fff;padding:10px 18px;border-radius:9999px;text-decoration:none;font-weight:600;">アップグレードする / Upgrade</a></p>`,
      `<p style="font-size:13px;color:#555;"><a href="${escapeHtml(settingsUrl)}" style="color:#2563eb;">プラン設定を開く / Plan settings</a></p>`,
      `<hr style="border:none;border-top:1px solid #eee;margin:16px 0;"/>`,
      `<p style="font-size:13px;color:#555;">Your free trial ends in <strong>${daysLeft} day(s)</strong>. After it ends you can no longer create new observations; viewing past records still works.</p>`,
    ].join("");
    return { subject, text, html };
  }

  const subject = "Viewtrace: 無料トライアルが終了しました（続けるにはアップグレード） / Your trial has ended";
  const text = [
    "無料トライアル期間が終了しました。",
    `トライアルでは最大${limit}回・${TRIAL_CONFIG.trialDays}日間の観測をお試しいただけました。`,
    "続けて地域指定の記録・クライアント共有用の検証URL/PDFを使うには、Starter プランへアップグレードしてください。",
    "過去に作成した記録はログイン後も引き続き閲覧できます。",
    "",
    `アップグレード: ${upgradeUrl}`,
    `プラン設定: ${settingsUrl}`,
    "",
    "ご不明点は info@viewtrace.net までご連絡ください。",
    "— Viewtrace",
    "",
    "Your free trial has ended. To keep creating geo-routed records and client-ready verify URLs / PDFs, upgrade to Starter.",
    `Upgrade: ${upgradeUrl}`,
  ].join("\n");
  const html = [
    "<p>無料トライアル期間が終了しました。</p>",
    `<p>トライアルでは最大${limit}回・${TRIAL_CONFIG.trialDays}日間の観測をお試しいただけました。</p>`,
    "<p>続けて地域指定の記録・クライアント共有用の検証URL/PDFを使うには、Starter プランへアップグレードしてください。過去に作成した記録はログイン後も引き続き閲覧できます。</p>",
    `<p><a href="${escapeHtml(upgradeUrl)}" style="display:inline-block;background:#276248;color:#fff;padding:10px 18px;border-radius:9999px;text-decoration:none;font-weight:600;">アップグレードする / Upgrade</a></p>`,
    `<p style="font-size:13px;color:#555;"><a href="${escapeHtml(settingsUrl)}" style="color:#2563eb;">プラン設定を開く / Plan settings</a></p>`,
    `<hr style="border:none;border-top:1px solid #eee;margin:16px 0;"/>`,
    "<p style=\"font-size:13px;color:#555;\">Your free trial has ended. To keep creating geo-routed records and client-ready verify URLs / PDFs, upgrade to Starter. Past records remain viewable after signing in.</p>",
    "<p style=\"font-size:12px;color:#888;\">ご不明点は info@viewtrace.net まで / Questions? Reply or email info@viewtrace.net.</p>",
  ].join("");
  return { subject, text, html };
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
  if (!isResendConfigured()) {
    return NextResponse.json({ ok: false, error: "resend_not_configured" }, { status: 503 });
  }

  const svc = admin;
  const origin = getAppOriginForEmailLinks();
  const now = Date.now();
  const trialMs = TRIAL_CONFIG.trialDays * DAY_MS;

  let scanned = 0;
  let endingSent = 0;
  let endedSent = 0;

  const perPage = 200;
  for (let page = 1; page <= 25; page += 1) {
    const { data, error } = await svc.auth.admin.listUsers({ page, perPage });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
    }
    const users = data?.users ?? [];
    if (users.length === 0) break;

    for (const u of users) {
      scanned += 1;
      const email = u.email?.trim();
      if (!email) continue;
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;

      const trialStartedAtRaw =
        typeof meta.trial_started_at === "string" && meta.trial_started_at.trim()
          ? meta.trial_started_at.trim()
          : null;
      if (!trialStartedAtRaw) continue;

      const trialActiveFalse = meta.trial_active === false || meta.trial_active === "false";
      const hasSub =
        typeof meta.stripe_subscription_id === "string" && meta.stripe_subscription_id.trim().length > 0;
      // アプリの trialEligible と同じ条件（未課金・トライアル継続中のみ対象）
      if (trialActiveFalse || hasSub) continue;

      const started = Date.parse(trialStartedAtRaw);
      if (Number.isNaN(started)) continue;
      const endsMs = started + trialMs;
      const msLeft = endsMs - now;

      const endingSentAt = typeof meta.trial_reminder_ending_sent_at === "string";
      const endedSentAt = typeof meta.trial_reminder_ended_sent_at === "string";

      if (msLeft <= 0) {
        // 期限切れ → 「終了後」メール（未送信のときだけ）
        if (endedSentAt) continue;
        const { subject, text, html } = buildEmail("ended", 0, origin);
        const res = await sendResendEmail({
          to: email,
          subject,
          text,
          html,
          tags: [{ name: "type", value: "trial_ended" }],
        });
        if (res.ok) {
          endedSent += 1;
          await svc.auth.admin.updateUserById(u.id, {
            user_metadata: { ...meta, trial_reminder_ended_sent_at: new Date().toISOString() },
          });
        } else {
          console.warn("[trial-reminders] ended email failed", { userId: u.id, error: res.error });
        }
        continue;
      }

      const daysLeft = Math.max(1, Math.ceil(msLeft / DAY_MS));
      if (daysLeft <= ENDING_SOON_DAYS && !endingSentAt) {
        const { subject, text, html } = buildEmail("ending_soon", daysLeft, origin);
        const res = await sendResendEmail({
          to: email,
          subject,
          text,
          html,
          tags: [{ name: "type", value: "trial_ending" }],
        });
        if (res.ok) {
          endingSent += 1;
          await svc.auth.admin.updateUserById(u.id, {
            user_metadata: { ...meta, trial_reminder_ending_sent_at: new Date().toISOString() },
          });
        } else {
          console.warn("[trial-reminders] ending email failed", { userId: u.id, error: res.error });
        }
      }
    }

    if (users.length < perPage) break;
  }

  return NextResponse.json({ ok: true, scanned, endingSent, endedSent });
}
