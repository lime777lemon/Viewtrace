"use server";

import { isValidEmail } from "@/lib/auth/form-helpers";
import type { Locale } from "@/lib/i18n";
import {
  contactTopicLabel,
  getContactPageCopy,
  type ContactTopic,
} from "@/lib/i18n/contact-page-copy";
import { sendResendEmail, isResendConfigured } from "@/lib/resend";
import { contactEmail } from "@/lib/site";

export type ContactFormState = { error?: string; message?: string } | null;

function parseTopic(raw: string): ContactTopic {
  if (raw === "billing" || raw === "technical") return raw;
  return "general";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function contactFormAction(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const localeRaw = String(formData.get("_locale") ?? "en");
  const locale: Locale = localeRaw === "ja" ? "ja" : "en";
  const t = getContactPageCopy(locale);

  // Honeypot for simple bots
  if (String(formData.get("company_website") ?? "").trim()) {
    return { message: t.success };
  }

  const name = String(formData.get("name") ?? "").trim().slice(0, 200);
  const email = String(formData.get("email") ?? "").trim().slice(0, 320);
  const topic = parseTopic(String(formData.get("topic") ?? "general"));
  const message = String(formData.get("message") ?? "").trim().slice(0, 5000);

  if (!name) return { error: t.errName };
  if (!email || !isValidEmail(email)) return { error: t.errEmail };
  if (message.length < 10) return { error: t.errMessage };

  if (!isResendConfigured()) {
    return { error: t.errNotConfigured };
  }

  const topicLabel = contactTopicLabel(locale, topic);
  const subject = `[Viewtrace] ${topicLabel} — ${name}`;
  const text = [
    "Viewtrace contact form",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Topic: ${topicLabel}`,
    `Locale: ${locale}`,
    "",
    message,
  ].join("\n");

  const html = [
    "<p><strong>Viewtrace contact form</strong></p>",
    `<p><strong>Name</strong><br/>${escapeHtml(name)}</p>`,
    `<p><strong>Email</strong><br/>${escapeHtml(email)}</p>`,
    `<p><strong>Topic</strong><br/>${escapeHtml(topicLabel)}</p>`,
    `<p><strong>Message</strong></p>`,
    `<p style="white-space:pre-wrap;word-break:break-word;">${escapeHtml(message)}</p>`,
  ].join("");

  try {
    const res = await sendResendEmail({
      to: contactEmail,
      replyTo: email,
      subject,
      text,
      html,
      tags: [{ name: "source", value: "contact_form" }],
    });

    if (!res.ok) {
      console.warn("[contact] send failed", res.error);
      return { error: t.errSend };
    }

    return { message: t.success };
  } catch (err) {
    // Defensive: a thrown error here surfaces to the user as a 500
    // (FUNCTION_INVOCATION_FAILED). Always return a friendly state instead.
    console.error("[contact] unexpected error", err);
    return { error: t.errSend };
  }
}
