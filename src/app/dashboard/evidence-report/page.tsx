import type { Metadata } from "next";
import { EvidenceReportOnboarding } from "@/components/dashboard/EvidenceReportOnboarding";
import { EvidenceReportSettingsForm } from "@/components/dashboard/EvidenceReportSettingsForm";
import { getSession } from "@/lib/auth/session";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { copy } from "@/lib/i18n";
import { evidenceReportRecipientEmails, maskEvidenceWebhookUrl } from "@/lib/scheduled-evidence-report";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 120;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: `${copy[locale].dashboardSettings.evidenceReportTitle} | Viewtrace`,
    robots: { index: false, follow: false },
  };
}

export default async function EvidenceReportPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string }>;
}) {
  const locale = await getRequestLocale();
  const t = copy[locale].dashboardSettings;
  const report = (await searchParams).report;
  const session = await getSession();
  let emailEnabled = true;
  let recipientEmails: string[] = [];
  let slackWebhookUrl = "";
  let teamsWebhookUrl = "";
  let otherWebhookUrl = "";
  if (session) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase
        .from("evidence_report_settings")
        .select("email_enabled, email_recipients, slack_webhook_url, teams_webhook_url, other_webhook_url")
        .eq("user_id", session.userId)
        .maybeSingle();
      if (data) {
        emailEnabled = data.email_enabled !== false;
        recipientEmails = evidenceReportRecipientEmails(data.email_recipients);
        slackWebhookUrl = typeof data.slack_webhook_url === "string" ? data.slack_webhook_url : "";
        teamsWebhookUrl = typeof data.teams_webhook_url === "string" ? data.teams_webhook_url : "";
        otherWebhookUrl = typeof data.other_webhook_url === "string" ? data.other_webhook_url : "";
      }
    } catch {
      emailEnabled = true;
    }
  }
  const reportNotices: Record<string, string> = {
    saved: t.evidenceReportSaved,
    sent: t.evidenceReportSaved,
    slack: t.evidenceReportSlackInvalid,
    teams: t.evidenceReportTeamsInvalid,
    pagerduty: t.evidenceReportPagerDutyInvalid,
    webhook: t.evidenceReportOtherInvalid,
    email: t.evidenceReportEmailInvalid,
    send: t.evidenceReportSendFailed,
    "sent-unsaved": t.evidenceReportSentUnsaved,
    error: t.evidenceReportError,
  };
  const reportNotice = report ? reportNotices[report] ?? null : null;
  const noticeTone =
    report === "sent" || report === "saved"
      ? "success"
      : report === "sent-unsaved"
        ? "warning"
        : reportNotice
          ? "error"
          : null;
  const noticeClass =
    noticeTone === "success"
      ? "border-emerald-300 bg-emerald-50 text-emerald-950"
      : noticeTone === "warning"
        ? "border-amber-300 bg-amber-50 text-amber-950"
        : "border-rose-300 bg-rose-50 text-rose-950";

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{t.evidenceReportTitle}</h1>
        {session ? <EvidenceReportOnboarding userId={session.userId} locale={locale} /> : null}
      </div>
      {reportNotice ? (
        <p
          role="status"
          className={`rounded-2xl border px-5 py-4 text-base font-semibold leading-relaxed ${noticeClass}`}
        >
          {reportNotice}
        </p>
      ) : null}
      <section className="rounded-2xl border border-border bg-surface-elevated p-6">
        <EvidenceReportSettingsForm
          locale={locale}
          emailEnabled={emailEnabled}
          accountEmail={session?.email ?? ""}
          recipientEmails={recipientEmails}
          slackMask={maskEvidenceWebhookUrl(slackWebhookUrl)}
          teamsMask={maskEvidenceWebhookUrl(teamsWebhookUrl)}
          otherMask={maskEvidenceWebhookUrl(otherWebhookUrl)}
        />
      </section>
    </div>
  );
}
