import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const EVIDENCE_REPORT_SHARE_TOKEN_LENGTH = 48;

export function generateEvidenceReportShareToken(): string {
  return randomBytes(EVIDENCE_REPORT_SHARE_TOKEN_LENGTH / 2).toString("hex");
}

export function sanitizeEvidenceReportShareToken(raw: string): string | null {
  const token = raw.trim().toLowerCase();
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  return token;
}

export function buildEvidenceReportShareUrl(appOrigin: string, token: string): string {
  const origin = appOrigin.replace(/\/+$/, "");
  return `${origin}/evidence-report/${token}`;
}

export async function insertEvidenceReportShare(
  admin: SupabaseClient,
  input: { token: string; userId: string; periodStart: string; subject: string; body: string },
): Promise<boolean> {
  const token = sanitizeEvidenceReportShareToken(input.token);
  const subject = input.subject.trim().slice(0, 300);
  const body = input.body.trim();
  if (!token || !subject || !body || body.length > 200000) return false;
  const { error } = await admin.from("evidence_report_shares").insert({
    token,
    user_id: input.userId,
    period_start: input.periodStart,
    subject,
    body,
  });
  return !error;
}

export async function readEvidenceReportShare(
  admin: SupabaseClient,
  token: string,
): Promise<{ subject: string; body: string } | null> {
  const safe = sanitizeEvidenceReportShareToken(token);
  if (!safe) return null;
  const { data, error } = await admin
    .from("evidence_report_shares")
    .select("subject, body")
    .eq("token", safe)
    .maybeSingle();
  if (error || !data) return null;
  const subject = typeof data.subject === "string" ? data.subject : "";
  const body = typeof data.body === "string" ? data.body : "";
  if (!subject || !body) return null;
  return { subject, body };
}
