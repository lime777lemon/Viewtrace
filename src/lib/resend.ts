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
  idempotencyKey?: string;
};

export type SendResendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const RESEND_SEND_TIMEOUT_MS = 15_000;

/**
 * Resend REST の送信結果。SDK は使わない。
 * Next.js の fetch 計装と SDK がレスポンス body を二重に読むと、API が 201 を返したあと
 * FUNCTION_INVOCATION_FAILED になる。
 */
export function resultFromResendSendHttp(status: number, rawBody: string): SendResendEmailResult {
  let parsed: { id?: unknown; message?: unknown } = {};
  if (rawBody) {
    try {
      parsed = JSON.parse(rawBody) as { id?: unknown; message?: unknown };
    } catch {
      parsed = {};
    }
  }
  if (status >= 200 && status < 300) {
    const id = typeof parsed.id === "string" && parsed.id ? parsed.id : "unknown";
    return { ok: true, id };
  }
  const message = typeof parsed.message === "string" && parsed.message ? parsed.message : `Resend HTTP ${status}`;
  return { ok: false, error: message };
}

/**
 * Resend で 1 通送信（Route Handler / Server Action から利用）。
 * `html` と `text` のどちらか一方以上が必要です。
 */
export async function sendResendEmail(input: SendResendEmailInput): Promise<SendResendEmailResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    return { ok: false, error: "RESEND_API_KEY is not set" };
  }
  const html = input.html?.trim();
  const text = input.text?.trim();
  if (!html && !text) {
    return { ok: false, error: "Either html or text is required" };
  }

  const from = input.from?.trim() || getDefaultResendFrom();
  const subject = input.subject.trim();
  const payload: Record<string, unknown> = {
    from,
    to: input.to,
    subject,
  };
  if (html) payload.html = html;
  if (text) payload.text = text;
  if (input.replyTo) payload.reply_to = input.replyTo;
  if (input.cc) payload.cc = input.cc;
  if (input.bcc) payload.bcc = input.bcc;
  if (input.tags?.length) payload.tags = input.tags;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  const idempotencyKey = input.idempotencyKey?.trim();
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey.slice(0, 256);
  }

  let status = 0;
  try {
    const res = await fetch(RESEND_EMAILS_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(RESEND_SEND_TIMEOUT_MS),
    });
    status = res.status;
    const raw = await res.text();
    return resultFromResendSendHttp(status, raw);
  } catch (err) {
    // Body already consumed / locked after a 2xx: the API accepted the send.
    if (status >= 200 && status < 300) {
      console.warn("[resend] accepted but response body unreadable", err);
      return { ok: true, id: "unknown" };
    }
    const message = err instanceof Error ? err.message : "Unknown Resend error";
    console.error("[resend] send threw", err);
    return { ok: false, error: message };
  }
}
