/**
 * 既存登録ユーザー向け「アンケート先行」メールのテンプレート（プロ体裁・HTML/テキスト）。
 * 送信スクリプト（send-survey-email.mjs）とプレビュー生成の両方から使う。
 *
 * デザイン方針:
 *  - 幅 560px の白カード、Viewtrace のアクセント色 #1a6b5c
 *  - すべてインラインCSS（メールクライアント互換）
 *  - 返信で答えてもらう前提（本文に4問）。CAN-SPAM 配慮でフッターにオプトアウト
 */

const ACCENT = "#1a6b5c";
const INK = "#1f2937";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";
const LOGO_URL = "https://viewtrace.net/brand/viewtrace-logo.png";

export function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const COPY = {
  en: {
    subject: "A quick favor — 4 short questions (we read every reply)",
    greetingFallback: "there",
    intro: () =>
      `Thanks for creating a Viewtrace account. We're the small team behind Viewtrace and we read every reply ourselves — your honest answers help us build the right thing more than almost anything.`,
    ask: "Could you reply to these — even one line each is perfect?",
    questions: [
      "What made you sign up? (What were you hoping to do with Viewtrace?)",
      "Did you get to try it? If not, what stopped you?",
      "What's the one thing that would make Viewtrace worth paying for?",
      "Do you run ads for clients, your own business, or neither?",
    ],
    incentive:
      "That's it. As a thank-you, we're happy to extend your trial or set up a free 15-minute call — whatever's useful to you.",
    signoff: "Really appreciate it,",
    replyCta: "Just hit reply — it comes straight to us.",
    footer: (email) =>
      `You're receiving this because you created a Viewtrace account (${escapeHtml(
        email,
      )}). If you'd rather not hear from us, just reply "stop" and we won't email you again.`,
  },
  ja: {
    subject: "4つだけ質問させてください（返信はすべて私たちが読みます）",
    greetingFallback: "こんにちは",
    intro: () =>
      `ご登録ありがとうございます。Viewtrace を運営している小さなチームです。返信はすべて私たちが直接読んでいます。率直なご回答が、本当に役立つものを作るうえで何よりの助けになります。`,
    ask: "以下に、各1行でも構いませんので返信いただけませんか？",
    questions: [
      "登録のきっかけは？（Viewtrace で何をしたいと思われましたか）",
      "実際に試せましたか？ もし試していないなら、何が障壁でしたか？",
      "「これがあれば課金する」という決め手は何ですか？",
      "広告運用は、クライアント向け／自社向け／どちらでもない、のどれですか？",
    ],
    incentive:
      "以上です。お礼に、トライアルの延長や15分の無料セットアップ相談など、ご希望に合わせて対応します。",
    signoff: "ご協力に感謝します。",
    replyCta: "このメールにそのまま返信いただければ、私たちに直接届きます。",
    footer: (email) =>
      `このメールは Viewtrace にご登録いただいたため（${escapeHtml(
        email,
      )}）お送りしています。今後不要な場合は「不要」とだけ返信ください。以後お送りしません。`,
  },
};

/**
 * @param {{ email: string, name?: string|null, lang?: "en"|"ja", fromName?: string }} input
 * @returns {{ subject: string, html: string, text: string }}
 */
export function renderSurveyEmail({ email, name, lang = "en", fromName = "the Viewtrace team" }) {
  const c = COPY[lang] ?? COPY.en;
  const displayName = (name && String(name).trim()) || c.greetingFallback;
  const greeting = lang === "ja" ? `${escapeHtml(displayName)} 様` : `Hi ${escapeHtml(displayName)},`;

  const questionsHtml = c.questions
    .map(
      (q, i) => `
        <tr>
          <td style="vertical-align:top;padding:0 10px 12px 0;">
            <span style="display:inline-block;min-width:24px;height:24px;line-height:24px;text-align:center;background:${ACCENT};color:#ffffff;border-radius:12px;font-size:13px;font-weight:700;">${i + 1}</span>
          </td>
          <td style="vertical-align:top;padding:0 0 12px 0;color:${INK};font-size:15px;line-height:1.55;">${escapeHtml(q)}</td>
        </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <title>${escapeHtml(c.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f5f4;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(c.ask)}</div>
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
                <p style="margin:0 0 16px 0;color:${INK};font-size:15px;line-height:1.6;">${c.intro(fromName)}</p>
                <p style="margin:0 0 16px 0;color:${INK};font-size:15px;line-height:1.6;">${escapeHtml(c.ask)}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 8px 0;">
                  ${questionsHtml}
                </table>
                <p style="margin:16px 0 0 0;color:${INK};font-size:15px;line-height:1.6;">${escapeHtml(c.incentive)}</p>
                <p style="margin:20px 0 4px 0;color:${INK};font-size:15px;line-height:1.6;">${escapeHtml(c.signoff)}</p>
                <p style="margin:0 0 4px 0;color:${INK};font-size:15px;line-height:1.6;font-weight:600;">${escapeHtml(fromName)}</p>
                <p style="margin:0 0 20px 0;">
                  <a href="https://viewtrace.net" style="color:${ACCENT};font-size:13px;text-decoration:none;">viewtrace.net</a>
                </p>
                <p style="margin:0 0 22px 0;padding:10px 14px;background:#eef6f3;border:1px solid #cfe6df;border-radius:10px;color:${ACCENT};font-size:13px;line-height:1.5;">${escapeHtml(c.replyCta)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 28px 32px;border-top:1px solid ${BORDER};">
                <p style="margin:0;color:${MUTED};font-size:12px;line-height:1.55;">${c.footer(email)}</p>
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
    lang === "ja" ? COPY.ja.intro(fromName).replace(/<[^>]+>/g, "") : COPY.en.intro(fromName).replace(/<[^>]+>/g, ""),
    "",
    c.ask,
    "",
    ...c.questions.map((q, i) => `${i + 1}. ${q}`),
    "",
    c.incentive,
    "",
    c.signoff,
    fromName,
    "viewtrace.net",
    "",
    c.replyCta,
    "",
    "—",
    c.footer(email),
  ].join("\n");

  return { subject: c.subject, html, text };
}
