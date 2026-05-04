import { Resend } from "resend";

let client: Resend | null = null;

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

/** 未設定時は Resend の検証用送信元（本番では自ドメインを検証し RESEND_FROM を設定） */
export function getDefaultResendFrom(): string {
  const raw = process.env.RESEND_FROM?.trim();
  if (raw) return raw;
  return "Viewtrace <onboarding@resend.dev>";
}

export type SendResendEmailInput = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  tags?: { name: string; value: string }[];
};

export type SendResendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * Resend で 1 通送信（Route Handler / Server Action から利用）。
 * `html` と `text` のどちらか一方以上が必要です。
 */
export async function sendResendEmail(input: SendResendEmailInput): Promise<SendResendEmailResult> {
  const resend = getResendClient();
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY is not set" };
  }
  const html = input.html?.trim();
  const text = input.text?.trim();
  if (!html && !text) {
    return { ok: false, error: "Either html or text is required" };
  }

  const from = input.from?.trim() || getDefaultResendFrom();
  const subject = input.subject.trim();

  const base = {
    from,
    to: input.to,
    subject,
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    ...(input.cc ? { cc: input.cc } : {}),
    ...(input.bcc ? { bcc: input.bcc } : {}),
    ...(input.tags ? { tags: input.tags } : {}),
  } as const;

  const { data, error } = html
    ? await resend.emails.send({
        ...base,
        html,
        ...(text ? { text } : {}),
      })
    : await resend.emails.send({
        ...base,
        text: text!,
      });

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data?.id) {
    return { ok: false, error: "Resend did not return an email id" };
  }
  return { ok: true, id: data.id };
}
