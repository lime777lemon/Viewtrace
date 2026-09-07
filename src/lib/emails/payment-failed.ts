import { supportEmail } from "@/lib/site";

/**
 * 支払い失敗（dunning）／追加認証要求のメール本文（プロ体裁・英語ベース）。
 * Stripe Webhook（invoice.payment_failed / invoice.payment_action_required）から利用。
 */

const ACCENT = "#1a6b5c";
const INK = "#1f2937";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";
const LOGO_URL = "https://viewtrace.net/brand/viewtrace-logo.png";

export type PaymentEmailKind = "failed" | "action_required";

export function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** ゼロ十進通貨（JPY 等）は最小単位＝そのままの額面 */
const ZERO_DECIMAL = new Set(["jpy", "krw", "vnd", "clp", "bif", "djf", "gnf", "kmf", "mga", "pyg", "rwf", "ugx", "vuv", "xaf", "xof", "xpf"]);

export function formatAmount(amountInMinor: number | null | undefined, currency: string | null | undefined): string | null {
  if (amountInMinor == null || !currency) return null;
  const cur = currency.toLowerCase();
  const value = ZERO_DECIMAL.has(cur) ? amountInMinor : amountInMinor / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(value);
  } catch {
    return `${value.toFixed(ZERO_DECIMAL.has(cur) ? 0 : 2)} ${currency.toUpperCase()}`;
  }
}

export type BuildPaymentEmailInput = {
  kind: PaymentEmailKind;
  /** 顧客名（Stripe customer_name 等）。無ければ "there" */
  name?: string | null;
  /** 支払い方法を更新する URL（Stripe Billing Portal など） */
  updateUrl: string;
  /** 直接支払い/認証できる URL（Stripe hosted invoice）。無ければ updateUrl を使う */
  invoiceUrl?: string | null;
  /** 請求額（最小単位）と通貨 */
  amountDue?: number | null;
  currency?: string | null;
};

export function buildPaymentFailedEmail(input: BuildPaymentEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const { kind, updateUrl } = input;
  const name = (input.name && String(input.name).trim()) || "there";
  const invoiceUrl = (input.invoiceUrl && String(input.invoiceUrl).trim()) || updateUrl;
  const amount = formatAmount(input.amountDue, input.currency);
  const amountLine = amount ? ` (${amount})` : "";

  const isAction = kind === "action_required";

  const subject = isAction
    ? "Action needed: confirm your Viewtrace payment"
    : "Your Viewtrace payment didn't go through — please update your card";

  const greeting = `Hi ${escapeHtml(name)},`;

  const lead = isAction
    ? `Your latest Viewtrace payment${amountLine} needs an extra confirmation step from your bank (such as 3-D Secure) before it can complete.`
    : `We tried to process your latest Viewtrace payment${amountLine}, but it didn't go through. This usually happens when a card has expired or was declined.`;

  const actionText = isAction ? "Confirm payment" : "Update payment method";
  const actionUrl = isAction ? invoiceUrl : updateUrl;

  const reassurance = isAction
    ? "Once you confirm, your subscription continues without interruption."
    : "We'll retry automatically, but updating your card now is the fastest way to avoid any interruption to your account.";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f5f4;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f4;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background:#ffffff;border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 8px 32px;">
                <img src="${LOGO_URL}" alt="Viewtrace" width="150" style="display:block;height:auto;width:150px;max-width:60%;" />
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 0 32px;">
                <p style="margin:0 0 14px 0;color:${INK};font-size:16px;line-height:1.5;font-weight:600;">${greeting}</p>
                <p style="margin:0 0 16px 0;color:${INK};font-size:15px;line-height:1.6;">${lead}</p>
                <p style="margin:0 0 22px 0;">
                  <a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:${ACCENT};color:#ffffff;padding:12px 22px;border-radius:9999px;text-decoration:none;font-weight:700;font-size:15px;">${actionText}</a>
                </p>
                <p style="margin:0 0 16px 0;color:${INK};font-size:15px;line-height:1.6;">${reassurance}</p>
                <p style="margin:0 0 20px 0;color:${MUTED};font-size:13px;line-height:1.55;word-break:break-all;overflow-wrap:anywhere;">
                  If the button doesn't work, copy this link:<br/>
                  <a href="${escapeHtml(actionUrl)}" style="color:${ACCENT};">${escapeHtml(actionUrl)}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 28px 32px;border-top:1px solid ${BORDER};">
                <p style="margin:0;color:${MUTED};font-size:12px;line-height:1.55;">Questions? Just reply to this email or contact ${escapeHtml(supportEmail)}. — Viewtrace</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    greeting,
    "",
    lead,
    "",
    `${actionText}: ${actionUrl}`,
    "",
    reassurance,
    "",
    `Questions? Reply to this email or contact ${supportEmail}.`,
    "— Viewtrace",
  ].join("\n");

  return { subject, html, text };
}
