"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  buildEvidenceReportShareUrl,
  generateEvidenceReportShareToken,
  insertEvidenceReportShare,
} from "@/lib/evidence-report-share";
import { isResendConfigured, sendResendEmail } from "@/lib/resend";
import { prepareOtherWebhookUrl } from "@/lib/scheduled-evidence-report-deliver";
import {
  normalizeSlackIncomingWebhookUrl,
  normalizeTeamsWebhookUrl,
  parseEvidenceReportRecipientEmails,
  previousJstWeek,
} from "@/lib/scheduled-evidence-report";
import { composeWeeklyEvidenceReportForUser } from "@/lib/scheduled-evidence-report-run";
import { getAppOriginForEmailLinks } from "@/lib/site";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function reject(code: string): never {
  redirect(`/dashboard/evidence-report?report=${code}`);
}

function mergeSecret(
  raw: string,
  clear: boolean,
  existing: string | null,
  normalize: (value: string) => string | null,
): { ok: true; value: string | null } | { ok: false } {
  const trimmed = raw.trim();
  if (trimmed) {
    const value = normalize(trimmed);
    if (!value) return { ok: false };
    return { ok: true, value };
  }
  if (clear) return { ok: true, value: null };
  return { ok: true, value: existing };
}

export async function saveEvidenceReportSettingsAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: readError } = await supabase
    .from("evidence_report_settings")
    .select("slack_webhook_url, teams_webhook_url, other_webhook_url")
    .eq("user_id", session.userId)
    .maybeSingle();
  if (readError) reject("error");

  const slack = mergeSecret(
    String(formData.get("slack_webhook_url") ?? ""),
    formData.get("slack_webhook_url_clear") === "on",
    typeof existing?.slack_webhook_url === "string" ? existing.slack_webhook_url : null,
    normalizeSlackIncomingWebhookUrl,
  );
  const teams = mergeSecret(
    String(formData.get("teams_webhook_url") ?? ""),
    formData.get("teams_webhook_url_clear") === "on",
    typeof existing?.teams_webhook_url === "string" ? existing.teams_webhook_url : null,
    normalizeTeamsWebhookUrl,
  );
  const emailEnabled = formData.get("email_enabled") === "on";
  const recipients = parseEvidenceReportRecipientEmails(
    formData.getAll("email_recipient").map((value) => String(value)).join("\n"),
    session.email,
  );
  if (!recipients) reject("email");
  const account = session.email.trim().toLowerCase();
  const sendTo = [...new Set([...(emailEnabled && account ? [account] : []), ...recipients])];
  if (sendTo.length === 0) reject("email");
  if (!slack.ok) reject("slack");
  if (!teams.ok) reject("teams");

  const otherRaw = String(formData.get("other_webhook_url") ?? "");
  const otherClear = formData.get("other_webhook_url_clear") === "on";
  const existingOther = typeof existing?.other_webhook_url === "string" ? existing.other_webhook_url : null;
  let other: string | null;
  if (otherRaw.trim()) {
    const prepared = await prepareOtherWebhookUrl(otherRaw);
    if (!prepared) reject("webhook");
    other = prepared;
  } else if (otherClear) {
    other = null;
  } else {
    other = existingOther;
  }

  if (!isResendConfigured()) reject("send");
  const admin = createSupabaseAdminClient();
  if (!admin) reject("send");
  const period = previousJstWeek(new Date());
  const shareToken = generateEvidenceReportShareToken();
  const publicUrl = buildEvidenceReportShareUrl(getAppOriginForEmailLinks(), shareToken);
  let report: Awaited<ReturnType<typeof composeWeeklyEvidenceReportForUser>>;
  try {
    report = await composeWeeklyEvidenceReportForUser(
      admin,
      session.userId,
      period,
      getAppOriginForEmailLinks(),
      publicUrl,
    );
  } catch (error) {
    console.warn("[evidence-report] manual compose failed", {
      userId: session.userId,
      error: error instanceof Error ? error.message : "compose_failed",
    });
    reject("send");
  }
  const published = await insertEvidenceReportShare(admin, {
    token: shareToken,
    userId: session.userId,
    periodStart: period.startDate,
    subject: report.subject,
    body: report.text,
  });
  if (!published) reject("send");
  const sent = await sendResendEmail({
    to: sendTo,
    subject: report.subject,
    text: report.text,
    html: report.html,
    tags: [{ name: "type", value: "evidence_report" }],
  });
  if (!sent.ok) {
    console.warn("[evidence-report] manual send not accepted", {
      userId: session.userId,
      httpStatus: sent.status,
    });
    reject("send");
  }

  const { error } = await supabase.from("evidence_report_settings").upsert({
    user_id: session.userId,
    email_enabled: emailEnabled,
    email_recipients: recipients,
    slack_webhook_url: slack.value,
    teams_webhook_url: teams.value,
    other_webhook_url: other,
    updated_at: new Date().toISOString(),
  });
  if (error) reject("sent-unsaved");
  redirect("/dashboard/evidence-report?report=sent");
}
